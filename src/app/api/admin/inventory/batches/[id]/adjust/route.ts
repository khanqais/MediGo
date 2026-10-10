import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const adjustSchema = z.object({
  quantityDelta: z.coerce.number().int(), // e.g. -5 to write off 5
  reason: z.string().min(5, "A reason of at least 5 characters is required"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const id = params.id;
    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const adminClient = createAdminClient();
    
    // Fetch batch to ensure enough quantity if delta is negative
    const { data: batch, error: fetchError } = await adminClient
      .from("inventory_batches")
      .select("*")
      .eq("id", id)
      .single();
      
    if (fetchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    
    const newQty = batch.quantity + parsed.data.quantityDelta;
    if (newQty < 0) {
      return NextResponse.json({ error: "Cannot reduce quantity below 0" }, { status: 400 });
    }
    
    const { data: updatedBatch, error: updateError } = await adminClient
      .from("inventory_batches")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
      
    if (updateError || !updatedBatch) throw updateError;
    
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "ADJUST_BATCH_STOCK",
      entity_type: "inventory_batch",
      entity_id: id,
      details: { 
        medicine_id: batch.medicine_id,
        batch_number: batch.batch_number,
        old_quantity: batch.quantity,
        new_quantity: newQty,
        delta: parsed.data.quantityDelta,
        reason: parsed.data.reason 
      }
    });

    return NextResponse.json({ success: true, data: updatedBatch });
  } catch (err: any) {
    console.error("POST /api/admin/inventory/batches/[id]/adjust error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
