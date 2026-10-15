import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch order for the current user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        coupon_id,
        coupons:coupon_id (
          id,
          code,
          type,
          value
        ),
        stock_restored,
        created_at,
        updated_at
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch order items with full medicine details
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        order_id,
        medicine_id,
        quantity,
        price,
        total,
        medicine:medicine_id (
          id,
          name,
          brand,
          slug,
          composition,
          pack_size,
          dosage,
          image_url,
          prescription_required,
          drug_schedule,
          price,
          mrp
        )
      `)
      .eq("order_id", params.id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // 3. Fetch status history
    const { data: statusHistory, error: historyError } = await supabase
      .from("order_status_history")
      .select("id, order_id, status, notes, created_at")
      .eq("order_id", params.id)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching status history:", historyError);
    }

    // 4. Fetch attached prescription if any and generate signed URL
    let prescription = null;
    if (order.prescription_id) {
      const { data: rx } = await adminClient
        .from("prescriptions")
        .select("id, status, file_path, reviewed_at, rejection_reason, created_at")
        .eq("id", order.prescription_id)
        .single();

      if (rx) {
        let signedUrl = null;
        if (rx.file_path) {
          const { data: urlData } = await adminClient.storage
            .from("prescriptions")
            .createSignedUrl(rx.file_path, 3600);
          signedUrl = urlData?.signedUrl || null;
        }

        prescription = {
          ...rx,
          url: signedUrl,
        };
      }
    }

    // 5. Fetch coupon discount details if coupon used
    let coupon = null;
    if (order.coupon_id) {
      const { data: redemption } = await supabase
        .from("coupon_redemptions")
        .select("discount_amount, coupons (code, type, value)")
        .eq("order_id", params.id)
        .maybeSingle();

      const couponObj = (order as any).coupons || (redemption as any)?.coupons;
      if (couponObj) {
        coupon = {
          code: couponObj.code,
          discount: redemption?.discount_amount ?? order.discount,
          type: couponObj.type,
          value: couponObj.value,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        coupon,
        order_items: items || [],
        status_history: statusHistory || [],
        prescription,
      },
    });
  } catch (error) {
    console.error("GET customer order details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
