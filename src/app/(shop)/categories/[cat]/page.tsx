import Link from "next/link";
import { ChevronRight, Sparkles, ShieldCheck } from "lucide-react";
import { Medicine } from "@/types/medicine";
import { createClient } from "@/lib/supabase/server";
import { getStock } from "@/lib/inventory";
import CategoryFilters from "./CategoryFilters";

const categoryMeta: Record<string, { title: string; desc: string; icon: string; bannerGradient: string }> = {
  "fever-pain": {
    title: "Fever & Pain Relief",
    desc: "Paracetamol, Aceclofenac, Ibuprofen and pain-relieving generic formulations with quick action.",
    icon: "🔥",
    bannerGradient: "from-red-600 to-rose-700"
  },
  "antibiotics": {
    title: "Antibiotics & Anti-Infectives",
    desc: "Broad spectrum azalides, fluoroquinolones and cephalosporins for bacterial infections.",
    icon: "💊",
    bannerGradient: "from-emerald-700 to-teal-800"
  },
  "diabetes": {
    title: "Diabetes Care & Management",
    desc: "Metformin, Glimepiride and blood sugar regulating generic tablets for long-term health.",
    icon: "🩸",
    bannerGradient: "from-blue-600 to-indigo-700"
  },
  "heart": {
    title: "Heart & Cardiovascular Care",
    desc: "Antihypertensives, cholesterol-lowering statins, and heart wellness generic tablets.",
    icon: "❤️",
    bannerGradient: "from-rose-600 to-pink-700"
  },
  "vitamins": {
    title: "Vitamins & Multimineral Supplements",
    desc: "Daily wellness essentials, Vitamin D3, B-Complex, Zinc and vital nutrition boosters.",
    icon: "✨",
    bannerGradient: "from-amber-600 to-orange-700"
  },
  "skin-care": {
    title: "Skin & Dermatological Care",
    desc: "Topical antifungal creams, antibacterial ointments, and soothing dermatological formulas.",
    icon: "✨",
    bannerGradient: "from-pink-600 to-rose-600"
  },
  "eye-care": {
    title: "Eye Care & Ophthalmology",
    desc: "Lubricating eye drops, anti-allergic ophthalmic solutions, and vision comfort formulas.",
    icon: "👁️",
    bannerGradient: "from-cyan-600 to-blue-700"
  },
  "baby-care": {
    title: "Baby Care & Pediatrics",
    desc: "Gentle pediatric syrups, pediatric drops, and essential healthcare for infants.",
    icon: "👶",
    bannerGradient: "from-purple-600 to-indigo-700"
  },
  "ayurveda": {
    title: "Ayurvedic & Herbal Wellness",
    desc: "Pure herbal extracts, immunity kwaths, and traditional holistic remedies.",
    icon: "🌿",
    bannerGradient: "from-emerald-600 to-green-700"
  },
  "lab-tests": {
    title: "Diagnostics & Health Checkups",
    desc: "Comprehensive blood tests, full body health packages, and certified home sample collection.",
    icon: "🔬",
    bannerGradient: "from-teal-600 to-cyan-700"
  }
};

export async function generateMetadata({ params }: { params: { cat: string } }) {
  const meta = categoryMeta[params.cat] ?? categoryMeta[params.cat?.toLowerCase()] ?? { title: params.cat };
  return { title: `${meta.title} | MediQuick`, description: meta.desc };
}

export default async function CategoryDetailPage({ params }: { params: { cat: string } }) {
  const catSlug = params.cat.toLowerCase();
  const meta = categoryMeta[catSlug] || {
    title: catSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    desc: `Explore certified generic medicines and healthcare essentials for ${catSlug.replace("-", " ")}.`,
    icon: "💊",
    bannerGradient: "from-primary to-green-700"
  };

  const supabase = createClient();
  const { data } = await supabase
    .from("medicines")
    .select("id, name, brand, slug, composition, mrp, price, discount_percentage, prescription_required, drug_schedule, image_url, inventory(stock_quantity), categories!inner(slug)")
    .eq("is_active", true)
    .eq("categories.slug", catSlug)
    .limit(100);

  const medicines: Medicine[] = (data || []).map((med: any) => ({
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
    category: med.categories?.slug || catSlug,
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

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Category Hero Banner */}
      <div className={`bg-gradient-to-r ${meta.bannerGradient} text-white py-12 px-4 shadow-md`}>
        <div className="container mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-white/80 mb-4 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={13} />
            <Link href="/medicines" className="hover:text-white transition-colors">Categories</Link>
            <ChevronRight size={13} />
            <span className="text-white font-bold">{meta.title}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl p-2 bg-white/10 rounded-2xl backdrop-blur-xs">{meta.icon}</span>
                <h1 className="text-2xl sm:text-4xl font-black">{meta.title}</h1>
              </div>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                {meta.desc}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-white/80">
                <span className="flex items-center gap-1.5"><ShieldCheck size={16} /> 100% WHO-GMP Certified</span>
                <span>• Up to 80% Cost Savings</span>
                <span>• Same-day Express Dispatch</span>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 self-start md:self-center">
              <span className="block text-2xl sm:text-3xl font-black">{medicines.length}</span>
              <span className="text-xs text-white/80 uppercase tracking-wider font-semibold">Available Products</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <CategoryFilters medicines={medicines} meta={meta} />

        {/* Bottom Educational / Generic Savings Explainer */}
        <div className="mt-16 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl border border-emerald-100 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-green-200">
              <Sparkles size={13} /> Why Choose MediQuick Generics?
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Same Active Molecules, Up to 80% Lower Price
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every generic medicine in our {meta.title} catalog uses the exact chemical molecule and bioequivalence standards as expensive branded counterparts. Manufactured under stringent Schedule M and WHO-GMP compliance.
            </p>
          </div>
          <Link
            href="/prescriptions"
            className="shrink-0 px-6 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md whitespace-nowrap"
          >
            Upload Prescription for Assistance
          </Link>
        </div>
      </div>
    </div>
  );
}
