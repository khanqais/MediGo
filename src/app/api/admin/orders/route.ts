import { NextResponse } from "next/server";
import { verifyRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const adminClient = createClient();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    let query = adminClient
      .from("orders")
      .select(`
        id,
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        stock_restored,
        created_at,
        updated_at,
        profiles!inner (id, full_name, email, phone)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`id.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%,profiles.phone.ilike.%${search}%`);
    }

    const { data: orders, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching admin orders:", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: orders, 
      pagination: { 
        page, 
        limit, 
        total: count || 0, 
        totalPages: count ? Math.ceil(count / limit) : 0 
      } 
    });
  } catch (err: any) {
    console.error("GET /api/admin/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
