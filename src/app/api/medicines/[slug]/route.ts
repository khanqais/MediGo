import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Medicine } from "@/types/medicine";
import { getStock } from "@/lib/inventory";
import { z } from "zod";

const paramsSchema = z.object({
  slug: z.string().min(1)
});

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid slug parameter" }, { status: 400 });
    }

    const { slug } = validation.data;
    const supabase = createClient();
    
    const { data: med, error } = await supabase
      .from("medicines")
      .select(`
        *,
        categories(slug, name),
        inventory(stock_quantity)
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !med) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
      }
      console.error(`Supabase medicine [${slug}] error:`, error);
      return NextResponse.json({ error: "Failed to fetch medicine" }, { status: 500 });
    }

    // Transform to expected Medicine format
    const formattedMedicine: Medicine = {
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
      sideEffects: med.warnings || "",
      genericName: med.generic_name || "",
      images: med.images || [],
      packSize: med.pack_size || "",
      dosage: med.dosage || "",
      manufacturer: med.manufacturer || "",
      faqs: [],
      tags: med.tags || [],
    };

    // Fetch substitutes by composition, dosage, and pack size
    let substitutes: Medicine[] = [];
    if (med.composition) {
      let query = supabase
        .from("medicines")
        .select(`
          id, name, brand, price, mrp, slug, image_url, composition, dosage, pack_size, manufacturer, discount_percentage, prescription_required, drug_schedule,
          inventory(stock_quantity),
          categories(slug)
        `)
        .eq("composition", med.composition)
        .neq("id", med.id)
        .eq("is_active", true);

      if (med.dosage) query = query.eq("dosage", med.dosage);

      const { data: subsData } = await query.limit(5);
        
      if (subsData) {
        substitutes = subsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          brand: s.brand || "",
          slug: s.slug,
          composition: s.composition || "",
          mrp: Number(s.mrp),
          price: Number(s.price),
          discountPercentage: s.discount_percentage,
          prescriptionRequired: s.prescription_required,
          drugSchedule: s.drug_schedule || (s.prescription_required ? "H" : "OTC"),
          category: Array.isArray(s.categories) ? s.categories[0]?.slug : (s.categories?.slug || ""),
          imageUrl: s.image_url || "",
          stock: getStock(s),
          packSize: s.pack_size || "",
          dosage: s.dosage || "",
          manufacturer: s.manufacturer || "",
          rating: null,
          reviewsCount: 0,
          description: "",
          directions: "",
          sideEffects: "",
          genericName: "",
          images: [],
          faqs: [],
          tags: [],
        }));
      }
    }

    return NextResponse.json({
      data: formattedMedicine,
      substitutes
    });
  } catch (error) {
    console.error(`Medicine [slug] API error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
