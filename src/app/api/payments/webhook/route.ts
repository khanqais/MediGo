import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  // Guard: webhook secret must be configured or every request would pass signature check
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("[payments/webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook service not configured" }, { status: 500 });
  }

  try {
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    if (!signature || !eventId) {
      return NextResponse.json({ error: "Missing headers" }, { status: 400 });
    }

    const bodyText = await request.text();

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyText)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    const eventType = payload.event;
    const adminClient = createAdminClient();

    // Idempotency check
    const { error: insertError } = await adminClient
      .from("webhook_events")
      .insert({ event_id: eventId, event_type: eventType });

    if (insertError) {
      if (insertError.code === "23505") {
        // Unique violation, already processed
        return NextResponse.json({ success: true, message: "Already processed" });
      }
      console.error("Webhook event insert error:", insertError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (eventType === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpay_order_id = paymentEntity.order_id;
      const razorpay_payment_id = paymentEntity.id;

      // Cross check
      const { data: dbPayment, error: paymentError } = await adminClient
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();

      if (paymentError || !dbPayment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const amountInPaise = Math.round(Number(dbPayment.amount) * 100);
      if (Number(paymentEntity.amount) !== amountInPaise) {
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      await adminClient.rpc("mark_payment_success", {
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_signature: null,
      });
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpay_order_id = paymentEntity.order_id;

      // Cross check
      const { data: dbPayment, error: paymentError } = await adminClient
        .from("payments")
        .select("*, orders(payment_status)")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();

      if (paymentError || !dbPayment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      // @ts-ignore
      if (dbPayment.orders?.payment_status !== "PAID") {
        // FIX: Use a single RPC call so both the payments and orders tables are
        // updated atomically. Previously two separate awaits meant a crash between
        // them left the database in an inconsistent state (payment FAILED but
        // order still PENDING).
        await adminClient.rpc("mark_payment_failed", {
          p_razorpay_order_id: razorpay_order_id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
