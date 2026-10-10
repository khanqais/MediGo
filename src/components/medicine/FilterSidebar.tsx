"use client";

import { useFilterStore } from "@/store/filterStore";
import * as Slider from "@radix-ui/react-slider";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

const categoriesList = [
  "fever-pain", "diabetes", "heart", "vitamins", "skin-care", "antibiotics", "thyroid", "digestion"
];

const DEFAULT_PHARMA_BRANDS = [
  "Abbott", "Alembic", "Alkem", "Cipla", "Dr Reddys", "Glenmark", "Intas",
  "Lupin", "Mankind", "Micro Labs", "Pfizer", "Sun Pharma", "Torrent", "Zydus"
];

export default function FilterSidebar({ availableBrands }: { availableBrands?: string[] }) {
  const { 
    categories, toggleCategory,
    brands, toggleBrand,
    minPrice, maxPrice, setPriceRange,
    minDiscount, maxDiscount, setDiscountRange,
    inStockOnly, setInStockOnly,
    prescriptionRequired, setPrescriptionRequired,
    clearFilters
  } = useFilterStore();

  const [brandSearch, setBrandSearch] = useState("");

  // 1. Derive brand list from availableBrands or pharmaceutical standards
  const allBrands = useMemo(() => {
    if (availableBrands && availableBrands.length > 0) {
      return Array.from(new Set(availableBrands)).sort();
    }
    return DEFAULT_PHARMA_BRANDS;
  }, [availableBrands]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return allBrands;
    return allBrands.filter((b) => 
      b.toLowerCase().includes(brandSearch.trim().toLowerCase())
    );
  }, [allBrands, brandSearch]);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Filters</h3>
        <button onClick={clearFilters} className="text-sm text-primary hover:underline">
          Clear All
        </button>
      </div>

      <div className="space-y-6">
        {/* Categories */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-3 text-sm">Categories</h4>
          <div className="space-y-2">
            {categoriesList.map(category => (
              <label key={category} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-600 capitalize">{category.replace("-", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Brands */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-2 text-sm">Brands</h4>
          {/* Small text input to filter/search brand list */}
          <div className="relative mb-2">
            <input
              type="text"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full text-xs py-1.5 pl-7 pr-2 border border-slate-200 rounded-lg outline-none focus:border-primary"
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredBrands.length > 0 ? (
              filteredBrands.map(brand => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={brands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-600 truncate">{brand}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-1">No brands found</p>
            )}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 text-sm">Price</h4>
            <span className="text-xs text-slate-500">₹{minPrice} - ₹{maxPrice}</span>
          </div>
          <Slider.Root 
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[minPrice, maxPrice]} 
            max={5000} 
            step={10}
            onValueChange={([min, max]) => setPriceRange(min, max)}
          >
            <Slider.Track className="bg-slate-200 relative grow rounded-full h-1.5">
              <Slider.Range className="absolute bg-primary rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-primary shadow-sm rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50" />
            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-primary shadow-sm rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50" />
          </Slider.Root>
        </div>

        <hr className="border-slate-100" />

        {/* Discount Range */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 text-sm">Discount</h4>
            <span className="text-xs text-slate-500">{minDiscount}% - {maxDiscount}%</span>
          </div>
          <Slider.Root 
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[minDiscount, maxDiscount]} 
            min={0}
            max={80} 
            step={5}
            onValueChange={([min, max]) => setDiscountRange(min, max)}
          >
            <Slider.Track className="bg-slate-200 relative grow rounded-full h-1.5">
              <Slider.Range className="absolute bg-primary rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-primary shadow-sm rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50" />
            <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-primary shadow-sm rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50" />
          </Slider.Root>
        </div>

        <hr className="border-slate-100" />

        {/* Availability */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-3 text-sm">Availability</h4>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="availability"
                checked={!inStockOnly}
                onChange={() => setInStockOnly(false)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">All</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="availability"
                checked={inStockOnly}
                onChange={() => setInStockOnly(true)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">In Stock</span>
            </label>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Prescription Required */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-3 text-sm">Prescription Required</h4>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="rx"
                checked={prescriptionRequired === null}
                onChange={() => setPrescriptionRequired(null)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">All</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="rx"
                checked={prescriptionRequired === true}
                onChange={() => setPrescriptionRequired(true)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="rx"
                checked={prescriptionRequired === false}
                onChange={() => setPrescriptionRequired(false)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">No</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
