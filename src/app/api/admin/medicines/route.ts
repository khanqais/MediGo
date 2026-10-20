import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isInvalidServiceKeyError, serviceKeyErrorBody } from "@/lib/supabase/errors";

const medicineInputSchema = z
  .object({
    name: z.string().min(2, "Medicine name must be at least 2 characters"),
    slug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    brand: z.string().min(1, "Brand is required"),
    genericName: z.string().optional().default(""),
    composition: z.string().min(1, "Composition / salt is required"),
    categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
    mrp: z.coerce.number().positive("MRP must be greater than 0"),
    price: z.coerce.number().positive("Price must be greater than 0"),
    reorderLevel: z.coerce.number().int().nonnegative().default(10),
    drugSchedule: z.enum(["OTC", "H", "H1", "X"]).default("OTC"),
    manufacturer: z.string().optional().default(""),
    packSize: z.string().optional().default(""),
    dosage: z.string().optional().default(""),
    description: z.string().optional().default(""),
    directions: z.string().optional().default(""),
    warnings: z.string().optional().default(""),
    imageUrl: z.string().optional().default(""),
    images: z.array(z.string()).optional().default([]),
    isActive: z.boolean().default(true),
    // Batch fields for initial stock
    batchQuantity: z.coerce.number().int().nonnegative("Quantity cannot be negative").default(0),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })
  .refine((data) => data.price <= data.mrp, {
    message: "Selling price cannot exceed MRP",
    path: ["price"],
  })
  .refine((data) => {
    if (data.batchQuantity > 0) {
      return data.batchNumber && data.batchNumber.trim().length > 0 && data.expiryDate && data.expiryDate.trim().length > 0;
    }
    return true;
  }, {
    message: "Batch number and expiry date are required when adding initial stock",
    path: ["batchQuantity"],
  });

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const schedule = searchParams.get("schedule");
    const active = searchParams.get("active");
    const all = searchParams.get("all") === "true";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const adminClient = createClient();
    let query = adminClient
      .from("medicines")
      .select(`
        id,
        name,
        slug,
        brand,
        generic_name,
        composition,
        price,
        mrp,
        discount_percentage,
        drug_schedule,
        prescription_required,
        manufacturer,
        pack_size,
        dosage,
        description,
        directions,
        warnings,
        image_url,
        images,
        is_active,
        category_id,
        created_at,
        updated_at,
        inventory (
          stock_quantity,
          reserved_quantity,
          reorder_level
        ),
        categories:category_id (
          id,
          name,
          slug
        )
      `, { count: "exact" })
      .order("name", { ascending: true });

    if (schedule && schedule !== "ALL") {
      query = query.eq("drug_schedule", schedule);
    }

    if (active === "true") {
      query = query.eq("is_active", true);
    } else if (active === "false") {
      query = query.eq("is_active", false);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,composition.ilike.%${search}%,manufacturer.ilike.%${search}%`);
    }

    if (!all) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: medicines, count, error } = await query;

    let finalMedicines = medicines;
    let finalCount = count;

    if (error) {
      if (error.code === "42703" || String(error.message).includes("drug_schedule")) {
        // Fallback query if drug_schedule column does not exist yet in DB
        let fallbackQuery = adminClient
          .from("medicines")
          .select(`
            id,
            name,
            slug,
            brand,
            generic_name,
            composition,
            price,
            mrp,
            discount_percentage,
            prescription_required,
            manufacturer,
            pack_size,
            dosage,
            description,
            directions,
            warnings,
            image_url,
            images,
            is_active,
            category_id,
            created_at,
            updated_at,
            inventory (
              stock_quantity,
              reserved_quantity,
              reorder_level
            ),
            categories:category_id (
              id,
              name,
              slug
            )
          `, { count: "exact" })
          .order("name", { ascending: true });

        if (active === "true") {
          fallbackQuery = fallbackQuery.eq("is_active", true);
        } else if (active === "false") {
          fallbackQuery = fallbackQuery.eq("is_active", false);
        }

        if (search) {
          fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,brand.ilike.%${search}%,composition.ilike.%${search}%,manufacturer.ilike.%${search}%`);
        }

        if (!all) {
          fallbackQuery = fallbackQuery.range(offset, offset + limit - 1);
        }

        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error) {
          finalMedicines = (fallbackRes.data || []).map((m: any) => ({
            ...m,
            drug_schedule: m.prescription_required ? "H" : "OTC",
          }));
          finalCount = fallbackRes.count ?? finalMedicines.length;
        } else {
          console.error("Fallback error fetching medicines:", fallbackRes.error);
          return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
        }
      } else {
        console.error("Error fetching medicines:", error);
        if (isInvalidServiceKeyError(error)) {
          return NextResponse.json(serviceKeyErrorBody(), { status: 503 });
        }
        return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
      }
    }

    const total = finalCount ?? (finalMedicines?.length || 0);

    return NextResponse.json({
      success: true,
      data: finalMedicines || [],
      pagination: {
        page: all ? 1 : page,
        limit: all ? total : limit,
        total,
        totalPages: all ? 1 : Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/medicines error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parseResult = medicineInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const adminClient = createAdminClient();

    // Check slug uniqueness
    const { data: existingSlug } = await adminClient
      .from("medicines")
      .select("id")
      .eq("slug", d.slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: `A medicine with the slug '${d.slug}' already exists` },
        { status: 400 }
      );
    }

    const prescriptionRequired = d.drugSchedule === "H" || d.drugSchedule === "H1" || d.drugSchedule === "X";
    const discountPercentage = d.mrp > 0 ? Math.round(((d.mrp - d.price) / d.mrp) * 100) : 0;

    // 1. Insert medicine
    const insertPayload: any = {
      name: d.name,
      slug: d.slug,
      brand: d.brand,
      generic_name: d.genericName || null,
      composition: d.composition,
      category_id: d.categoryId || null,
      mrp: d.mrp,
      price: d.price,
      discount_percentage: discountPercentage,
      drug_schedule: d.drugSchedule,
      prescription_required: prescriptionRequired,
      manufacturer: d.manufacturer || null,
      pack_size: d.packSize || null,
      dosage: d.dosage || null,
      description: d.description || null,
      directions: d.directions || null,
      warnings: d.warnings || null,
      image_url: d.imageUrl || null,
      images: d.images.length > 0 ? d.images : d.imageUrl ? [d.imageUrl] : [],
      is_active: d.isActive,
    };

    let { data: createdMedicine, error: medError } = await adminClient
      .from("medicines")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if drug_schedule column does not exist in DB yet
    if (medError && (medError.code === "PGRST204" || medError.code === "42703" || String(medError.message).includes("drug_schedule"))) {
      console.warn("Retrying medicine creation without drug_schedule column...");
      delete insertPayload.drug_schedule;
      const retry = await adminClient
        .from("medicines")
        .insert(insertPayload)
        .select()
        .single();
      createdMedicine = retry.data;
      medError = retry.error;
    }

    if (medError || !createdMedicine) {
      console.error("Error creating medicine:", medError);
      if (isInvalidServiceKeyError(medError)) {
        return NextResponse.json(serviceKeyErrorBody(), { status: 503 });
      }
      return NextResponse.json({ error: "Failed to create medicine" }, { status: 500 });
    }

    // 2. Insert inventory batch and base inventory record
    if (d.batchQuantity > 0) {
      let batchSuccess = false;
      try {
        const { error: batchError } = await adminClient.from("inventory_batches").insert({
          medicine_id: createdMedicine.id,
          batch_number: d.batchNumber || "BATCH-01",
          mfg_date: new Date().toISOString().split("T")[0],
          expiry_date: d.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          quantity: d.batchQuantity,
        });

        if (!batchError) {
          batchSuccess = true;
        } else {
          console.warn("inventory_batches insert error (table may not exist yet):", batchError.message);
        }
      } catch (err) {
        console.warn("inventory_batches exception:", err);
      }

      // Check if inventory record was created/updated by trigger; if not, upsert directly
      const { data: invRow } = await adminClient
        .from("inventory")
        .select("stock_quantity")
        .eq("medicine_id", createdMedicine.id)
        .maybeSingle();

      if (!invRow || invRow.stock_quantity === 0) {
        await adminClient.from("inventory").upsert(
          {
            medicine_id: createdMedicine.id,
            stock_quantity: d.batchQuantity,
            reserved_quantity: 0,
            reorder_level: d.reorderLevel,
          },
          { onConflict: "medicine_id" }
        );
      }
    } else {
      await adminClient.from("inventory").upsert(
        {
          medicine_id: createdMedicine.id,
          stock_quantity: 0,
          reserved_quantity: 0,
          reorder_level: d.reorderLevel,
        },
        { onConflict: "medicine_id" }
      );
    }

    // Attempt audit log (non-blocking if table not created yet)
    try {
      await adminClient.from("admin_audit_log").insert({
        admin_id: auth!.id,
        action: "CREATE_MEDICINE",
        entity_type: "medicines",
        entity_id: createdMedicine.id,
        details: { name: d.name, slug: d.slug },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "Medicine created successfully",
      data: {
        ...createdMedicine,
        stock: d.batchQuantity,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/medicines error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
