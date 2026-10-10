"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import MedicineCard from "@/components/medicine/MedicineCard";
import { ChevronRight, Filter, Search, SlidersHorizontal, ArrowUpDown, Sparkles, ShieldCheck } from "lucide-react";
import { Medicine } from "@/types/medicine";
import { toast } from "sonner";

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

export default function CategoryDetailPage({ params }: { params: { cat: string } }) {
  const catSlug = params.cat.toLowerCase();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "discount">("featured");
  const [rxFilter, setRxFilter] = useState<"all" | "otc" | "rx">("all");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryMedicines() {
      try {
        const res = await fetch(`/api/medicines?category=${catSlug}&limit=100`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMedicines(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load category medicines");
      } finally {
        setLoading(false);
      }
    }
    fetchCategoryMedicines();
  }, [catSlug]);

  const meta = categoryMeta[catSlug] || {
    title: catSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    desc: `Explore certified generic medicines and healthcare essentials for ${catSlug.replace("-", " ")}.`,
    icon: "💊",
    bannerGradient: "from-primary to-green-700"
  };

  const filteredMedicines = useMemo(() => {
    // Basic local filter replicating previous filterMedicines behavior for this specific category
    let results = medicines;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      results = results.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.composition.toLowerCase().includes(q) || 
        m.brand.toLowerCase().includes(q)
      );
    }

    if (rxFilter === "rx") {
      results = results.filter(m => m.prescriptionRequired);
    } else if (rxFilter === "otc") {
      results = results.filter(m => !m.prescriptionRequired);
    }

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "discount": return b.discountPercentage - a.discountPercentage;
        default: return 0;
      }
    });

    return results;
  }, [medicines, searchTerm, sortBy, rxFilter]);

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
              <span className="block text-2xl sm:text-3xl font-black">{loading ? "-" : filteredMedicines.length}</span>
              <span className="text-xs text-white/80 uppercase tracking-wider font-semibold">Available Products</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Controls & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search inside category */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Search in ${meta.title}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Rx Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setRxFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${rxFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                All
              </button>
              <button
                onClick={() => setRxFilter("otc")}
                className={`px-3 py-1.5 rounded-lg transition-all ${rxFilter === "otc" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                OTC (No Rx)
              </button>
              <button
                onClick={() => setRxFilter("rx")}
                className={`px-3 py-1.5 rounded-lg transition-all ${rxFilter === "rx" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                Rx Only
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={15} className="text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
              >
                <option value="featured">Top Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No medicines found</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6">
              We couldn&apos;t find any products matching your specific filter criteria in this category.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => { setSearchTerm(""); setRxFilter("all"); setSortBy("featured"); }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition"
              >
                Reset Filters
              </button>
              <Link 
                href="/medicines"
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                View All Medicines
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedicines.map((medicine) => (
              <MedicineCard key={medicine.id} medicine={medicine} />
            ))}
          </div>
        )}

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
