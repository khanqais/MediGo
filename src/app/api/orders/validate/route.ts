import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "@/config/site";

const validateSchema = z.object({
  items: z.array(
    z.object({
      medicine_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Cart cannot be empty"),
  address_id: z.string().uuid(),
  prescription_id: z.string().uuid().optional().nullable(),
  coupon_code: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { items, address_id, prescription_id } = validation.data;

    // Verify address belongs to user
    const { data: address, error: addressError } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", address_id)
      .eq("user_id", user.id)
      .single();

    if (addressError || !address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Fetch medicines and inventory
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
          error: `Schedule X drug (${medicine.name}) cannot be sold online under Indian law.` 
        }, { status: 400 });
      }

      if (medicine.prescription_required || medicine.drug_schedule === "H" || medicine.drug_schedule === "H1") {
        hasPrescriptionItems = true;
      }

      const rawInv = medicine.inventory as any;
      const inv = Array.isArray(rawInv) ? rawInv[0] : rawInv;
      const availableStock = Math.max(0, (inv?.stock_quantity || 0) - (inv?.reserved_quantity || 0));

      if (item.quantity > availableStock) {
        return NextResponse.json({ 
          error: `Not enough stock for ${medicine.name}. Available: ${availableStock}, Requested: ${item.quantity}` 
        }, { status: 400 });
      }

      subtotal += Number(medicine.price) * item.quantity;
      mrpTotal += Number(medicine.mrp) * item.quantity;

      validatedItems.push({
        medicine_id: medicine.id,
        name: medicine.name,
        quantity: item.quantity,
        price: Number(medicine.price),
        mrp: Number(medicine.mrp),
        prescription_required: medicine.prescription_required || medicine.drug_schedule === "H" || medicine.drug_schedule === "H1",
        drug_schedule: medicine.drug_schedule || (medicine.prescription_required ? "H" : "OTC"),
      });
    }

    // Validate prescription if provided
    let prescriptionDetails = null;
    if (prescription_id) {
      const { data: rx, error: rxError } = await supabase
        .from("prescriptions")
        .select("id, status, file_path, rejection_reason")
        .eq("id", prescription_id)
        .eq("user_id", user.id)
        .single();

      if (rxError || !rx) {
        return NextResponse.json({ error: "Invalid prescription selected" }, { status: 400 });
      }
      prescriptionDetails = rx;
    }

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
          }
        }
      }
    }

    const mrpDiscount = mrpTotal - subtotal;
    const totalDiscount = mrpDiscount + couponDiscount;
    const finalSubtotal = Math.max(0, subtotal - couponDiscount);
    const delivery_fee = finalSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const total_amount = finalSubtotal + delivery_fee;

    return NextResponse.json({
      summary: {
        subtotal,
        discount: totalDiscount,
        coupon_discount: couponDiscount,
        mrp_discount: mrpDiscount,
        delivery_fee,
        total_amount,
        tax: 0,
        coupon_id: validCouponId,
      },
      validatedItems,
      address_snapshot: address,
      has_prescription_items: hasPrescriptionItems,
      prescription_details: prescriptionDetails,
    });
  } catch (error) {
    console.error("Order validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
