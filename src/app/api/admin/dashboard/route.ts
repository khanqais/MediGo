import { NextResponse } from "next/server";
import { verifyRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const adminClient = createClient();

    // Calculate start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    let allInventoryData: any[] = [];
    try {
      const { data: invData, error: invErr } = await adminClient
        .from("inventory")
        .select(`id, stock_quantity, reorder_level, medicines:medicine_id (id, name, brand, slug, drug_schedule, composition, price)`);

      if (invErr) {
        if (invErr.code === "42703" || String(invErr.message).includes("drug_schedule")) {
          // Fallback query if drug_schedule column is not yet present
          const { data: fallbackData } = await adminClient
            .from("inventory")
            .select(`id, stock_quantity, reorder_level, medicines:medicine_id (id, name, brand, slug, composition, price)`);
          allInventoryData = fallbackData || [];
        } else {
          console.error("Error fetching inventory:", invErr);
        }
      } else {
        allInventoryData = invData || [];
      }
    } catch (e) {
      console.error("Inventory query exception:", e);
    }

    const [
      { data: todayOrders, error: todayOrdersError },
      { count: pendingRxCount, error: rxError },
      { data: recentOrders, error: recentOrdersError },
    ] = await Promise.all([
      adminClient.from("orders").select("id, total_amount, status, payment_status, payment_method").gte("created_at", todayIso),
      adminClient.from("prescriptions").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      adminClient.from("orders").select(`id, total_amount, status, payment_status, payment_method, created_at, profiles:user_id (id, full_name, email, phone)`).order("created_at", { ascending: false }).limit(10)
    ]);

    if (todayOrdersError) {
      console.error("Error fetching today's orders:", todayOrdersError);
    }

    const todayOrdersList = todayOrders || [];
    const todayOrdersCount = todayOrdersList.length;
    const todayRevenue = todayOrdersList
      .filter(
        (o) =>
          o.status === "DELIVERED" ||
          (o.payment_method === "ONLINE" && o.payment_status === "PAID")
      )
      .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

    if (rxError) {
      console.error("Error counting pending prescriptions:", rxError);
    }

    const lowStockItems = (allInventoryData || [])
      .filter((item: any) => item.stock_quantity <= item.reorder_level)
      .map((item: any) => ({
        id: item.id,
        medicineId: item.medicines?.id,
        name: item.medicines?.name,
        brand: item.medicines?.brand,
        slug: item.medicines?.slug,
        schedule: item.medicines?.drug_schedule || "OTC",
        composition: item.medicines?.composition,
        stockQuantity: item.stock_quantity,
        reorderLevel: item.reorder_level,
      }))
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    const lowStockCount = lowStockItems.length;

    if (recentOrdersError) {
      console.error("Error fetching recent orders:", recentOrdersError);
    }

    return NextResponse.json({
      success: true,
      data: {
        todayOrdersCount,
        todayRevenue,
        pendingRxCount: pendingRxCount || 0,
        lowStockCount,
        lowStockItems: lowStockItems.slice(0, 10),
        recentOrders: (recentOrders || []).map((o: any) => ({
          id: o.id,
          customerName: o.profiles?.full_name || "Guest / Anonymous",
          customerEmail: o.profiles?.email,
          totalAmount: Number(o.total_amount),
          status: o.status,
          paymentStatus: o.payment_status,
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
        })),
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
