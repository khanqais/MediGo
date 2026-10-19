"use client";

import { useCartStore } from "@/store/cartStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Trash2, ArrowRight, Truck, ShoppingBag } from "lucide-react";
import Link from "next/link";
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
    removeNonOtcItems, 
    updateQuantity, 
    removeItem, 
    subtotal, 
    totalSavings,
    deliveryFee, 
    total,
    appliedCoupon 
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
  const currentDeliveryFee = deliveryFee();
  const cartTotalAmount = total();
  const freeDeliveryThreshold = 499;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  const handleProceedToCheckout = () => {
    closeDrawer();
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                <h2 className="text-lg sm:text-xl font-black text-slate-800">Your Cart</h2>
                <span className="text-xs font-bold text-white bg-accent px-2 py-0.5 rounded-full">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} items
                </span>
              </div>
              <button 
                onClick={closeDrawer}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free Delivery Goal Bar */}
            {items.length > 0 && (
              <div className="p-3.5 bg-green-50/80 border-b border-green-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Truck size={15} className="text-primary" />
                    {remainingForFreeDelivery === 0 ? (
                      <span className="text-green-700 font-bold">You unlocked FREE Express Delivery!</span>
                    ) : (
                      <span>
                        Add <strong className="text-primary">₹{remainingForFreeDelivery}</strong> more for <strong>FREE Delivery</strong>
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">
                    🛒
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">Your cart is empty</h3>
                  <p className="text-slate-500 text-xs sm:text-sm max-w-xs mb-6">
                    Browse our generic pharmacy catalogue and save up to 80% on genuine medicines.
                  </p>
                  <button 
                    onClick={closeDrawer} 
                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-primary-dark transition shadow-sm"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div 
                    key={item.medicine.id} 
                    className="flex gap-3.5 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="relative w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl shrink-0 overflow-hidden flex items-center justify-center p-1">
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
                        <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">
                          Med
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                            {item.medicine.brand}
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                            {item.medicine.name}
                          </h4>
                          {isOtcOnlyMode() && !isOtcMedicine(item.medicine) && (
                            <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                              {OTC_ONLY_STOREFRONT_LABEL}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => removeItem(item.medicine.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0"
                          aria-label={`Remove ${item.medicine.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-2.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-slate-900 text-sm">₹{item.medicine.price * item.quantity}</span>
                          {item.medicine.mrp > item.medicine.price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              ₹{item.medicine.mrp * item.quantity}
                            </span>
                          )}
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 h-7">
                          <button 
                            onClick={() => updateQuantity(item.medicine.id, Math.max(1, item.quantity - 1))}
                            className="px-2 h-full text-slate-500 hover:text-primary transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-slate-900">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                            className="px-2 h-full text-slate-500 hover:text-primary transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
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
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900 text-sm">₹{cartSubtotal}</span>
                  </div>
                  {cartSavings > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>You saved</span>
                      <span>-₹{cartSavings}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery</span>
                    <span className="font-semibold text-slate-900">
                      {currentDeliveryFee === 0 ? <span className="text-green-600 font-bold">FREE</span> : `₹${currentDeliveryFee}`}
                    </span>
                  </div>
                  {appliedCoupon && appliedCoupon.discount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span>-₹{appliedCoupon.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-sm font-black text-slate-900">₹{cartTotalAmount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link 
                    href="/cart"
                    onClick={closeDrawer}
                    className="flex items-center justify-center py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-2xs"
                  >
                    View Cart
                  </Link>

                  <button 
                    onClick={handleProceedToCheckout}
                    className="flex items-center justify-center gap-1.5 py-3 bg-primary text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-primary-dark transition-colors shadow-md active:scale-95"
                  >
                    Checkout <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
