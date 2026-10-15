import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// Strict safety guard: Any script that modifies/deletes data must refuse to run unless NEXT_PUBLIC_SUPABASE_URL is localhost/127.0.0.1
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const isLocal =
  supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");

if (!isLocal) {
  console.error(
    `[GUARD TRIGGERED] Refusing to run: NEXT_PUBLIC_SUPABASE_URL must be localhost or 127.0.0.1. Current URL is "${supabaseUrl}"`
  );
  process.exit(1);
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";

if (!supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runSmokeTest() {
  console.log("==========================================================");
  console.log("   REAL-API CANCEL SMOKE TEST (LOCAL ONLY, GUARDED)       ");
  console.log("==========================================================");
  console.log(`Target Supabase URL: ${supabaseUrl}`);
  console.log(`Target Next.js URL:  ${siteUrl}`);
  console.log("");

  // 1. Sign in or provision test customer
  const testEmail = "test_smoke_customer@example.com";
  const testPassword = "SmokePassword123!";
  let userId = null;

  console.log(`[1] Signing in test customer: ${testEmail}...`);
  let { data: authData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

  if (signInError || !authData?.session) {
    console.log("Test customer not found. Creating test customer via admin API...");
    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

    if (createError && !createError.message?.includes("already exists")) {
      throw new Error(`Failed to create test customer: ${createError.message}`);
    }

    const { data: retryAuth, error: retryError } =
      await anonClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

    if (retryError || !retryAuth?.session) {
      throw new Error(`Sign in failed after user creation: ${retryError?.message}`);
    }

    authData = retryAuth;
  }

  userId = authData.user.id;
  const accessToken = authData.session.access_token;
  console.log(`✓ Signed in as customer ID: ${userId}`);

  // 2. Ensure customer profile & address
  console.log("[2] Ensuring customer address snapshot exists...");
  await adminClient.from("profiles").upsert({
    id: userId,
    email: testEmail,
    full_name: "Test Smoke Customer",
    role: "customer",
  });

  let { data: address } = await adminClient
    .from("addresses")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!address) {
    const { data: newAddr, error: addrError } = await adminClient
      .from("addresses")
      .insert({
        user_id: userId,
        full_name: "Test Customer",
        phone: "+91 9876543210",
        address_line_1: "Flat 101, Generic Heights",
        city: "Bengaluru",
        state: "Karnataka",
        postal_code: "560001",
        is_default: true,
      })
      .select("id")
      .single();

    if (addrError) throw new Error(`Failed to create address: ${addrError.message}`);
    address = newAddr;
  }
  console.log(`✓ Customer address ID: ${address.id}`);

  // 3. Select an active OTC medicine with inventory
  console.log("[3] Finding active OTC medicine with inventory...");
  const { data: medicine, error: medError } = await adminClient
    .from("medicines")
    .select("id, name, price, drug_schedule, prescription_required, inventory(stock_quantity, reserved_quantity)")
    .eq("is_active", true)
    .eq("drug_schedule", "OTC")
    .eq("prescription_required", false)
    .limit(1)
    .single();

  if (medError || !medicine) {
    throw new Error(`Could not find an active OTC medicine: ${medError?.message || "None found"}`);
  }

  const initialInv = Array.isArray(medicine.inventory)
    ? medicine.inventory[0]
    : medicine.inventory;

  const initialStock = initialInv.stock_quantity;
  const initialReserved = initialInv.reserved_quantity;

  console.log(`✓ Selected Medicine: ${medicine.name} (ID: ${medicine.id})`);
  console.log(`  Initial Stock:    stock_quantity=${initialStock}, reserved_quantity=${initialReserved}`);

  // 4. Place a COD order for 2 units
  console.log("[4] Placing COD order for 2 units via POST /api/orders...");
  const placeOrderRes = await fetch(`${siteUrl}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{ medicine_id: medicine.id, quantity: 2 }],
      address_id: address.id,
      payment_method: "COD",
    }),
  });

  const placeOrderJson = await placeOrderRes.json();
  if (!placeOrderRes.ok || !placeOrderJson.success) {
    throw new Error(`Order placement failed: ${JSON.stringify(placeOrderJson)}`);
  }

  const orderId = placeOrderJson.data.id;
  console.log(`✓ COD Order created: #${orderId.slice(0, 8).toUpperCase()} (Full ID: ${orderId})`);

  // Verify stock reservation after order placement
  const { data: invAfterOrder } = await adminClient
    .from("inventory")
    .select("stock_quantity, reserved_quantity")
    .eq("medicine_id", medicine.id)
    .single();

  console.log(`  Stock after order: stock_quantity=${invAfterOrder.stock_quantity}, reserved_quantity=${invAfterOrder.reserved_quantity}`);
  console.log(`  Expected reserved increased by 2: ${invAfterOrder.reserved_quantity === initialReserved + 2 ? "PASS" : "FAIL"}`);

  // 5. POST /api/orders/[id]/cancel
  console.log(`[5] Cancelling order via POST /api/orders/${orderId}/cancel...`);
  const cancelRes1 = await fetch(`${siteUrl}/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const cancelJson1 = await cancelRes1.json();
  console.log(`✓ Cancel response (HTTP ${cancelRes1.status}):`, cancelJson1);

  // 6. Show stock back to original
  const { data: invAfterCancel } = await adminClient
    .from("inventory")
    .select("stock_quantity, reserved_quantity")
    .eq("medicine_id", medicine.id)
    .single();

  console.log("[6] Stock Verification after cancellation:");
  console.log(`  Original:         stock_quantity=${initialStock}, reserved_quantity=${initialReserved}`);
  console.log(`  Current:          stock_quantity=${invAfterCancel.stock_quantity}, reserved_quantity=${invAfterCancel.reserved_quantity}`);
  const stockRestored =
    invAfterCancel.stock_quantity === initialStock &&
    invAfterCancel.reserved_quantity === initialReserved;
  console.log(`  Stock Restored to Original: ${stockRestored ? "YES (SUCCESS)" : "NO (FAILURE)"}`);

  // 7. Show order_status_history rows
  console.log("[7] Order Status History Rows in DB:");
  const { data: statusHistory } = await adminClient
    .from("order_status_history")
    .select("id, status, notes, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  console.table(statusHistory);

  // 8. Cancel again and show response and that stock did NOT increase
  console.log("[8] Attempting second cancellation (idempotency check)...");
  const cancelRes2 = await fetch(`${siteUrl}/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const cancelJson2 = await cancelRes2.json();
  console.log(`✓ Second cancel response (HTTP ${cancelRes2.status}):`, cancelJson2);

  const { data: invAfterSecondCancel } = await adminClient
    .from("inventory")
    .select("stock_quantity, reserved_quantity")
    .eq("medicine_id", medicine.id)
    .single();

  console.log("[9] Stock after second cancel attempt:");
  console.log(`  stock_quantity=${invAfterSecondCancel.stock_quantity}, reserved_quantity=${invAfterSecondCancel.reserved_quantity}`);
  const stockDidNotChange =
    invAfterSecondCancel.stock_quantity === invAfterCancel.stock_quantity &&
    invAfterSecondCancel.reserved_quantity === invAfterCancel.reserved_quantity;
  console.log(`  Stock did NOT increase / change: ${stockDidNotChange ? "YES (PASS)" : "NO (FAIL)"}`);

  // 10. Clean up test order
  console.log("[10] Cleaning up test order records...");
  await adminClient.from("order_status_history").delete().eq("order_id", orderId);
  await adminClient.from("order_items").delete().eq("order_id", orderId);
  await adminClient.from("orders").delete().eq("id", orderId);
  console.log("✓ Cleanup completed.");

  console.log("");
  console.log("==========================================================");
  console.log("   SMOKE TEST RUN COMPLETED SUCCESSFULLY                  ");
  console.log("==========================================================");
}

runSmokeTest().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
