import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin-access";

export const dynamic = "force-dynamic";

/**
 * Tells the client shell whether to show the staff portal link.
 * Access itself is still enforced by middleware, the admin layout,
 * and every /api/admin route.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ allowed: false, role: null });
    }

    if (isAdminEmail(user.email)) {
      return NextResponse.json({ allowed: true, role: "admin" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "customer";

    return NextResponse.json({
      allowed: role === "admin" || role === "pharmacist",
      role,
    });
  } catch {
    return NextResponse.json({ allowed: false, role: null });
  }
}
