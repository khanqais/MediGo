"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MedicineCard from "@/components/medicine/MedicineCard";
import { Search, ArrowUpDown } from "lucide-react";
import { Medicine } from "@/types/medicine";

interface CategoryFiltersProps {
  medicines: Medicine[];
  meta: {
    title: string;
    desc?: string;
    icon?: string;
    bannerGradient?: string;
  };
}

export default function CategoryFilters({ medicines, meta }: CategoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "discount">("featured");
  const [rxFilter, setRxFilter] = useState<"all" | "otc" | "rx">("all");

  const filteredMedicines = useMemo(() => {
    let results = medicines;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.composition.toLowerCase().includes(q) ||
          m.brand.toLowerCase().includes(q)
      );
    }

    if (rxFilter === "rx") {
      results = results.filter((m) => m.prescriptionRequired);
    } else if (rxFilter === "otc") {
      results = results.filter((m) => !m.prescriptionRequired);
    }

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "discount":
          return b.discountPercentage - a.discountPercentage;
        default:
          return 0;
      }
    });

    return results;
  }, [medicines, searchTerm, sortBy, rxFilter]);

  return (
    <>
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
              className={`px-3 py-1.5 rounded-lg transition-all ${
                rxFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRxFilter("otc")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                rxFilter === "otc"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              OTC (No Rx)
            </button>
            <button
              onClick={() => setRxFilter("rx")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                rxFilter === "rx"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
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
      {filteredMedicines.length === 0 ? (
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
              onClick={() => {
                setSearchTerm("");
                setRxFilter("all");
                setSortBy("featured");
              }}
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
    </>
  );
}
