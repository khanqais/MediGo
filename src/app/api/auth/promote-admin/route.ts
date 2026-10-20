import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin-access";

export const dynamic = "force-dynamic";

/**
 * Promotes the signed-in user's profile role to 'admin' when their email is
 * in the ADMIN_EMAILS allow-list.  Uses a SECURITY DEFINER RPC so this works
 * even when the service-role key is invalid.
 *
 * Called once from the admin layout on first load so that RLS policies (which
 * read `profiles.role`) start passing for the allow-listed user without any
 * manual DB edits.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check current role first to avoid unnecessary writes.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin" || profile?.role === "pharmacist") {
      return NextResponse.json({ promoted: false, role: profile.role });
    }

    // The RPC is SECURITY DEFINER — it bypasses RLS so no service key needed.
    const { error: rpcError } = await supabase.rpc("promote_self_to_admin", {
      target_user_id: user.id,
    });

    if (rpcError) {
      console.error("promote_self_to_admin RPC error:", rpcError);
      return NextResponse.json(
        { error: "Promotion failed. Run the migration in the Supabase SQL editor first." },
        { status: 500 }
      );
    }

    return NextResponse.json({ promoted: true, role: "admin" });
  } catch (err: any) {
    console.error("POST /api/auth/promote-admin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
