import { NextResponse } from "next/server";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();
    
    const { data: logs, count, error } = await adminClient
      .from("admin_audit_log")
      .select("*, admin:admin_id(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (err: any) {
    console.error("GET /api/admin/audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
