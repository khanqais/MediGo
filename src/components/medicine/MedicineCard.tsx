"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Medicine } from "@/types/medicine";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, Check, Heart, Plus, Minus, Pill, FileText } from "lucide-react";
import { toast } from "sonner";
import { isOtcMedicine, isOtcOnlyMode, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";

export default function MedicineCard({ medicine, priority = false }: { medicine: Medicine; priority?: boolean }) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find((item) => item.medicine.id === medicine.id);
  const inCartQty = cartItem?.quantity || 0;

  const isRx = medicine.prescriptionRequired || medicine.drugSchedule === "H" || medicine.drugSchedule === "H1" || medicine.drugSchedule === "X";

  const discount = medicine.discountPercentage > 0 
    ? medicine.discountPercentage 
    : medicine.mrp > medicine.price 
      ? Math.round(((medicine.mrp - medicine.price) / medicine.mrp) * 100) 
      : 0;

  const savings = medicine.mrp > medicine.price ? medicine.mrp - medicine.price : 0;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);
    if (nextFav) {
      toast.success(`${medicine.name} added to wishlist`);
    } else {
      toast.info(`${medicine.name} removed from wishlist`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(medicine);
    setIsAdded(true);
    toast.success(`${medicine.name} added to cart`);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(medicine.id, inCartQty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCartQty <= 1) {
      removeItem(medicine.id);
      toast.success(`${medicine.name} removed from cart`);
    } else {
      updateQuantity(medicine.id, inCartQty - 1);
    }
  };

  // Badge label (like "Best Seller" in reference)
  const badgeLabel = discount > 0 
    ? `${discount}% OFF`
    : medicine.rating && medicine.rating >= 4.5
      ? "Best Seller"
      : isRx 
        ? "Rx Required" 
        : "OTC";

  return (
    <div className="group relative flex flex-col h-full bg-card rounded-[28px] border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out p-3.5 sm:p-4">
      {/* Top Image Showcase Canvas (matching sneaker card container) */}
      <div className="relative w-full aspect-square bg-[#F3F5F4] dark:bg-slate-800/50 rounded-[22px] overflow-hidden flex items-center justify-center p-4">
        {/* Top Badges Row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          {/* Top-Left Pill Badge (like "Best Seller" in reference) */}
          <span className="pointer-events-auto bg-white/95 dark:bg-card/95 text-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-xs border border-black/5 dark:border-white/10 tracking-tight">
            {badgeLabel}
          </span>

          {/* Top-Right Favorite Heart Icon Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="pointer-events-auto w-9 h-9 rounded-full bg-white/95 dark:bg-card/95 shadow-xs hover:shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border border-black/5 dark:border-white/10"
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              size={16} 
              className={`transition-colors duration-200 ${
                isFavorite 
                  ? "fill-rose-500 text-rose-500 scale-110" 
                  : "text-slate-400 hover:text-rose-500"
              }`} 
            />
          </button>
        </div>

        {/* Product Image Canvas */}
        <Link 
          href={`/medicines/${medicine.slug}`} 
          className="relative w-full h-full flex items-center justify-center"
          aria-label={`View details for ${medicine.name}`}
        >
          {medicine.imageUrl && !imageError ? (
            <Image 
              src={medicine.imageUrl} 
              alt={`${medicine.name} ${medicine.packSize || ""}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-sm"
              unoptimized={medicine.imageUrl.startsWith("http")}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-card text-primary flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Pill size={24} className="stroke-[2.2]" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                Verified Formulation
              </span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                Clinical Grade
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Content Section (matching reference layout) */}
      <div className="flex flex-col flex-1 pt-3">
        {/* Brand Name (like "Nike" in the reference) */}
        <p className="text-primary font-semibold text-xs tracking-wide mb-1 truncate">
          {medicine.brand || "GENERIC PHARMA"}
        </p>

        {/* Product Title (like "Dunk High..." in the reference) */}
        <Link href={`/medicines/${medicine.slug}`} className="block group/title mb-1">
          <h3 
            className="font-heading font-extrabold text-base text-foreground group-hover/title:text-primary transition-colors line-clamp-2 leading-snug min-h-[2.75rem]"
            title={medicine.name}
          >
            {medicine.name}
          </h3>
        </Link>

        {/* Active Salt Composition & Pack Size */}
        <p 
          className="text-xs text-muted-foreground line-clamp-1 mb-2 font-normal"
          title={medicine.composition}
        >
          {medicine.composition || medicine.genericName || medicine.packSize || "Standard pack"}
        </p>

        {/* Price Row (positioned directly under title/specs as in reference) */}
        <div className="flex items-baseline gap-2 mb-3.5 mt-auto">
          <span className="font-heading font-extrabold text-lg sm:text-xl text-foreground font-mono">
            ₹{medicine.price}
          </span>
          {medicine.mrp > medicine.price && (
            <span className="text-xs text-muted-foreground/60 line-through font-mono">
              ₹{medicine.mrp}
            </span>
          )}
          {savings > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
              Save ₹{savings}
            </span>
          )}
        </div>

        {/* Full-Width Pill Action Button (matching "Buy Now" pill in reference) */}
        {medicine.drugSchedule === "X" ? (
          <button 
            disabled
            className="w-full h-12 rounded-full font-heading font-bold text-sm bg-muted text-muted-foreground border border-border/60 cursor-not-allowed flex items-center justify-center gap-1.5"
            title="Schedule X drugs cannot be sold online as per Indian law"
          >
            <FileText size={14} />
            <span>In-store retail only</span>
          </button>
        ) : isOtcOnlyMode() && !isOtcMedicine(medicine) ? (
          <button
            disabled
            className="w-full h-12 rounded-full font-heading font-bold text-xs bg-muted text-muted-foreground border border-border/60 cursor-not-allowed flex items-center justify-center gap-1.5 px-3 text-center"
          >
            <FileText size={14} />
            <span className="truncate">{OTC_ONLY_STOREFRONT_LABEL}</span>
          </button>
        ) : inCartQty > 0 && !isAdded ? (
          <div className="w-full h-12 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-between p-1.5">
            <button 
              type="button"
              onClick={handleDecrement}
              className="w-9 h-9 rounded-full bg-card text-foreground hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors shadow-2xs active:scale-95"
              aria-label={`Decrease quantity of ${medicine.name}`}
            >
              <Minus size={15} className="stroke-[2.5]" />
            </button>
            
            <span className="font-heading font-bold text-sm text-foreground flex items-center gap-1 px-1">
              <span>{inCartQty}</span>
              <span className="text-xs font-medium text-muted-foreground">in cart</span>
            </span>

            <button 
              type="button"
              onClick={handleIncrement}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary-dark flex items-center justify-center transition-colors shadow-2xs active:scale-95"
              aria-label={`Increase quantity of ${medicine.name}`}
            >
              <Plus size={15} className="stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAddToCart}
            className={`w-full h-12 rounded-full font-heading font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98] ${
              isAdded 
                ? "bg-emerald-600 text-white shadow-emerald-600/20" 
                : "bg-primary text-primary-foreground hover:bg-primary-dark"
            }`}
          >
            {isAdded ? (
              <>
                <Check size={16} className="stroke-[3] animate-popIn" />
                <span>Added to cart</span>
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                <span>Add to cart</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


