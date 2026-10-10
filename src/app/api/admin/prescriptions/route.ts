import { NextResponse } from "next/server";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();
    let query = adminClient
      .from("prescriptions")
      .select(`
        id,
        user_id,
        order_id,
        file_path,
        status,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        created_at,
        profiles:user_id (id, full_name, email, phone)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }

    const { data: prescriptions, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching prescriptions:", error);
      return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
    }

    // Fetch linked orders for these prescriptions
    const orderIds = (prescriptions || [])
      .map((p) => p.order_id)
      .filter((id): id is string => Boolean(id));

    let ordersMap: Record<string, any> = {};
    if (orderIds.length > 0) {
      const { data: orders } = await adminClient
        .from("orders")
        .select("id, total_amount, status, payment_method, payment_status, created_at")
        .in("id", orderIds);

      if (orders) {
        ordersMap = Object.fromEntries(orders.map((o) => [o.id, o]));
      }
    }

    // Generate signed URLs for file viewing
    const enriched = await Promise.all(
      (prescriptions || []).map(async (rx: any) => {
        let signedUrl: string | null = null;
        if (rx.file_path) {
          const { data } = await adminClient.storage
            .from("prescriptions")
            .createSignedUrl(rx.file_path, 3600); // 1 hr validity
          signedUrl = data?.signedUrl || null;
        }

        return {
          ...rx,
          url: signedUrl,
          user: rx.profiles,
          order: rx.order_id ? ordersMap[rx.order_id] || null : null,
        };
      })
    );

    const total = count || 0;

    return NextResponse.json({ 
      success: true, 
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/prescriptions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
