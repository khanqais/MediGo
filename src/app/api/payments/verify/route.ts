import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 10 verification attempts per minute per IP (fail-closed)
  const ip = getClientIp(request);
  const rl = await rateLimit(`payment_verify_${ip}`, 10, 60000, { failClosed: true });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } }
    );
  }

  // Guard: env vars must be present before any crypto operation
  if (!process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_KEY_ID) {
    console.error("[payments/verify] RAZORPAY_KEY_SECRET or RAZORPAY_KEY_ID is not configured");
    return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
  }

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;
    const adminClient = createAdminClient();

    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*, orders(user_id)")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // @ts-ignore - orders is joined
    if (payment.orders?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    try {
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const actualBuffer = Buffer.from(razorpay_signature, "utf8");

      if (
        expectedBuffer.length !== actualBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
      ) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Malformed payment signature" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (rzpPayment.status !== "captured" && rzpPayment.status !== "authorized") {
      return NextResponse.json({ error: "Payment not captured or authorized" }, { status: 400 });
    }

    if (rzpPayment.order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    const amountInPaise = Math.round(Number(payment.amount) * 100);
    if (Number(rzpPayment.amount) !== amountInPaise) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    const { data: success, error: rpcError } = await adminClient.rpc("mark_payment_success", {
      p_razorpay_order_id: razorpay_order_id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_signature: razorpay_signature,
    });

    if (rpcError || !success) {
      console.error("RPC error:", rpcError);
      return NextResponse.json({ error: "Failed to mark payment success" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
