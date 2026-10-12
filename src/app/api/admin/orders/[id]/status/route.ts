import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { DbOrderStatus } from "@/types/order";
import { VALID_TRANSITIONS } from "@/lib/order-status";

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PENDING_PRESCRIPTION_APPROVAL",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const orderId = params.id;
    const body = await request.json();

    const parseResult = updateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid status update payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status: targetStatus, notes } = parseResult.data;
    const adminClient = createAdminClient();

    // 1. Fetch current order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status, payment_method, payment_status, stock_restored")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = order.status as DbOrderStatus;

    if (currentStatus === targetStatus) {
      return NextResponse.json(
        { error: `Order is already in ${targetStatus} status` },
        { status: 400 }
      );
    }

    // 2. Validate state machine transition
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: Cannot transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedNextStatuses.join(", ") || "None (Terminal state)"}`,
        },
        { status: 400 }
      );
    }

    let updatedPaymentStatus = order.payment_status;

    // If order was delivered and COD, mark payment status as PAID
    if (targetStatus === "DELIVERED" && order.payment_method === "COD" && order.payment_status === "PENDING") {
      updatedPaymentStatus = "PAID";
    }

    const historyNotes = notes?.trim() || `Status updated to ${targetStatus} by ${auth!.role}`;

    // 3. Update order with Postgres function
    const { data: result, error: rpcError } = await adminClient.rpc('process_order_status_update', {
      p_order_id: orderId,
      p_old_status: currentStatus,
      p_new_status: targetStatus,
      p_new_payment_status: updatedPaymentStatus,
      p_changed_by: auth!.id,
      p_notes: historyNotes,
      p_is_admin_action: true
    });

    if (rpcError || !result?.success) {
      return NextResponse.json({ error: "Conflict: Order status was modified by another request." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${targetStatus}`,
      data: {
        id: orderId,
        status: targetStatus,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/orders/[id]/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
