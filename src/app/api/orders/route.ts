import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "@/config/site";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      medicine_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Cart cannot be empty"),
  address_id: z.string().uuid(),
  payment_method: z.enum(["ONLINE", "COD"]),
  prescription_id: z.string().uuid().optional().nullable(),
  coupon_code: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const adminClient = createAdminClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { items, address_id, payment_method, prescription_id } = validation.data;

    // 1. Re-validate Address
    const { data: address, error: addressError } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", address_id)
      .eq("user_id", user.id)
      .single();

    if (addressError || !address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // 2. Re-validate Items, Schedule & Stock
    const medicineIds = items.map(item => item.medicine_id);
    const { data: medicinesData, error: medicinesError } = await supabase
      .from("medicines")
      .select(`
        id, name, price, mrp, is_active, prescription_required, drug_schedule,
        inventory (stock_quantity, reserved_quantity)
      `)
      .in("id", medicineIds);

    if (medicinesError || !medicinesData) {
      return NextResponse.json({ error: "Failed to fetch medicines data" }, { status: 500 });
    }

    let subtotal = 0;
    let mrpTotal = 0;
    const validatedItems = [];
    let hasPrescriptionItems = false;

    for (const item of items) {
      const medicine = medicinesData.find(m => m.id === item.medicine_id);
      
      if (!medicine) {
        return NextResponse.json({ error: `Medicine not found for ID: ${item.medicine_id}` }, { status: 400 });
      }

      if (!medicine.is_active) {
        return NextResponse.json({ error: `Medicine ${medicine.name} is no longer available` }, { status: 400 });
      }

      // Schedule X Drugs cannot be sold online under Indian Drugs and Cosmetics Rules
      if (medicine.drug_schedule === "X") {
        return NextResponse.json({ 
          error: `Schedule X drug (${medicine.name}) cannot be ordered online under Indian law.` 
        }, { status: 400 });
      }

      if (medicine.prescription_required || medicine.drug_schedule === "H" || medicine.drug_schedule === "H1") {
        hasPrescriptionItems = true;
      }

      const inv = medicine.inventory?.[0] || { stock_quantity: 0, reserved_quantity: 0 };
      const availableStock = Math.max(0, inv.stock_quantity - inv.reserved_quantity);

      if (item.quantity > availableStock) {
        return NextResponse.json({ 
          error: `Not enough stock for ${medicine.name}. Available: ${availableStock}, Requested: ${item.quantity}` 
        }, { status: 400 });
      }

      subtotal += Number(medicine.price) * item.quantity;
      mrpTotal += Number(medicine.mrp) * item.quantity;

      validatedItems.push({
        medicine_id: medicine.id,
        quantity: item.quantity,
        price: Number(medicine.price),
      });
    }

    // 3. Enforce Prescription Requirements for Schedule H/H1 medicines
    let finalPrescriptionId: string | null = null;
    let prescriptionStatus: string | null = null;

    if (hasPrescriptionItems) {
      if (!prescription_id) {
        return NextResponse.json({ 
          error: "A valid doctor prescription is legally required for Schedule H/H1 medicines in your cart." 
        }, { status: 400 });
      }

      const { data: prescription, error: rxError } = await supabase
        .from("prescriptions")
        .select("id, status, user_id")
        .eq("id", prescription_id)
        .eq("user_id", user.id)
        .single();

      if (rxError || !prescription) {
        return NextResponse.json({ 
          error: "Invalid prescription: document not found or does not belong to your account." 
        }, { status: 400 });
      }

      if (prescription.status === "REJECTED") {
        return NextResponse.json({ 
          error: "The selected prescription has been rejected by a pharmacist. Please upload a valid prescription." 
        }, { status: 400 });
      }

      finalPrescriptionId = prescription.id;
      prescriptionStatus = prescription.status;
    }

    // Determine initial order status
    let orderStatus: string;
    if (hasPrescriptionItems && prescriptionStatus !== "APPROVED") {
      // Order cannot be paid or dispatched until approved by a licensed pharmacist
      orderStatus = "PENDING_PRESCRIPTION_APPROVAL";
    } else {
      orderStatus = payment_method === "COD" ? "CONFIRMED" : "PENDING";
    }

    // 4. Validate Coupon if provided
    let couponDiscount = 0;
    let validCouponId = null;

    if (validation.data.coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", validation.data.coupon_code.toUpperCase())
        .single();

      if (coupon && coupon.is_active) {
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : new Date(0);
        const validTo = coupon.valid_to ? new Date(coupon.valid_to) : new Date(9999, 11, 31);
        
        if (now >= validFrom && now <= validTo && subtotal >= coupon.min_order_amount) {
          // Check limits
          const { count: globalCount } = await supabase.from("coupon_redemptions").select("*", { count: 'exact', head: true }).eq("coupon_id", coupon.id);
          const { count: userCount } = await supabase.from("coupon_redemptions").select("*", { count: 'exact', head: true }).eq("coupon_id", coupon.id).eq("user_id", user.id);
          
          if ((!coupon.usage_limit || (globalCount || 0) < coupon.usage_limit) && 
              (!coupon.per_user_limit || (userCount || 0) < coupon.per_user_limit)) {
            
            validCouponId = coupon.id;
            if (coupon.type === "FLAT") {
              couponDiscount = coupon.value;
            } else {
              couponDiscount = (subtotal * coupon.value) / 100;
              if (coupon.max_discount_amount) {
                couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
              }
            }
            couponDiscount = Math.min(couponDiscount, subtotal);
          } else {
            return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: "Coupon is not valid for this order amount or has expired" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Invalid or inactive coupon" }, { status: 400 });
      }
    }

    const mrpDiscount = mrpTotal - subtotal;
    const totalDiscount = mrpDiscount + couponDiscount;
    const finalSubtotal = Math.max(0, subtotal - couponDiscount);
    const delivery_fee = finalSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const total_amount = finalSubtotal + delivery_fee;

    // 5. Atomic Database Transaction via PostgreSQL Function
    const { data: order, error: orderError } = await adminClient.rpc(
      "create_order_transaction",
      {
        p_user_id: user.id,
        p_address_snapshot: address,
        p_subtotal: subtotal,
        p_discount: totalDiscount,
        p_delivery_fee: delivery_fee,
        p_tax: 0,
        p_total_amount: total_amount,
        p_status: orderStatus,
        p_payment_status: "PENDING",
        p_payment_method: payment_method,
        p_prescription_id: finalPrescriptionId,
        p_coupon_id: validCouponId,
        p_coupon_discount: couponDiscount,
        p_items: validatedItems,
      }
    );

    if (orderError || !order) {
      console.error("Order transaction error:", orderError);
      return NextResponse.json({ 
        error: "Failed to place order", 
        details: orderError?.message || "Database transaction failed" 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        prescriptions (id, file_path, status, rejection_reason),
        order_items (
          *,
          medicines (name, image_url, slug, prescription_required, drug_schedule)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
