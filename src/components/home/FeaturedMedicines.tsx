import { createClient } from "@/lib/supabase/server";
import MedicineCard from "../medicine/MedicineCard";
import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { Medicine } from "@/types/medicine";

export default async function FeaturedMedicines() {
  const supabase = createClient();
  const { data, count } = await supabase
    .from("medicines")
    .select(`
      *,
      categories(slug, name),
      inventory(stock_quantity)
    `, { count: "exact" })
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(10);

  const bestSellers: Medicine[] = (data || []).map((med: any) => ({
    id: med.id,
    name: med.name,
    brand: med.brand || "",
    slug: med.slug,
    composition: med.composition || "",
    mrp: Number(med.mrp),
    price: Number(med.price),
    discountPercentage: med.discount_percentage || 0,
    prescriptionRequired: Boolean(med.prescription_required),
    drugSchedule: med.drug_schedule || (med.prescription_required ? "H" : "OTC"),
    category: med.categories?.slug || "general",
    imageUrl: med.image_url || "",
    stock: med.inventory?.[0]?.stock_quantity ?? 50,
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

  const totalCount = count || bestSellers.length;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Flame size={15} className="fill-current text-accent" />
              <span>POPULAR GENERICS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Best Sellers</h2>
            <p className="text-sm text-slate-500 mt-0.5">Most prescribed generic formulations ordered by 50,000+ patients</p>
          </div>
          <Link 
            href="/medicines" 
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors group"
          >
            <span>View All ({totalCount})</span> 
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {/* 5-Column Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {bestSellers.map(medicine => (
            <MedicineCard key={medicine.id} medicine={medicine} />
          ))}
        </div>
        
        <div className="mt-8 text-center sm:hidden">
          <Link 
            href="/medicines" 
            className="inline-flex items-center justify-center gap-2 w-full py-3 text-primary font-bold border-2 border-primary rounded-full hover:bg-primary hover:text-white transition"
          >
            View All {totalCount} Medicines <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
