/**
 * Clears the demo medicine catalogue from the database.
 *
 * Usage:
 *   node scripts/clear-medicines.mjs
 *
 * Requires a valid SUPABASE_SERVICE_ROLE_KEY in .env.local because the
 * medicines table only allows public reads.
 *
 * If order history references the existing medicines they are deactivated
 * instead of deleted, so invoices stay intact. Either way the storefront
 * (which only shows is_active = true) goes empty until an admin publishes
 * real stock from /admin/medicines.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const before = await supabase
    .from("medicines")
    .select("*", { count: "exact", head: true });

  if (before.error) {
    console.error(
      `Could not read the catalogue: ${before.error.message}\n` +
        "Check that SUPABASE_SERVICE_ROLE_KEY is the service_role key from\n" +
        "Supabase Dashboard -> Project Settings -> API."
    );
    process.exit(1);
  }

  console.log(`Medicines currently in the database: ${before.count ?? 0}`);

  const orderItems = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true });

  if (orderItems.error) {
    console.error(`Could not inspect order history: ${orderItems.error.message}`);
    process.exit(1);
  }

  if ((orderItems.count ?? 0) === 0) {
    const { error } = await supabase
      .from("medicines")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error(`Delete failed: ${error.message}`);
      process.exit(1);
    }

    console.log("Deleted all demo medicines (inventory cascaded).");
  } else {
    const { error } = await supabase
      .from("medicines")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error(`Deactivate failed: ${error.message}`);
      process.exit(1);
    }

    console.log(
      `Order history exists (${orderItems.count} items), so demo medicines were deactivated instead of deleted.`
    );
  }

  const after = await supabase
    .from("medicines")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  console.log(`Visible on the storefront now: ${after.count ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
