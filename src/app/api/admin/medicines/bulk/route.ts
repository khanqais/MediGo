import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

interface RowValidationError {
  row: number;
  name?: string;
  errors: string[];
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const rows = body.rows;
    const dryRun = Boolean(body.dryRun);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: 'rows' must be a non-empty array of medicine objects" },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum bulk batch size is 500 medicines at a time" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch existing slugs to check collisions
    const { data: existingMedicines } = await adminClient
      .from("medicines")
      .select("slug");

    const existingSlugs = new Set((existingMedicines || []).map((m) => m.slug));
    const batchSlugs = new Set<string>();

    const rowErrors: RowValidationError[] = [];
    const validRowsToInsert: any[] = [];

    rows.forEach((rawRow: any, index: number) => {
      const rowNum = index + 1;
      const errors: string[] = [];

      const name = String(rawRow.name || "").trim();
      const brand = String(rawRow.brand || "").trim();
      const composition = String(rawRow.composition || "").trim();
      let slug = String(rawRow.slug || "").trim();

      if (!name) errors.push("Medicine name is required");
      if (!brand) errors.push("Brand is required");
      if (!composition) errors.push("Composition / salt is required");

      if (!slug && name) {
        slug = slugify(name);
      }

      if (!slug) {
        errors.push("Invalid or empty slug");
      } else {
        if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
          // If collision, try suffixing with brand or random salt
          slug = `${slug}-${slugify(brand) || Math.random().toString(36).substring(2, 6)}`;
          if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
            errors.push(`Duplicate slug '${slug}' already exists`);
          }
        }
      }

      const mrp = Number(rawRow.mrp);
      const price = Number(rawRow.price);
      const stock = rawRow.stock !== undefined && rawRow.stock !== "" ? Number(rawRow.stock) : 0;
      const reorderLevel = rawRow.reorderLevel !== undefined && rawRow.reorderLevel !== "" ? Number(rawRow.reorderLevel) : 10;

      if (isNaN(mrp) || mrp <= 0) errors.push("MRP must be a positive number");
      if (isNaN(price) || price <= 0) errors.push("Price must be a positive number");
      if (!isNaN(mrp) && !isNaN(price) && price > mrp) {
        errors.push(`Selling price (₹${price}) cannot exceed MRP (₹${mrp})`);
      }
      if (isNaN(stock) || stock < 0) errors.push("Stock must be 0 or higher");

      let drugSchedule = String(rawRow.drug_schedule || rawRow.drugSchedule || "OTC").trim().toUpperCase();
      if (!["OTC", "H", "H1", "X"].includes(drugSchedule)) {
        errors.push(`Invalid drug schedule '${drugSchedule}'. Must be OTC, H, H1, or X`);
        drugSchedule = "OTC";
      }

      const batchNumber = String(rawRow.batch_number || rawRow.batchNumber || "").trim();
      const expiryDate = String(rawRow.expiry_date || rawRow.expiryDate || "").trim();

      if (stock > 0) {
        if (!batchNumber) errors.push("batch_number is required when stock > 0");
        if (!expiryDate) errors.push("expiry_date is required when stock > 0");
      }

      if (errors.length > 0) {
        rowErrors.push({ row: rowNum, name: name || `Row ${rowNum}`, errors });
      } else {
        batchSlugs.add(slug);
        const discountPercentage = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const prescriptionRequired = drugSchedule === "H" || drugSchedule === "H1" || drugSchedule === "X";

        validRowsToInsert.push({
          rowNum,
          medicine: {
            name,
            slug,
            brand,
            generic_name: rawRow.generic_name || rawRow.genericName || null,
            composition,
            category_id: rawRow.category_id || rawRow.categoryId || null,
            mrp,
            price,
            discount_percentage: discountPercentage,
            drug_schedule: drugSchedule,
            prescription_required: prescriptionRequired,
            manufacturer: rawRow.manufacturer || null,
            pack_size: rawRow.pack_size || rawRow.packSize || null,
            dosage: rawRow.dosage || null,
            description: rawRow.description || null,
            directions: rawRow.directions || null,
            warnings: rawRow.warnings || null,
            image_url: rawRow.image_url || rawRow.imageUrl || null,
            images: rawRow.image_url ? [rawRow.image_url] : [],
            is_active: rawRow.is_active !== undefined ? Boolean(rawRow.is_active) : true,
          },
          stock,
          reorderLevel,
          batchNumber,
          expiryDate
        });
      }
    });

    // If dry run, just return the validation analysis
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        validCount: validRowsToInsert.length,
        errorCount: rowErrors.length,
        errors: rowErrors,
        samplePreview: validRowsToInsert.slice(0, 5).map((r) => ({
          name: r.medicine.name,
          brand: r.medicine.brand,
          composition: r.medicine.composition,
          mrp: r.medicine.mrp,
          price: r.medicine.price,
          stock: r.stock,
          schedule: r.medicine.drug_schedule,
        })),
      });
    }

    // Execute insertion for all valid rows
    let insertedCount = 0;
    const insertionErrors: RowValidationError[] = [...rowErrors];

    for (const item of validRowsToInsert) {
      const { data: createdMed, error: insertError } = await adminClient
        .from("medicines")
        .insert(item.medicine)
        .select("id")
        .single();

      if (insertError || !createdMed) {
        insertionErrors.push({
          row: item.rowNum,
          name: item.medicine.name,
          errors: [insertError?.message || "Failed to insert into database"],
        });
      } else {
        if (item.stock > 0) {
          await adminClient.from("inventory_batches").insert({
            medicine_id: createdMed.id,
            batch_number: item.batchNumber,
            mfg_date: new Date().toISOString().split('T')[0],
            expiry_date: item.expiryDate,
            quantity: item.stock,
          });
          if (item.reorderLevel !== 10) {
            await adminClient.from("inventory").update({ reorder_level: item.reorderLevel }).eq("medicine_id", createdMed.id);
          }
        } else {
          await adminClient.from("inventory").insert({
            medicine_id: createdMed.id,
            stock_quantity: 0,
            reserved_quantity: 0,
            reorder_level: item.reorderLevel,
          });
        }
        insertedCount++;
      }
    }

    if (insertedCount > 0) {
      await adminClient.from("admin_audit_log").insert({
        admin_id: auth!.id,
        action: "BULK_IMPORT_MEDICINES",
        entity_type: "medicines",
        entity_id: "bulk",
        details: {
          total_rows: rows.length,
          imported_count: insertedCount,
          failed_count: insertionErrors.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      totalRows: rows.length,
      importedCount: insertedCount,
      failedCount: insertionErrors.length,
      errors: insertionErrors,
    });
  } catch (err: any) {
    console.error("POST /api/admin/medicines/bulk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
