import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

async function handleRefreshInventory(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.rpc("recalculate_all_inventory");
    if (error) throw error;

    // Also clean up old rate limit rows
    await adminClient.rpc("cleanup_rate_limits");

    return NextResponse.json({ success: true, message: "Inventory refreshed" });
  } catch (err: any) {
    console.error("Cron inventory refresh error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRefreshInventory(request);
}

export async function POST(request: Request) {
  return handleRefreshInventory(request);
}
