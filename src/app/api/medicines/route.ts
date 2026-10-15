import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Medicine } from "@/types/medicine";
import { getStock } from "@/lib/inventory";

export const dynamic = "force-dynamic";

// Schema for query parameters
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  category: z.string().optional(),
  brand: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  prescription_required: z.enum(["true", "false"]).optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "name_asc", "name_desc", "newest", "discount"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Validate with Zod
    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const {
      page,
      limit,
      category,
      brand,
      min_price,
      max_price,
      prescription_required,
      sort
    } = validation.data;

    const supabase = createClient();
    
    // Start building query
    let query = supabase
      .from("medicines")
      .select(`
        *,
        categories!inner(slug, name),
        inventory(stock_quantity)
      `, { count: "exact" })
      .eq("is_active", true);

    // Apply filters
    if (category) {
      query = query.eq("categories.slug", category);
    }
    
    if (brand) {
      query = query.eq("brand", brand);
    }
    
    if (min_price !== undefined) {
      query = query.gte("price", min_price);
    }
    
    if (max_price !== undefined) {
      query = query.lte("price", max_price);
    }
    
    if (prescription_required) {
      query = query.eq("prescription_required", prescription_required === "true");
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "name_asc":
          query = query.order("name", { ascending: true });
          break;
        case "name_desc":
          query = query.order("name", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "discount":
          query = query.order("discount_percentage", { ascending: false });
          break;
        case "relevance":
        default:
          query = query.order("name", { ascending: true });
          break;
      }
    } else {
      // default sort
      query = query.order("name", { ascending: true });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Supabase medicines error:", error);
      return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
    }

    // Transform to expected Medicine format
    const formattedMedicines: Medicine[] = (data || []).map((med: any) => ({
      id: med.id,
      name: med.name,
      brand: med.brand || "",
      slug: med.slug,
      composition: med.composition || "",
      mrp: Number(med.mrp),
      price: Number(med.price),
      discountPercentage: med.discount_percentage,
      prescriptionRequired: med.prescription_required,
      drugSchedule: med.drug_schedule || (med.prescription_required ? "H" : "OTC"),
      category: med.categories?.slug || "",
      imageUrl: med.image_url || "",
      stock: getStock(med),
      rating: null,
      reviewsCount: 0,
      description: med.description || "",
      directions: med.directions || "",
      sideEffects: med.warnings || "", // Mapped warnings -> sideEffects
      genericName: med.generic_name || "",
      images: med.images || [],
      packSize: med.pack_size || "",
      dosage: med.dosage || "",
      manufacturer: med.manufacturer || "",
      faqs: [], // Not in DB
      tags: med.tags || [],
    }));

    return NextResponse.json({
      data: formattedMedicines,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    });
  } catch (error) {
    console.error("Medicines API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
