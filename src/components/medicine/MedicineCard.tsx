"use client";

import Link from "next/link";
import { useState } from "react";
import { Medicine } from "@/types/medicine";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, Check, FileText } from "lucide-react";
import RatingStars from "@/components/shared/RatingStars";
import { toast } from "sonner";
import { isOtcMedicine, isOtcOnlyMode, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";

export default function MedicineCard({ medicine }: { medicine: Medicine }) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(medicine);
    setIsAdded(true);
    toast.success(`${medicine.name} added to cart!`);
    setTimeout(() => setIsAdded(false), 1800);
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-primary/50 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full relative">
      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        {medicine.drugSchedule === "X" ? (
          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
            Schedule X
          </span>
        ) : medicine.drugSchedule === "H1" ? (
          <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
            <FileText size={10} /> Rx H1
          </span>
        ) : medicine.prescriptionRequired || medicine.drugSchedule === "H" ? (
          <span className="inline-flex items-center gap-1 bg-accent text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
            <FileText size={10} /> Rx
          </span>
        ) : (
          <span />
        )}

        {medicine.discountPercentage > 0 && (
          <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ml-auto">
            {medicine.discountPercentage}% OFF
          </span>
        )}
      </div>

      {/* Product Image */}
      <Link 
        href={`/medicines/${medicine.slug}`} 
        className="block relative pt-[90%] bg-slate-50 overflow-hidden p-3 border-b border-slate-100 group-hover:bg-green-50/20 transition-colors"
      >
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {medicine.imageUrl ? (
            <img 
              src={medicine.imageUrl} 
              alt={medicine.name}
              className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-semibold">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1 truncate">
          {medicine.brand}
        </span>

        <Link href={`/medicines/${medicine.slug}`} className="group-hover:text-primary transition-colors">
          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug mb-1 min-h-[2.5rem]">
            {medicine.name}
          </h3>
        </Link>

        <p className="text-xs text-slate-500 mb-2 truncate" title={medicine.composition}>
          {medicine.composition}
        </p>

        {/* Rating */}
        <div className="mb-3">
          <RatingStars rating={medicine.rating} reviewsCount={medicine.reviewsCount} size={13} />
        </div>

        {/* Price & Savings */}
        <div className="mt-auto pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">₹{medicine.price}</span>
              {medicine.mrp > medicine.price && (
                <span className="text-xs text-slate-400 line-through">₹{medicine.mrp}</span>
              )}
            </div>
            {medicine.packSize && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {medicine.packSize}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          {medicine.drugSchedule === "X" ? (
            <button 
              disabled
              className="w-full mt-2.5 py-2.5 rounded-full font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              title="Schedule X drugs cannot be sold online as per Indian law"
            >
              In-Store Retail Only
            </button>
          ) : isOtcOnlyMode() && !isOtcMedicine(medicine) ? (
            <button
              disabled
              className="w-full mt-2.5 py-2.5 rounded-full font-bold text-xs bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
            >
              {OTC_ONLY_STOREFRONT_LABEL}
            </button>
          ) : (
            <button 
              onClick={handleAddToCart}
              className={`w-full mt-2.5 flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-xs transition-all shadow-xs active:scale-95 ${
                isAdded 
                  ? "bg-emerald-600 text-white shadow-emerald-200" 
                  : "bg-primary hover:bg-primary-dark text-white hover:shadow-primary/20 hover:shadow-md"
              }`}
            >
              {isAdded ? (
                <>
                  <Check size={15} className="stroke-[3]" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart size={15} />
                  Add to Cart
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
