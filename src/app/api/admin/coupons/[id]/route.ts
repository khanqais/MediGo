import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const id = params.id;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    
    const adminClient = createAdminClient();
    
    const { data: coupon, error } = await adminClient
      .from("coupons")
      .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
      
    if (error || !coupon) throw error || new Error("Coupon not found");
    
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: parsed.data.isActive ? "ENABLE_COUPON" : "DISABLE_COUPON",
      entity_type: "coupon",
      entity_id: id,
    });

    return NextResponse.json({ success: true, data: coupon });
  } catch (err: any) {
    console.error("PATCH /api/admin/coupons/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
