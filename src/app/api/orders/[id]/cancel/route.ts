import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";
import { renderStatusUpdate, renderRefundInitiated, sendEmailSafely } from "@/lib/email";

/**
 * Customer order cancellation with idempotent refund safety.
 *
 * Flow for ONLINE+PAID orders:
 *   1. Check order is cancellable and owned by user.
 *   2. Check if a refund record already exists in `payments` (prevents double-refund).
 *      - If already REFUNDED: proceed straight to atomic cancel (idempotent recovery).
 *      - If PENDING_REFUND: check Razorpay for existing refund.
 *        If found, recover it. If not found, return 409 Conflict (request in flight).
 *   3. If no refund record exists, insert a PENDING_REFUND record in `payments` BEFORE calling Razorpay (lock).
 *   4. Check Razorpay for existing refunds on this payment.
 *   5. If none exists, create the refund via Razorpay API.
 *   6. Update the refund record with the Razorpay refund ID and status = 'REFUNDED'.
 *   7. Cancel the order via the atomic PG function (process_order_status_update).
 *
 * Fault Tolerance:
 *   - Double click: second request sees PENDING_REFUND and returns 409 without calling Razorpay.
 *   - Razorpay failure: PENDING_REFUND lock is deleted, order remains un-cancelled, clear error returned.
 *   - DB failure after Razorpay success: next retry sees REFUNDED or finds existing Razorpay refund,
 *     completing cancellation without a duplicate refund.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;

    // 1. Fetch order and verify ownership
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(
        "id, user_id, status, payment_status, payment_method, stock_restored, total_amount"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order || order.user_id !== user.id) {
      return NextResponse.json(
        { error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    // 2. Verify cancellation policy: only before PACKED
    const cancellableStatuses = [
      "PENDING",
      "PENDING_PRESCRIPTION_APPROVAL",
      "CONFIRMED",
      "PROCESSING",
    ];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: `Order cannot be cancelled because it is already ${order.status}.`,
        },
        { status: 400 }
      );
    }

    let updatedPaymentStatus = order.payment_status;
    let refundMessage = "";
    let refundId: string | null = null;

    // 3. Handle refund for ONLINE+PAID orders
    if (order.payment_method === "ONLINE" && order.payment_status === "PAID") {
      // 3a. Find the successful payment
      const { data: payment } = await adminClient
        .from("payments")
        .select("id, razorpay_payment_id, amount, status")
        .eq("order_id", orderId)
        .eq("status", "SUCCESS")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!payment || !payment.razorpay_payment_id) {
        return NextResponse.json(
          { error: "No successful payment found for refund" },
          { status: 400 }
        );
      }

      // 3b. Check for existing refund record in dedicated refunds table (idempotency gate)
      const { data: existingRefund } = await adminClient
        .from("refunds")
        .select("id, status, razorpay_refund_id, created_at")
        .eq("order_id", orderId)
        .in("status", ["REFUNDED", "PENDING"])
        .limit(1)
        .single();

      let shouldCreateNewLock = !existingRefund;

      if (existingRefund) {
        if (existingRefund.status === "REFUNDED") {
          refundId = existingRefund.razorpay_refund_id;
          updatedPaymentStatus = "REFUNDED";
          refundMessage = " Refund already processed.";
        } else {
          const recoveredRefundId = await findExistingRazorpayRefund(payment.razorpay_payment_id);
          if (recoveredRefundId) {
            const { error: updateRefErr } = await adminClient
              .from("refunds")
              .update({
                status: "REFUNDED",
                razorpay_refund_id: recoveredRefundId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingRefund.id);

            if (updateRefErr) {
              console.error("Failed to update recovered refund record:", updateRefErr);
              return NextResponse.json(
                { error: "Failed to update refund record" },
                { status: 500 }
              );
            }

            const { error: updatePayErr } = await adminClient
              .from("payments")
              .update({
                status: "REFUNDED",
                updated_at: new Date().toISOString(),
              })
              .eq("id", payment.id);

            if (updatePayErr) {
              console.error("Failed to update payment status on recovery:", updatePayErr);
              return NextResponse.json(
                { error: "Failed to update payment status" },
                { status: 500 }
              );
            }

            refundId = recoveredRefundId;
            updatedPaymentStatus = "REFUNDED";
            refundMessage = " Refund recovered and completed.";
          } else {
            const createdTime = new Date(existingRefund.created_at).getTime();
            if (Date.now() - createdTime > 5 * 60 * 1000) {
              const { error: delErr } = await adminClient.from("refunds").delete().eq("id", existingRefund.id);
              if (delErr) {
                console.error("Failed to delete stale refund lock:", delErr);
              }
              shouldCreateNewLock = true;
            } else {
              return NextResponse.json(
                { error: "Refund is in progress. Please retry shortly." },
                { status: 409 }
              );
            }
          }
        }
      }

      if (shouldCreateNewLock) {
        // 3c. No existing refund — create a PENDING lock record in refunds table BEFORE calling Razorpay
        const { data: refundRecord, error: insertErr } = await adminClient
          .from("refunds")
          .insert({
            order_id: orderId,
            payment_id: payment.id,
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_refund_id: null,
            amount: payment.amount,
            status: "PENDING",
          })
          .select("id")
          .single();

        if (insertErr || !refundRecord) {
          // Check for unique index violation (Postgres error code 23505)
          if (
            insertErr?.code === "23505" ||
            insertErr?.message?.includes("duplicate key") ||
            insertErr?.message?.includes("unique")
          ) {
            return NextResponse.json(
              { error: "Refund is in progress. Please retry shortly." },
              { status: 409 }
            );
          }

          console.error("Failed to create refund lock record:", insertErr);
          return NextResponse.json(
            { error: "Failed to initiate refund lock. Please retry." },
            { status: 500 }
          );
        }

        // 3d. Check Razorpay first (prevent double refund if external refund happened)
        try {
          const existingOnGateway = await findExistingRazorpayRefund(
            payment.razorpay_payment_id
          );

          if (existingOnGateway) {
            refundId = existingOnGateway;
          } else {
            // 3e. Create the refund on Razorpay
            refundId = await createRazorpayRefund(
              payment.razorpay_payment_id,
              payment.amount,
              orderId
            );
          }
        } catch (refundError: any) {
          // Razorpay API failed — clean up the lock record, leave order un-cancelled
          console.error("Razorpay refund error:", refundError);
          await adminClient
            .from("refunds")
            .delete()
            .eq("id", refundRecord.id);

          return NextResponse.json(
            {
              error:
                "Refund failed. Order not cancelled. " +
                (refundError.message || ""),
            },
            { status: 500 }
          );
        }

        if (!refundId) {
          await adminClient
            .from("refunds")
            .delete()
            .eq("id", refundRecord.id);

          return NextResponse.json(
            { error: "Refund failed. Order not cancelled." },
            { status: 500 }
          );
        }

        // 3f. Mark refund record as REFUNDED and CHECK error
        const { error: updateRefundErr } = await adminClient
          .from("refunds")
          .update({
            status: "REFUNDED",
            razorpay_refund_id: refundId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", refundRecord.id);

        if (updateRefundErr) {
          console.error("Failed to update refund record:", updateRefundErr);
          return NextResponse.json(
            { error: "Refund processed with gateway but failed to update record. Please contact support." },
            { status: 500 }
          );
        }

        // 3g. Update original payment row to REFUNDED only after refund succeeds, and CHECK error
        const { error: updatePaymentErr } = await adminClient
          .from("payments")
          .update({
            status: "REFUNDED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updatePaymentErr) {
          console.error("Failed to update payment record:", updatePaymentErr);
          return NextResponse.json(
            { error: "Refund processed with gateway but failed to update payment. Please contact support." },
            { status: 500 }
          );
        }

        updatedPaymentStatus = "REFUNDED";
        refundMessage = ` Full refund of ₹${order.total_amount} has been initiated.`;
      }
    }

    // 4. Cancel order atomically via Postgres function
    const { data: result, error: rpcError } = await adminClient.rpc(
      "process_order_status_update",
      {
        p_order_id: orderId,
        p_old_status: order.status,
        p_new_status: "CANCELLED",
        p_new_payment_status: updatedPaymentStatus,
        p_changed_by: user.id,
        p_notes:
          "Order cancelled by customer before packaging. Stock restored." +
          refundMessage,
        p_refund_id: refundId,
        p_is_admin_action: false,
      }
    );

    if (rpcError || !result?.success) {
      return NextResponse.json(
        { error: "Conflict: Order status was modified by another request." },
        { status: 409 }
      );
    }

    // Non-fatal transactional email dispatch
    if (user.email) {
      if (refundId || updatedPaymentStatus === "REFUNDED") {
        const refundEmail = renderRefundInitiated({
          id: orderId,
          amount: order.total_amount,
          refundId: refundId || undefined,
        });
        sendEmailSafely({
          orderId,
          recipient: user.email,
          template: "refund_initiated",
          subject: refundEmail.subject,
          html: refundEmail.html,
          text: refundEmail.text,
        }).catch((err) => {
          console.error("Non-fatal refund email error:", err);
        });
      }

      const cancelEmail = renderStatusUpdate("CANCELLED", {
        id: orderId,
        notes: "Cancelled by customer before packaging",
        total_amount: order.total_amount,
      });
      sendEmailSafely({
        orderId,
        recipient: user.email,
        template: "status_update_CANCELLED",
        subject: cancelEmail.subject,
        html: cancelEmail.html,
        text: cancelEmail.text,
      }).catch((err) => {
        console.error("Non-fatal cancel status email error:", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order #${orderId.slice(0, 8)} has been cancelled.${refundMessage}`,
    });
  } catch (error) {
    console.error("Customer cancel order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check Razorpay for any existing refunds on a payment.
 * Returns existing refund ID or null.
 */
async function findExistingRazorpayRefund(
  razorpayPaymentId: string
): Promise<string | null> {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const existingRefunds = await razorpay.payments.fetchMultipleRefund(
      razorpayPaymentId,
      { count: 10 }
    );

    if (existingRefunds?.items?.length > 0) {
      return existingRefunds.items[0].id;
    }
  } catch (err) {
    console.warn("Could not query existing Razorpay refunds:", err);
  }

  return null;
}

/**
 * Create a new refund on Razorpay.
 */
async function createRazorpayRefund(
  razorpayPaymentId: string,
  amount: number,
  orderId: string
): Promise<string> {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const refund = await razorpay.payments.refund(razorpayPaymentId, {
    amount: Math.round(Number(amount) * 100),
    notes: {
      order_id: orderId,
      reason: "Cancelled by customer before packaging",
    },
  });

  if (!refund || !refund.id) {
    throw new Error("Gateway returned empty refund object");
  }

  return refund.id;
}


