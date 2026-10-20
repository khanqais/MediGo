"use client";

import { useCartStore } from "@/store/cartStore";
import { X, Minus, Plus, Trash2, ArrowRight, Truck, ShoppingBag, FileText } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { isOtcMedicine, isOtcOnlyMode, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";
import { useRouter } from "next/navigation";

export default function CartDrawer() {
  const router = useRouter();
  const { 
    isDrawerOpen, 
    closeDrawer, 
    items, 
    updateQuantity, 
    removeItem, 
    subtotal, 
    totalSavings, 
    total 
  } = useCartStore();

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  const cartSubtotal = subtotal();
  const cartSavings = totalSavings();
  const cartTotalAmount = total();
  const freeDeliveryThreshold = 499;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const hasPrescriptionItems = items.some(i => i.medicine.prescriptionRequired);

  const handleProceedToCheckout = () => {
    closeDrawer();
    router.push("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 bg-foreground/60 backdrop-blur-xs z-50 transition-opacity duration-250 ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-card z-50 flex flex-col shadow-drawer border-l border-border transition-transform duration-250 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} className="text-primary" />
            <h2 className="font-heading font-bold text-lg text-foreground">Shopping cart</h2>
            <span className="text-xs font-bold text-accent-foreground bg-accent border border-foreground/20 px-2 py-0.5 rounded-sm">
              {items.reduce((acc, i) => acc + i.quantity, 0)} items
            </span>
          </div>
          <button 
            onClick={closeDrawer}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Delivery Goal Bar */}
        {items.length > 0 && (
          <div className="p-3.5 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between text-xs font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Truck size={15} className="text-primary shrink-0" />
                {remainingForFreeDelivery === 0 ? (
                  <span className="text-primary font-bold">You unlocked free express delivery!</span>
                ) : (
                  <span>
                    Add <strong className="text-primary font-bold font-mono">₹{remainingForFreeDelivery}</strong> more for free delivery
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Prescription notice in cart */}
        {hasPrescriptionItems && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-xs font-medium text-destructive">
            <FileText size={16} className="shrink-0" />
            <span>Prescription required for items in your cart. You can attach it at checkout.</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center mb-4 text-2xl">
                <ShoppingBag size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-1">Your cart is empty</h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-xs mb-6">
                Explore our pharmacy catalogue and save up to 80% on verified generic medicines.
              </p>
              <button 
                onClick={closeDrawer} 
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-xs sm:text-sm font-bold hover:bg-primary-dark transition shadow-xs min-h-[44px]"
              >
                Browse medicines
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.medicine.id} 
                className="flex gap-3 p-3 bg-card border border-border rounded-md shadow-blister"
              >
                <div className="relative w-16 h-16 bg-muted/40 border border-border rounded-sm shrink-0 overflow-hidden flex items-center justify-center p-1">
                  {item.medicine.imageUrl ? (
                    <Image 
                      src={item.medicine.imageUrl} 
                      alt={item.medicine.name} 
                      fill 
                      sizes="64px" 
                      className="object-contain" 
                      unoptimized={item.medicine.imageUrl.startsWith("http")} 
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">
                      Rx
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-heading font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                        {item.medicine.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">{item.medicine.composition}</p>
                      {item.medicine.prescriptionRequired && (
                        <span className="text-[10px] font-bold text-destructive inline-block mt-0.5">
                          Prescription required
                        </span>
                      )}
                      {isOtcOnlyMode() && !isOtcMedicine(item.medicine) && (
                        <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                          {OTC_ONLY_STOREFRONT_LABEL}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => removeItem(item.medicine.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 shrink-0"
                      aria-label={`Remove ${item.medicine.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading font-bold text-foreground text-sm font-mono">₹{item.medicine.price * item.quantity}</span>
                      {item.medicine.mrp > item.medicine.price && (
                        <span className="text-[10px] text-muted-foreground line-through font-mono">
                          ₹{item.medicine.mrp * item.quantity}
                        </span>
                      )}
                    </div>

                    {/* Stepper with accessible touch targets */}
                    <div className="flex items-center border border-border rounded-sm bg-muted/40 h-8">
                      <button 
                        onClick={() => updateQuantity(item.medicine.id, Math.max(1, item.quantity - 1))}
                        className="w-8 h-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-foreground font-mono">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                        className="w-8 h-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Actions */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-border bg-muted/30 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-foreground font-mono text-sm">₹{cartSubtotal}</span>
              </div>
              {cartSavings > 0 && (
                <div className="flex justify-between text-primary font-semibold">
                  <span>Savings vs brand MRP</span>
                  <span className="font-mono">-₹{cartSavings}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-baseline">
              <div>
                <span className="text-xs text-muted-foreground block">Estimated total</span>
                <span className="font-heading font-extrabold text-xl text-foreground font-mono">₹{cartTotalAmount}</span>
              </div>
              <button
                onClick={handleProceedToCheckout}
                className="h-12 px-6 bg-accent hover:bg-accent-hover text-accent-foreground font-heading font-bold rounded-md shadow-xs border border-foreground/20 flex items-center gap-2 text-sm transition-all active:scale-[0.98]"
              >
                <span>Proceed to checkout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
