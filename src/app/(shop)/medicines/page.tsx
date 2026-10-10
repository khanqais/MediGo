"use client";

import FilterSidebar from "@/components/medicine/FilterSidebar";
import MedicineCard from "@/components/medicine/MedicineCard";
import { Medicine } from "@/types/medicine";
import { useFilterStore } from "@/store/filterStore";
import { Filter, Search, X, ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

export default function MedicinesPage() {
  const {
    categories,
    toggleCategory,
    brands,
    toggleBrand,
    minPrice,
    maxPrice,
    minDiscount,
    maxDiscount,
    setDiscountRange,
    inStockOnly,
    setInStockOnly,
    prescriptionRequired,
    setPrescriptionRequired,
    sortBy,
    setSortBy,
    clearFilters,
  } = useFilterStore();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch]);

  // Fetch medicines based on API filtering for primary filters,
  // then apply remaining local filters (discount, inStock)
  useEffect(() => {
    async function fetchMedicines() {
      setLoading(true);
      try {
        // We will fetch from API and let API handle core filters (category, brand, price, prescription, sort)
        // Since API supports one category/brand currently, we might fetch all and filter locally, 
        // OR construct query params if we updated API to support arrays. 
        // Our API handles single category/brand. To support multiple, we can fetch all and filter client side 
        // OR update API. Since we want to preserve exact functionality, let's fetch based on sort & search, 
        // and filter the rest locally exactly as it was, to preserve array-based filtering.
        
        let url = `/api/medicines?limit=100`;
        
        if (sortBy) {
          url += `&sort=${sortBy}`;
        }
        
        // If there's a search term, we can use the search API
        if (debouncedSearch) {
          url = `/api/search?q=${encodeURIComponent(debouncedSearch)}&limit=100`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch medicines");
        const data = await res.json();
        setMedicines(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load medicines");
      } finally {
        setLoading(false);
      }
    }
    fetchMedicines();
  }, [sortBy, debouncedSearch]);

  // Apply all filters that might have arrays (categories, brands) and ranges locally 
  // to perfectly preserve the complex Zustand store functionality without changing the API too much
  const filteredMedicines = useMemo(() => {
    let results = medicines;

    if (categories.length > 0) {
      results = results.filter(m => categories.includes(m.category));
    }
    
    if (brands.length > 0) {
      results = results.filter(m => brands.includes(m.brand));
    }
    
    if (minPrice > 0) {
      results = results.filter(m => m.price >= minPrice);
    }
    
    if (maxPrice < 5000) {
      results = results.filter(m => m.price <= maxPrice);
    }
    
    if (minDiscount > 0 || maxDiscount < 80) {
      results = results.filter(m => m.discountPercentage >= minDiscount && m.discountPercentage <= maxDiscount);
    }
    
    if (inStockOnly) {
      results = results.filter(m => m.stock > 0);
    }
    
    if (prescriptionRequired !== null) {
      results = results.filter(m => m.prescriptionRequired === prescriptionRequired);
    }

    return results;
  }, [medicines, categories, brands, minPrice, maxPrice, minDiscount, maxDiscount, inStockOnly, prescriptionRequired]);

  const hasActiveFilters = 
    categories.length > 0 || 
    brands.length > 0 || 
    prescriptionRequired !== null || 
    localSearch !== "" || 
    inStockOnly || 
    minDiscount > 0 || 
    maxDiscount < 80;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link href="/" className="hover:text-primary">Home</Link>
        <ChevronRight size={13} />
        <span className="text-slate-800 font-bold">Medicines Catalogue</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            All Medicines & Healthcare
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Browse 49 lab-tested certified generic pharmaceuticals & wellness formulations
          </p>
        </div>

        {/* Search within results */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter by medicine or salt..."
            className="w-full h-10 pl-9 pr-8 text-xs rounded-full border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white shadow-2xs"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Mobile Filter Toggle */}
        <button 
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="md:hidden flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 rounded-xl shadow-xs font-bold text-slate-800"
        >
          <Filter size={18} className="text-primary" />
          {mobileFilterOpen ? "Close Filters" : "Filter Products"}
        </button>

        {/* Filters Sidebar (280px) */}
        <aside className={`${mobileFilterOpen ? "block" : "hidden"} md:block w-full md:w-[280px] shrink-0`}>
          <FilterSidebar availableBrands={Array.from(new Set(medicines.map((m) => m.brand))).filter(Boolean)} />
        </aside>

        {/* Main Product Column */}
        <div className="flex-1">
          {/* Active Filter Chips & Sort Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">
                Showing <strong className="text-slate-900">{filteredMedicines.length}</strong> medicines
              </span>

              {/* Filter Chips */}
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold"
                >
                  {cat.replace("-", " ")}
                  <button onClick={() => toggleCategory(cat)} aria-label="Remove filter">
                    <X size={12} />
                  </button>
                </span>
              ))}

              {brands.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold"
                >
                  {b}
                  <button onClick={() => toggleBrand(b)} aria-label="Remove brand filter">
                    <X size={12} />
                  </button>
                </span>
              ))}

              {prescriptionRequired !== null && (
                <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-accent text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {prescriptionRequired ? "Prescription Only" : "Non-Prescription"}
                  <button onClick={() => setPrescriptionRequired(null)} aria-label="Clear prescription filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {inStockOnly && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  In Stock Only
                  <button onClick={() => setInStockOnly(false)} aria-label="Clear in-stock filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {(minDiscount > 0 || maxDiscount < 80) && (
                <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {minDiscount}% - {maxDiscount}% Off
                  <button onClick={() => setDiscountRange(0, 80)} aria-label="Clear discount filter">
                    <X size={12} />
                  </button>
                </span>
              )}

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    clearFilters();
                    setLocalSearch("");
                  }}
                  className="text-xs text-red-600 hover:underline font-bold inline-flex items-center gap-1 ml-1"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Sort:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white shadow-2xs cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
                <option value="newest">Newest Formulations</option>
              </select>
            </div>
          </div>

          {/* 4-Column Responsive Grid */}
          {loading ? (
            <div className="py-20 flex justify-center">
               <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                💊
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">No medicines found</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
                We couldn&apos;t find any medicines matching your search or active filter combination.
              </p>
              <button
                onClick={() => {
                  clearFilters();
                  setLocalSearch("");
                }}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-6 py-2.5 rounded-full transition shadow-xs"
              >
                <RotateCcw size={14} /> Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredMedicines.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
