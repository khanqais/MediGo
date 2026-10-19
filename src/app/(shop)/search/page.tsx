"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, Suspense, useEffect } from "react";
import Link from "next/link";
import MedicineCard from "@/components/medicine/MedicineCard";
import { Medicine } from "@/types/medicine";
import { toast } from "sonner";
import { 
  Search, 
  X, 
  Sparkles, 
  ArrowUpDown, 
  ChevronRight, 
  Upload, 
  ShieldCheck, 
  Tag
} from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialQuery = searchParams.get("q") || searchParams.get("query") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [rxFilter, setRxFilter] = useState<"all" | "otc" | "rx">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "discount">("relevance");

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "antibiotics", label: "Antibiotics" },
    { id: "fever-pain", label: "Fever & Pain" },
    { id: "diabetes", label: "Diabetes" },
    { id: "heart", label: "Heart Care" },
    { id: "vitamins", label: "Vitamins" },
    { id: "skin-care", label: "Skin Care" },
    { id: "ayurveda", label: "Ayurveda" },
  ];

  const popularSearches = [
    "Azithromycin",
    "Paracetamol",
    "Levofloxacin",
    "Metformin",
    "Vitamin D3",
    "Pantoprazole",
    "Cough Syrup"
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    async function fetchSearchMedicines() {
      setLoading(true);
      try {
        let url = `/api/medicines?limit=100`;
        if (debouncedSearch.trim()) {
          url = `/api/search?q=${encodeURIComponent(debouncedSearch.trim())}&limit=100`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMedicines(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load search results");
      } finally {
        setLoading(false);
      }
    }
    fetchSearchMedicines();
  }, [debouncedSearch]);

  const searchResults = useMemo(() => {
    let results = medicines;

    if (selectedCategory !== "all") {
      results = results.filter(m => m.category === selectedCategory);
    }

    if (rxFilter === "rx") {
      results = results.filter(m => m.prescriptionRequired);
    } else if (rxFilter === "otc") {
      results = results.filter(m => !m.prescriptionRequired);
    }

    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "discount": return b.discountPercentage - a.discountPercentage;
        default: return 0;
      }
    });

    return results;
  }, [medicines, selectedCategory, rxFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Search Header Bar */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 shadow-2xs">
        <div className="container mx-auto max-w-4xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={13} />
            <Link href="/medicines" className="hover:text-primary transition-colors">Medicines</Link>
            <ChevronRight size={13} />
            <span className="text-slate-800 font-bold">Search Catalog</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
            Search Genuine Generic Medicines & Salts
          </h1>

          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Medicine Name, Generic Salt Molecule (e.g. Azithromycin, Paracetamol)..."
              className="w-full bg-slate-50 hover:bg-white border-2 border-slate-200 focus:border-primary rounded-2xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-slate-800 font-medium focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            )}
          </form>

          {/* Popular Search Pills */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Popular:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setSearchTerm(term)}
                className="text-xs bg-slate-100 hover:bg-green-50 hover:text-primary hover:border-primary/30 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-medium transition whitespace-nowrap"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* If searching a salt or query, show generic savings callout */}
        {searchTerm.trim() && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base">
                  Generic Substitutes Matching &ldquo;{searchTerm}&rdquo;
                </h2>
                <p className="text-xs text-white/90">
                  Save up to 80% with bioequivalent molecules approved by WHO-GMP laboratories.
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/30 whitespace-nowrap">
              {loading ? "-" : searchResults.length} Generics Available
            </div>
          </div>
        )}

        {/* Filters and Sorting Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full lg:w-auto pb-1 lg:pb-0">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === c.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
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
                OTC
              </button>
              <button
                onClick={() => setRxFilter("rx")}
                className={`px-3 py-1.5 rounded-lg transition-all ${rxFilter === "rx" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                Rx Only
              </button>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary cursor-pointer"
              >
                <option value="relevance">Most Relevant</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{loading ? "-" : searchResults.length}</strong> medicines
            {searchTerm && <span> for &ldquo;<strong>{searchTerm}</strong>&rdquo;</span>}
          </p>
        </div>

        {/* Results Grid or Empty State */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="py-20 min-h-[400px] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 sm:p-16 text-center border border-slate-200 max-w-xl mx-auto shadow-xs">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🔎
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No medicines match your search</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                We couldn&apos;t find any generic medicine matching &ldquo;{searchTerm}&rdquo;. Try checking for spelling errors or search using the generic chemical salt name.
              </p>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl mb-6 text-left">
                <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                  <Upload size={14} className="text-accent" /> Can&apos;t find your brand name?
                </h4>
                <p className="text-xs text-slate-600">
                  Upload your doctor&apos;s prescription and our registered pharmacists will find the exact generic equivalent with up to 80% discount for you.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button 
                  onClick={() => { setSearchTerm(""); setSelectedCategory("all"); setRxFilter("all"); }}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition"
                >
                  Reset Search Filters
                </button>
                <Link 
                  href="/prescriptions"
                  className="px-5 py-2.5 bg-accent hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Upload size={14} /> Upload Prescription
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center text-slate-500">Loading catalog search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
