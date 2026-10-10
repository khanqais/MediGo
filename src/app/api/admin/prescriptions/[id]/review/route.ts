import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const prescriptionId = params.id;
    if (!prescriptionId) {
      return NextResponse.json({ error: "Prescription ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = reviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid review payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { action, reason } = parseResult.data;

    if (action === "REJECT" && (!reason || reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "A mandatory rejection reason is required when rejecting a prescription." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current prescription
    const { data: prescription, error: fetchError } = await adminClient
      .from("prescriptions")
      .select("id, status, order_id, user_id")
      .eq("id", prescriptionId)
      .single();

    if (fetchError || !prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    if (prescription.status !== "PENDING") {
      return NextResponse.json(
        { error: `Prescription has already been ${prescription.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 2. Find any linked orders (by prescription.order_id or orders.prescription_id)
    let linkedOrderId = prescription.order_id;
    if (!linkedOrderId) {
      const { data: linkedOrder } = await adminClient
        .from("orders")
        .select("id")
        .eq("prescription_id", prescriptionId)
        .single();
      if (linkedOrder) {
        linkedOrderId = linkedOrder.id;
      }
    }

    if (action === "APPROVE") {
      // Update prescription
      const { error: updateRxError } = await adminClient
        .from("prescriptions")
        .update({
          status: "APPROVED",
          reviewed_by: auth!.id,
          reviewed_at: now,
          rejection_reason: null,
        })
        .eq("id", prescriptionId);

      if (updateRxError) {
        console.error("Failed to approve prescription:", updateRxError);
        return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
      }

      // If linked order is in PENDING_PRESCRIPTION_APPROVAL, advance it to CONFIRMED
      if (linkedOrderId) {
        const { data: order } = await adminClient
          .from("orders")
          .select("id, status")
          .eq("id", linkedOrderId)
          .single();

        if (order && order.status === "PENDING_PRESCRIPTION_APPROVAL") {
          const { data: result, error: rpcError } = await adminClient.rpc('process_order_status_update', {
            p_order_id: linkedOrderId,
            p_old_status: "PENDING_PRESCRIPTION_APPROVAL",
            p_new_status: "CONFIRMED",
            p_new_payment_status: null,
            p_changed_by: auth!.id,
            p_notes: "Prescription verified and approved by pharmacist",
            p_is_admin_action: true
          });

          if (rpcError || !result?.success) {
            console.error("Conflict updating order after prescription approval");
          }
        }
      }

      await adminClient.from("admin_audit_log").insert({
        admin_id: auth!.id,
        action: "REVIEW_PRESCRIPTION",
        entity_type: "prescriptions",
        entity_id: prescriptionId,
        details: { action: "APPROVE" },
      });

      return NextResponse.json({
        success: true,
        message: "Prescription approved successfully. Linked orders have been confirmed.",
      });
    } else {
      // action === 'REJECT'
      const trimmedReason = reason!.trim();

      const { error: updateRxError } = await adminClient
        .from("prescriptions")
        .update({
          status: "REJECTED",
          reviewed_by: auth!.id,
          reviewed_at: now,
          rejection_reason: trimmedReason,
        })
        .eq("id", prescriptionId);

      if (updateRxError) {
        console.error("Failed to reject prescription:", updateRxError);
        return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
      }

      // If linked order is in PENDING_PRESCRIPTION_APPROVAL, cancel order and restore stock
      if (linkedOrderId) {
        const { data: order } = await adminClient
          .from("orders")
          .select("id, status, payment_status")
          .eq("id", linkedOrderId)
          .single();

        if (order && order.status === "PENDING_PRESCRIPTION_APPROVAL") {
          const { data: result, error: rpcError } = await adminClient.rpc('process_order_status_update', {
            p_order_id: linkedOrderId,
            p_old_status: "PENDING_PRESCRIPTION_APPROVAL",
            p_new_status: "CANCELLED",
            p_new_payment_status: order.payment_status,
            p_changed_by: auth!.id,
            p_notes: `Prescription rejected: ${trimmedReason}. Stock restored.`,
            p_is_admin_action: true
          });

          if (rpcError || !result?.success) {
             console.error("Conflict updating order after prescription reject");
          }
        }
      }

      await adminClient.from("admin_audit_log").insert({
        admin_id: auth!.id,
        action: "REVIEW_PRESCRIPTION",
        entity_type: "prescriptions",
        entity_id: prescriptionId,
        details: { action: "REJECT", reason: trimmedReason },
      });

      return NextResponse.json({
        success: true,
        message: "Prescription rejected and linked order cancelled with stock restored.",
      });
    }
  } catch (err: any) {
    console.error("Error reviewing prescription:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
