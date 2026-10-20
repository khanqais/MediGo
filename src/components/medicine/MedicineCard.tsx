"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Medicine } from "@/types/medicine";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, Check, FileText } from "lucide-react";
import RatingStars from "@/components/shared/RatingStars";
import { toast } from "sonner";
import { isOtcMedicine, isOtcOnlyMode, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";

export default function MedicineCard({ medicine, priority = false }: { medicine: Medicine; priority?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(medicine);
    setIsAdded(true);
    toast.success(`${medicine.name} added to cart`);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const isRx = medicine.prescriptionRequired || medicine.drugSchedule === "H" || medicine.drugSchedule === "H1" || medicine.drugSchedule === "X";

  return (
    <div className="blister-card rounded-md border border-border bg-card overflow-hidden flex flex-col h-full relative">
      {/* Top Clinical Badge Row */}
      <div className="p-3 pb-0 flex items-center justify-between gap-1.5 z-10">
        {medicine.drugSchedule === "X" ? (
          <span className="inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-sm">
            <FileText size={10} /> Schedule X
          </span>
        ) : isRx ? (
          <span className="inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-xs">
            <FileText size={10} /> Prescription required
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-sm border border-border">
            OTC
          </span>
        )}

        {medicine.discountPercentage > 0 && (
          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-sm ml-auto">
            {medicine.discountPercentage}% off
          </span>
        )}
      </div>

      {/* Product Image */}
      <Link 
        href={`/medicines/${medicine.slug}`} 
        className="block relative pt-[80%] bg-muted/20 overflow-hidden p-3 border-b border-border mt-2"
        aria-label={`View details for ${medicine.name}`}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {medicine.imageUrl ? (
            <Image 
              src={medicine.imageUrl} 
              alt={`${medicine.name} ${medicine.packSize || ""}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain"
              unoptimized={medicine.imageUrl.startsWith("http")}
              priority={priority}
              loading={priority ? undefined : "lazy"}
            />
          ) : (
            <div className="w-full h-full bg-muted/60 rounded flex items-center justify-center text-muted-foreground text-xs font-mono font-semibold">
              Rx Formulation
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        <span className="text-[11px] text-muted-foreground font-semibold truncate mb-0.5">
          {medicine.brand}
        </span>

        <Link href={`/medicines/${medicine.slug}`} className="hover:text-primary transition-colors">
          <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2 leading-snug mb-1 min-h-[2.5rem]">
            {medicine.name}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground mb-2 truncate" title={medicine.composition}>
          {medicine.composition}
        </p>

        {/* Strength & Pack Size Metadata Badge */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {medicine.packSize && (
            <span className="text-[11px] font-mono font-bold text-foreground bg-muted/80 border border-border px-2 py-0.5 rounded-sm">
              {medicine.packSize}
            </span>
          )}
          {medicine.category && (
            <span className="text-[10px] text-muted-foreground capitalize truncate">
              {medicine.category.replace("-", " ")}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="mb-3">
          <RatingStars rating={medicine.rating} reviewsCount={medicine.reviewsCount} size={13} />
        </div>

        {/* Price & Primary Action */}
        <div className="mt-auto pt-3 border-t border-border">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-bold text-lg text-foreground font-mono">₹{medicine.price}</span>
              {medicine.mrp > medicine.price && (
                <span className="text-xs text-muted-foreground line-through font-mono">₹{medicine.mrp}</span>
              )}
            </div>
          </div>

          {/* Add to Cart Button */}
          {medicine.drugSchedule === "X" ? (
            <button 
              disabled
              className="w-full h-11 min-h-[44px] rounded-sm font-heading font-bold text-xs bg-muted text-muted-foreground border border-border cursor-not-allowed flex items-center justify-center"
              title="Schedule X drugs cannot be sold online as per Indian law"
            >
              In-store retail only
            </button>
          ) : isOtcOnlyMode() && !isOtcMedicine(medicine) ? (
            <button
              disabled
              className="w-full h-11 min-h-[44px] rounded-sm font-heading font-bold text-xs bg-muted text-muted-foreground border border-border cursor-not-allowed flex items-center justify-center"
            >
              {OTC_ONLY_STOREFRONT_LABEL}
            </button>
          ) : (
            <button 
              onClick={handleAddToCart}
              className={`w-full h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-sm font-heading font-bold text-xs transition-colors border shadow-xs active:scale-[0.98] ${
                isAdded 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-accent hover:bg-accent-hover text-accent-foreground border-foreground/20"
              }`}
            >
              {isAdded ? (
                <>
                  <Check size={15} className="stroke-[3]" />
                  <span>Added to cart</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={15} />
                  <span>Add to cart</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
