import { allMedicines } from "@/data/medicines";
import { Medicine } from "@/types/medicine";

interface FilterOptions {
  query?: string;
  category?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  maxDiscount?: number;
  inStockOnly?: boolean;
  rxFilter?: "all" | "otc" | "rx";
  prescriptionRequired?: boolean | null;
  sortBy?: "relevance" | "price-asc" | "price-desc" | "price_asc" | "price_desc" | "discount" | "newest" | "featured";
}

export function filterMedicines(options: FilterOptions): Medicine[] {
  const {
    query = "",
    category = "all",
    brands = [],
    minPrice = 0,
    maxPrice = Infinity,
    minDiscount = 0,
    maxDiscount = 100,
    inStockOnly = false,
    rxFilter = "all",
    prescriptionRequired = null,
    sortBy = "relevance",
  } = options;

  return allMedicines
    .filter((item) => {
      // 1. Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchComp = item.composition.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        if (!matchName && !matchComp && !matchBrand && !matchCategory && !matchDesc) return false;
      }

      // 2. Category Match
      if (category && category !== "all") {
        const catSlug = category.toLowerCase();
        const matchesCategory =
          item.category.toLowerCase() === catSlug ||
          (item.tags && item.tags.some(tag => tag.toLowerCase() === catSlug));
          
        if (!matchesCategory) return false;
      }

      // 3. Brands
      if (brands.length > 0 && !brands.includes(item.brand)) {
        return false;
      }

      // 4. Price & Discount
      if (item.price < minPrice || item.price > maxPrice) return false;
      if (item.discountPercentage < minDiscount || item.discountPercentage > maxDiscount) return false;

      // 5. Stock
      if (inStockOnly && item.stock <= 0) return false;

      // 6. Prescription
      if (prescriptionRequired !== null && item.prescriptionRequired !== prescriptionRequired) return false;
      if (rxFilter === "otc" && item.prescriptionRequired) return false;
      if (rxFilter === "rx" && !item.prescriptionRequired) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc" || sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price_desc" || sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "discount") return b.discountPercentage - a.discountPercentage;
      if (sortBy === "newest") return b.id.localeCompare(a.id);
      if (sortBy === "featured") return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.rating ?? 0) - (a.rating ?? 0); // default to relevance/rating
    });
}
