import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Medicine } from "@/types/medicine";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
});

import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  // Rate limit: 60 searches per minute per IP
  const rl = await rateLimit(`search_${ip}`, 60, 60000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil((rl.reset - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid search query", details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { q, limit } = validation.data;
    const supabase = createClient();
    
    // Perform search using ilike on multiple fields
    // Supabase allows chaining or with ilike
    const searchQuery = `%${q}%`;
    
    const { data, error } = await supabase
      .from("medicines")
      .select(`
        *,
        categories!inner(slug, name),
        inventory(stock_quantity)
      `)
      .eq("is_active", true)
      .or(`name.ilike.${searchQuery},generic_name.ilike.${searchQuery},brand.ilike.${searchQuery}`)
      .limit(limit);

    if (error) {
      console.error("Supabase search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

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
      stock: med.inventory?.[0]?.stock_quantity || 0,
      rating: null,
      reviewsCount: 0,
      description: med.description || "",
      directions: med.directions || "",
      sideEffects: med.warnings || "",
      genericName: med.generic_name || "",
      images: med.images || [],
      packSize: med.pack_size || "",
      dosage: med.dosage || "",
      manufacturer: med.manufacturer || "",
      faqs: [],
      tags: med.tags || [],
    }));

    return NextResponse.json({ data: formattedMedicines, query: q });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
