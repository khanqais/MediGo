import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const createOrderSchema = z.object({
  order_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 payment order creations per minute per IP (fail-closed)
  const ip = getClientIp(request);
  const rl = await rateLimit(`payment_create_${ip}`, 5, 60000, { failClosed: true });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { order_id } = validation.data;
    const adminClient = createAdminClient();

    // FIX: Use user-scoped client with user_id constraint to prevent IDOR.
    // This enforces ownership at the database level instead of relying on a
    // post-hoc application-layer check after an admin-bypassed query.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_method !== "ONLINE") {
      return NextResponse.json({ error: "Order is not set to online payment" }, { status: 400 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Order is cancelled" }, { status: 400 });
    }

    if (order.status === "PENDING_PRESCRIPTION_APPROVAL") {
      return NextResponse.json({ 
        error: "Order is pending pharmacist prescription verification. Payment will be enabled once your prescription is approved." 
      }, { status: 400 });
    }

    if (order.payment_status !== "PENDING" && order.payment_status !== "FAILED") {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const amountInPaise = Math.round(Number(order.total_amount) * 100);

    // Check for existing pending payment
    const { data: existingPayment, error: existingPaymentError } = await adminClient
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .eq("status", "PENDING")
      .eq("amount", order.total_amount) // Assuming amount column stores standard rupees/decimals
      .not("razorpay_order_id", "is", null)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({
        razorpay_order_id: existingPayment.razorpay_order_id,
        amount: amountInPaise,
        currency: "INR",
        key_id: process.env.RAZORPAY_KEY_ID,
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.id,
    });

    const { error: insertError } = await adminClient
      .from("payments")
      .insert({
        order_id: order.id,
        razorpay_order_id: rzpOrder.id,
        amount: order.total_amount,
        status: "PENDING",
      });

    if (insertError) {
      console.error("Failed to insert payment record:", insertError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Create payment order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
