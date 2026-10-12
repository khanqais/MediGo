import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const medicineUpdateSchema = z
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
    prescriptionRequired: z.boolean().optional(),
    prescription_required: z.boolean().optional(),
  })
  .refine((data) => data.price <= data.mrp, {
    message: "Selling price cannot exceed MRP",
    path: ["price"],
  });

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const adminClient = createAdminClient();
    const { data: medicine, error } = await adminClient
      .from("medicines")
      .select(`
        *,
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
      `)
      .eq("id", params.id)
      .single();

    if (error || !medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: medicine });
  } catch (err: any) {
    console.error("GET /api/admin/medicines/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const medicineId = params.id;
    const body = await request.json();
    const parseResult = medicineUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const adminClient = createAdminClient();

    // Check slug uniqueness against other medicines
    const { data: existingMed } = await adminClient
      .from("medicines")
      .select("id, slug, mrp, price, drug_schedule, prescription_required, is_active, composition, manufacturer")
      .eq("id", medicineId)
      .single();

    if (!existingMed) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    if (existingMed.slug !== d.slug) {
      const { data: slugExists } = await adminClient.from("medicines").select("id").eq("slug", d.slug).single();
      if (slugExists) {
        return NextResponse.json({ error: `Another medicine with slug '${d.slug}' already exists` }, { status: 400 });
      }
    }

    if (auth!.role === "pharmacist") {
      // Allowlist check: Pharmacists may ONLY change non-restricted fields.
      // Restricted set: price, mrp, drug_schedule, prescription_required, is_active, composition, manufacturer
      const rawPrescriptionRequired =
        body.prescriptionRequired ?? body.prescription_required;

      const isPriceChanged = Number(existingMed.price) !== Number(d.price);
      const isMrpChanged = Number(existingMed.mrp) !== Number(d.mrp);
      const isScheduleChanged = existingMed.drug_schedule !== d.drugSchedule;
      const isActiveChanged = existingMed.is_active !== d.isActive;
      const isCompositionChanged = existingMed.composition !== d.composition;
      const isManufacturerChanged =
        (existingMed.manufacturer || "") !== (d.manufacturer || "");
      const isPrescriptionRequiredChanged =
        rawPrescriptionRequired !== undefined &&
        rawPrescriptionRequired !== existingMed.prescription_required;

      if (
        isPriceChanged ||
        isMrpChanged ||
        isScheduleChanged ||
        isActiveChanged ||
        isCompositionChanged ||
        isManufacturerChanged ||
        isPrescriptionRequiredChanged
      ) {
        return NextResponse.json(
          {
            error:
              "Pharmacists cannot change restricted fields (price, mrp, drug_schedule, prescription_required, is_active, composition, manufacturer)",
          },
          { status: 403 }
        );
      }
    }

    const isPharmacist = auth!.role === "pharmacist";
    const prescriptionRequired = isPharmacist
      ? existingMed.prescription_required
      : (d.prescriptionRequired ?? (d.drugSchedule === "H" || d.drugSchedule === "H1" || d.drugSchedule === "X"));
    const mrp = isPharmacist ? Number(existingMed.mrp) : d.mrp;
    const price = isPharmacist ? Number(existingMed.price) : d.price;
    const drugSchedule = isPharmacist ? existingMed.drug_schedule : d.drugSchedule;
    const isActive = isPharmacist ? existingMed.is_active : d.isActive;
    const composition = isPharmacist ? existingMed.composition : d.composition;
    const manufacturer = isPharmacist ? existingMed.manufacturer : (d.manufacturer || null);
    const discountPercentage = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

    // 1. Update medicine record
    const { data: updatedMed, error: updateError } = await adminClient
      .from("medicines")
      .update({
        name: d.name,
        slug: d.slug,
        brand: d.brand,
        generic_name: d.genericName || null,
        composition,
        category_id: d.categoryId || null,
        mrp,
        price,
        discount_percentage: discountPercentage,
        drug_schedule: drugSchedule,
        prescription_required: prescriptionRequired,
        manufacturer,
        pack_size: d.packSize || null,
        dosage: d.dosage || null,
        description: d.description || null,
        directions: d.directions || null,
        warnings: d.warnings || null,
        image_url: d.imageUrl || null,
        images: d.images.length > 0 ? d.images : d.imageUrl ? [d.imageUrl] : [],
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", medicineId)
      .select()
      .single();

    if (updateError || !updatedMed) {
      console.error("Error updating medicine:", updateError);
      return NextResponse.json({ error: "Failed to update medicine" }, { status: 500 });
    }

    // 2. Upsert inventory for reorder level only
    const { error: invError } = await adminClient
      .from("inventory")
      .upsert(
        {
          medicine_id: medicineId,
          reorder_level: d.reorderLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "medicine_id" }
      );

    if (invError) {
      console.error("Error updating inventory:", invError);
    }

    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "UPDATE_MEDICINE",
      entity_type: "medicines",
      entity_id: medicineId,
      details: { name: d.name, old_price: existingMed.price, new_price: d.price },
    });

    return NextResponse.json({
      success: true,
      message: "Medicine updated successfully",
      data: updatedMed,
    });
  } catch (err: any) {
    console.error("PUT /api/admin/medicines/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const medicineId = params.id;
    const adminClient = createAdminClient();

    // Check if any order items reference this medicine
    const { count, error: countError } = await adminClient
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("medicine_id", medicineId);

    if (count && count > 0) {
      // Soft deactivate instead of hard delete to preserve historical order records
      await adminClient
        .from("medicines")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", medicineId);

      await adminClient.from("admin_audit_log").insert({
        admin_id: auth!.id,
        action: "DEACTIVATE_MEDICINE",
        entity_type: "medicines",
        entity_id: medicineId,
        details: { reason: "Active order history exists" },
      });

      return NextResponse.json({
        success: true,
        message: "Medicine has active order history. Deactivated (is_active = false) instead of deleted.",
      });
    }

    // Otherwise, hard delete inventory then medicine
    await adminClient.from("inventory").delete().eq("medicine_id", medicineId);
    const { error: deleteError } = await adminClient.from("medicines").delete().eq("id", medicineId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete medicine" }, { status: 500 });
    }

    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "DELETE_MEDICINE",
      entity_type: "medicines",
      entity_id: medicineId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Medicine deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/admin/medicines/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
