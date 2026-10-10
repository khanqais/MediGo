import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const validateSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  orderAmount: z.number().positive(),
});

import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`coupon_validate_${ip}`, 10, 60000, { failClosed: true }); // 10 attempts per minute (fail-closed)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, message: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    const { code, orderAmount } = parsed.data;

    // Fetch the coupon
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !coupon) {
      return NextResponse.json({ success: false, message: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.is_active) {
      return NextResponse.json({ success: false, message: "This coupon is no longer active" }, { status: 400 });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ success: false, message: "This coupon is not valid yet" }, { status: 400 });
    }
    
    if (coupon.valid_to && new Date(coupon.valid_to) < now) {
      return NextResponse.json({ success: false, message: "This coupon has expired" }, { status: 400 });
    }

    if (orderAmount < coupon.min_order_amount) {
      return NextResponse.json({ 
        success: false, 
        message: `Minimum order amount of ₹${coupon.min_order_amount} required` 
      }, { status: 400 });
    }

    // Check usage limits
    if (coupon.usage_limit) {
      const { count } = await supabase
        .from("coupon_redemptions")
        .select("*", { count: 'exact', head: true })
        .eq("coupon_id", coupon.id);
        
      if (count !== null && count >= coupon.usage_limit) {
        return NextResponse.json({ success: false, message: "Coupon usage limit reached" }, { status: 400 });
      }
    }

    // Check per-user limit
    if (coupon.per_user_limit) {
      const { count } = await supabase
        .from("coupon_redemptions")
        .select("*", { count: 'exact', head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id);
        
      if (count !== null && count >= coupon.per_user_limit) {
        return NextResponse.json({ success: false, message: "You have reached the maximum usage limit for this coupon" }, { status: 400 });
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === "FLAT") {
      discount = coupon.value;
    } else if (coupon.type === "PERCENTAGE") {
      discount = (orderAmount * coupon.value) / 100;
      if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
        discount = coupon.max_discount_amount;
      }
    }

    // Don't discount more than the order amount itself
    discount = Math.min(discount, orderAmount);

    return NextResponse.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        discount_amount: discount,
        message: "Coupon applied successfully!"
      }
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json({ success: false, message: "Failed to validate coupon" }, { status: 500 });
  }
}
