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

const optionalString = z.string().optional().nullable();

const numberField = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z
      .number({
        required_error: `${label} is required`,
        invalid_type_error: `${label} must be a valid number`,
      })
      .positive(`${label} must be a positive number`)
  );

const bulkMedicineRowSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required"),
  brand: z.string().trim().min(1, "Brand is required"),
  composition: z.string().trim().min(1, "Composition / salt is required"),
  slug: z.string().trim().optional().default(""),
  generic_name: optionalString,
  genericName: optionalString,
  category_id: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().uuid("Invalid category ID").optional().nullable()
  ),
  categoryId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().uuid("Invalid category ID").optional().nullable()
  ),
  mrp: numberField("MRP"),
  price: numberField("Price"),
  stock: z.preprocess(
    (value) => {
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) return 0;
      return typeof value === "string" ? Number(value) : value;
    },
    z
      .number({ invalid_type_error: "Stock must be a valid number" })
      .nonnegative("Stock must be 0 or higher")
  ),
  reorderLevel: z.preprocess(
    (value) => {
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) return 10;
      return typeof value === "string" ? Number(value) : value;
    },
    z
      .number({ invalid_type_error: "Reorder level must be a valid number" })
      .int("Reorder level must be a whole number")
      .nonnegative("Reorder level must be 0 or higher")
  ),
  drug_schedule: optionalString,
  drugSchedule: optionalString,
  manufacturer: optionalString,
  pack_size: optionalString,
  packSize: optionalString,
  dosage: optionalString,
  description: optionalString,
  directions: optionalString,
  warnings: optionalString,
  image_url: optionalString,
  imageUrl: optionalString,
  is_active: z.preprocess(
    (value) => (typeof value === "string" ? value.toLowerCase() === "true" : value),
    z.boolean().optional()
  ),
  batch_number: optionalString,
  batchNumber: optionalString,
  expiry_date: optionalString,
  expiryDate: optionalString,
});

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();

    // Validate top-level request shape with Zod before any processing
    const bodySchema = z.object({
      rows: z.array(z.record(z.unknown())).min(1, "rows must be a non-empty array").max(500, "Maximum bulk batch size is 500 medicines"),
      dryRun: z.boolean().optional().default(false),
    });
    const bodyParsed = bodySchema.safeParse(body);
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: bodyParsed.error.flatten() },
        { status: 400 }
      );
    }

    const rows = bodyParsed.data.rows;
    const dryRun = bodyParsed.data.dryRun;

    const adminClient = createAdminClient();

    // Fetch existing slugs to check collisions
    const { data: existingMedicines } = await adminClient
      .from("medicines")
      .select("slug");

    const existingSlugs = new Set((existingMedicines || []).map((m) => m.slug));
    const batchSlugs = new Set<string>();

    const rowErrors: RowValidationError[] = [];
    const validRowsToInsert: any[] = [];

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const parsed = bulkMedicineRowSchema.safeParse(rawRow);

      if (!parsed.success) {
        const errors = parsed.error.issues.map((issue) =>
          issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message
        );
        rowErrors.push({
          row: rowNum,
          name: typeof rawRow.name === "string" && rawRow.name.trim() ? rawRow.name : `Row ${rowNum}`,
          errors,
        });
        return;
      }

      const data = parsed.data;
      const errors: string[] = [];

      const name = data.name;
      const brand = data.brand;
      const composition = data.composition;
      let slug = data.slug;

      if (!slug) {
        slug = slugify(name);
      }

      if (!slug) {
        errors.push("Invalid or empty slug");
      } else if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
        // If collision, try suffixing with brand or random salt
        slug = `${slug}-${slugify(brand) || Math.random().toString(36).substring(2, 6)}`;
        if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
          errors.push(`Duplicate slug '${slug}' already exists`);
        }
      }

      const mrp = data.mrp;
      const price = data.price;
      const stock = data.stock;
      const reorderLevel = data.reorderLevel;

      if (price > mrp) {
        errors.push(`Selling price (₹${price}) cannot exceed MRP (₹${mrp})`);
      }

      let drugSchedule = String(data.drug_schedule || data.drugSchedule || "OTC").trim().toUpperCase();
      if (!["OTC", "H", "H1", "X"].includes(drugSchedule)) {
        errors.push(`Invalid drug schedule '${drugSchedule}'. Must be OTC, H, H1, or X`);
        drugSchedule = "OTC";
      }

      const batchNumber = String(data.batch_number || data.batchNumber || "").trim();
      const expiryDate = String(data.expiry_date || data.expiryDate || "").trim();

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
        const imageUrl = data.image_url || data.imageUrl || null;

        validRowsToInsert.push({
          rowNum,
          medicine: {
            name,
            slug,
            brand,
            generic_name: data.generic_name || data.genericName || null,
            composition,
            category_id: data.category_id || data.categoryId || null,
            mrp,
            price,
            discount_percentage: discountPercentage,
            drug_schedule: drugSchedule,
            prescription_required: prescriptionRequired,
            manufacturer: data.manufacturer || null,
            pack_size: data.pack_size || data.packSize || null,
            dosage: data.dosage || null,
            description: data.description || null,
            directions: data.directions || null,
            warnings: data.warnings || null,
            image_url: imageUrl,
            images: imageUrl ? [imageUrl] : [],
            is_active: data.is_active ?? true,
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
