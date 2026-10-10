import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const roleChangeSchema = z.object({
  role: z.enum(["customer", "pharmacist", "delivery", "admin"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const targetUserId = params.id;
    const body = await request.json();

    const parseResult = roleChangeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid role specified. Must be 'customer', 'pharmacist', 'delivery', or 'admin'" },
        { status: 400 }
      );
    }

    const { role: newRole } = parseResult.data;

    // Prevent admin from demoting themselves
    if (auth!.id === targetUserId && newRole !== "admin") {
      return NextResponse.json(
        { error: "Cannot demote your own admin account. Please ask another administrator." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify user exists
    const { data: userProfile, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", targetUserId)
      .single();

    if (fetchError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Update role
    const { data: updatedProfile, error: updateError } = await adminClient
      .from("profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
    }

    // Log to admin_audit_log
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "UPDATE_USER_ROLE",
      entity_type: "profiles",
      entity_id: targetUserId,
      details: { old_role: userProfile.role, new_role: newRole },
    });

    return NextResponse.json({
      success: true,
      message: `User role successfully changed to ${newRole}`,
      data: updatedProfile,
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/users/[id]/role error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
