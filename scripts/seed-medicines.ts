import { createClient } from "@supabase/supabase-js";
import { allMedicines } from "../src/data/medicines";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We must use the service role key to bypass RLS for inserts
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("Starting database migration...");

  // 1. Extract unique categories from allMedicines
  const uniqueCategories = new Set<string>();
  allMedicines.forEach((med) => {
    if (med.category) {
      uniqueCategories.add(med.category);
    }
  });

  const categories = Array.from(uniqueCategories).map((catName) => ({
    name: catName.charAt(0).toUpperCase() + catName.slice(1).replace(/-/g, " "),
    slug: catName,
    is_active: true,
  }));

  // Upsert categories
  console.log(`Found ${categories.length} unique categories. Upserting...`);
  for (const cat of categories) {
    const { error } = await supabase
      .from("categories")
      .upsert(cat, { onConflict: "slug" });
    
    if (error) {
      console.error(`Error upserting category ${cat.slug}:`, error.message);
    }
  }

  // Fetch created categories to map category slug to category UUID
  const { data: dbCategories, error: catError } = await supabase
    .from("categories")
    .select("id, slug");

  if (catError || !dbCategories) {
    console.error("Failed to fetch categories:", catError?.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  dbCategories.forEach((c) => categoryMap.set(c.slug, c.id));

  // 2. Prepare medicine records
  console.log(`Found ${allMedicines.length} medicines. Upserting...`);
  
  let insertedMeds = 0;
  for (const med of allMedicines) {
    const categoryId = categoryMap.get(med.category);
    
    if (!categoryId) {
      console.warn(`Category not found for medicine ${med.slug}, skipping.`);
      continue;
    }

    const medicineRecord = {
      name: med.name,
      slug: med.slug,
      generic_name: med.genericName || null,
      description: med.description || null,
      category_id: categoryId,
      brand: med.brand || null,
      price: med.price,
      mrp: med.mrp,
      discount_percentage: med.discountPercentage || 0,
      image_url: med.imageUrl || null,
      images: med.images || [],
      prescription_required: med.prescriptionRequired || false,
      drug_schedule: (med as any).drugSchedule || (med.prescriptionRequired ? "H" : "OTC"),
      dosage: med.dosage || null,
      composition: med.composition || null,
      manufacturer: med.manufacturer || null,
      pack_size: med.packSize || null,
      directions: med.directions || null,
      warnings: med.sideEffects || null, // Mapping sideEffects to warnings
      is_active: true,
      tags: med.tags || [],
    };

    const { data: medData, error: medError } = await supabase
      .from("medicines")
      .upsert(medicineRecord, { onConflict: "slug", ignoreDuplicates: false })
      .select("id")
      .single();

    if (medError) {
      console.error(`Error upserting medicine ${med.slug}:`, medError.message);
      continue;
    }

    if (medData) {
      insertedMeds++;
      // Upsert inventory
      const { error: invError } = await supabase
        .from("inventory")
        .upsert({
          medicine_id: medData.id,
          stock_quantity: med.stock || 0,
          reorder_level: 10,
        }, { onConflict: "medicine_id" });

      if (invError) {
        console.error(`Error upserting inventory for ${med.slug}:`, invError.message);
      }
    }
  }

  // Final validation and counts
  const { count: finalCatCount, error: countCatError } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  const { count: finalMedCount, error: countMedError } = await supabase
    .from("medicines")
    .select("*", { count: "exact", head: true });
    
  const { count: finalInvCount, error: countInvError } = await supabase
    .from("inventory")
    .select("*", { count: "exact", head: true });

  console.log("\n=== Migration Complete ===");
  console.log(`Successfully processed ${insertedMeds} medicines.`);
  console.log(`Current DB Counts:`);
  console.log(`Categories: ${finalCatCount || 0}`);
  console.log(`Medicines: ${finalMedCount || 0}`);
  console.log(`Inventory records: ${finalInvCount || 0}`);
}

main().catch(console.error);
