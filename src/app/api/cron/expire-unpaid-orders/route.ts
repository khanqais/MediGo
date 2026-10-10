import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

async function handleExpireUnpaidOrders(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("payment_method", "ONLINE")
      .in("payment_status", ["PENDING", "FAILED"])
      .eq("status", "PENDING")
      .lt("created_at", thirtyMinutesAgo);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let expiredCount = 0;

    for (const order of orders || []) {
      // Use the atomic function for each order
      const { data: result, error: rpcError } = await adminClient.rpc(
        "process_order_status_update",
        {
          p_order_id: order.id,
          p_old_status: order.status,
          p_new_status: "CANCELLED",
          p_new_payment_status: null,
          p_changed_by: null,
          p_notes: "Auto-cancelled: unpaid online order expired after 30 minutes",
          p_is_admin_action: false,
        }
      );

      if (rpcError) {
        console.error(`Failed to cancel order ${order.id}:`, rpcError);
        continue;
      }

      if (result?.success) {
        expiredCount++;
      }
    }

    return NextResponse.json({ success: true, expired: expiredCount });
  } catch (error: any) {
    console.error("Cron expire orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleExpireUnpaidOrders(request);
}

export async function POST(request: Request) {
  return handleExpireUnpaidOrders(request);
}
