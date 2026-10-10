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

    // 1. Fetch profiles with range and exact count
    const { data: profiles, count, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, phone, role, avatar_url, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // 2. Fetch order counts for these users
    const userIds = (profiles || []).map((p) => p.id);
    const orderStatsByUser: Record<string, { count: number; totalSpent: number }> = {};

    if (userIds.length > 0) {
      const { data: orders } = await adminClient
        .from("orders")
        .select("user_id, total_amount, status")
        .in("user_id", userIds);

      (orders || []).forEach((o) => {
        if (!o.user_id) return;
        if (!orderStatsByUser[o.user_id]) {
          orderStatsByUser[o.user_id] = { count: 0, totalSpent: 0 };
        }
        orderStatsByUser[o.user_id].count += 1;
        if (o.status !== "CANCELLED") {
          orderStatsByUser[o.user_id].totalSpent += Number(o.total_amount || 0);
        }
      });
    }

    const enriched = (profiles || []).map((p) => ({
      ...p,
      ordersCount: orderStatsByUser[p.id]?.count || 0,
      totalSpent: orderStatsByUser[p.id]?.totalSpent || 0,
    }));

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
