import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get("medicine_id");
    
    if (!medicineId) {
      return NextResponse.json({ error: "medicine_id is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: batches, error } = await adminClient
      .from("inventory_batches")
      .select("*")
      .eq("medicine_id", medicineId)
      .order("expiry_date", { ascending: true });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: batches });
  } catch (err: any) {
    console.error("GET /api/admin/inventory/batches error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const batchSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().min(1),
  mfgDate: z.string(),
  expiryDate: z.string(),
  quantity: z.coerce.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const d = parsed.data;
    const adminClient = createAdminClient();
    
    const { data: batch, error } = await adminClient.from("inventory_batches").insert({
      medicine_id: d.medicineId,
      batch_number: d.batchNumber,
      mfg_date: d.mfgDate,
      expiry_date: d.expiryDate,
      quantity: d.quantity,
    }).select().single();
    
    if (error) throw error;
    
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "ADD_BATCH",
      entity_type: "inventory_batch",
      entity_id: batch.id,
      details: { medicine_id: d.medicineId, batch_number: d.batchNumber, quantity: d.quantity }
    });

    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    console.error("POST /api/admin/inventory/batches error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
