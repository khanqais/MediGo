import { createClient } from "@/lib/supabase/server";
import MedicineCard from "../medicine/MedicineCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Medicine } from "@/types/medicine";
import { getStock } from "@/lib/inventory";

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
  }));

  const totalCount = count || bestSellers.length;

  if (bestSellers.length === 0) {
    return (
      <section className="py-12 bg-card border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="pharmacy-label bg-card border border-border rounded-md p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              The catalogue is being stocked
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
              No medicines have been published yet. Once the pharmacy team adds
              stock in the admin portal, those exact medicines appear here.
            </p>
            <Link
              href="/prescriptions"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 mt-5 bg-accent hover:bg-accent-hover text-accent-foreground font-heading font-bold text-sm rounded-sm border border-foreground/30 min-h-[44px]"
            >
              Upload a prescription instead
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              Frequently ordered generic medicines
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Formulations verified by registered clinical pharmacists for bio-equivalent active salts
            </p>
          </div>
          <Link 
            href="/medicines" 
            className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-primary hover:underline min-h-[44px]"
          >
            <span>View all ({totalCount})</span> 
            <ArrowRight size={15} />
          </Link>
        </div>
        
        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {bestSellers.map(medicine => (
            <MedicineCard key={medicine.id} medicine={medicine} />
          ))}
        </div>
        
        <div className="mt-8 text-center sm:hidden">
          <Link 
            href="/medicines" 
            className="inline-flex items-center justify-center gap-2 w-full h-11 px-4 text-foreground font-heading font-bold text-xs border border-border bg-muted rounded-sm hover:bg-card min-h-[44px]"
          >
            <span>View all {totalCount} medicines</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
