"use client";

import { useCartStore } from "@/store/cartStore";
import { 
  Minus, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  Upload, 
  Tag, 
  Check, 
  Truck, 
  AlertCircle,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function CartPage() {
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    subtotal,
    totalSavings,
    deliveryFee, 
    total, 
    appliedCoupon, 
    setCoupon, 
    clearCoupon 
  } = useCartStore();
  const [couponCode, setCouponCode] = useState("");

  const cartSubtotal = subtotal();
  const cartSavings = totalSavings();
  const cartDeliveryFee = deliveryFee();
  const cartTotal = total();
  const hasPrescriptionItems = items.some((item) => item.medicine.prescriptionRequired);
  const freeDeliveryThreshold = 499;

  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim();
    if (!code) return;

    try {
      setIsApplyingCoupon(true);
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderAmount: cartSubtotal }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCoupon({ code: data.data.code, discount: data.data.discount_amount });
        toast.success(data.data.message || `Coupon ${data.data.code} applied!`);
      } else {
        toast.error(data.message || "Invalid coupon code.");
        clearCoupon();
      }
    } catch {
      toast.error("Failed to validate coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    clearCoupon();
    setCouponCode("");
    toast.info("Coupon removed.");
  };

  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200">
          <div className="w-24 h-24 bg-green-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
            <ShoppingBag size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Your cart is empty</h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Looks like you haven&apos;t added any medicines yet. Explore our genuine generic catalogue and save up to 80%!
          </p>
          <Link 
            href="/medicines" 
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-md"
          >
            Start Shopping Medicines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Shopping Cart</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Review your items and proceed to secure checkout
            </p>
          </div>
          <Link href="/medicines" className="text-xs sm:text-sm font-bold text-primary hover:underline">
            + Add More Medicines
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free Delivery Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Truck size={18} className="text-primary shrink-0" />
                {cartSubtotal >= freeDeliveryThreshold || cartDeliveryFee === 0 ? (
                  <span className="text-green-700 font-bold">
                    You have unlocked FREE Standard Delivery!
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-primary">₹{freeDeliveryThreshold - cartSubtotal}</strong> more for <strong>FREE Delivery</strong>
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-400">
                Threshold: ₹{freeDeliveryThreshold}
              </span>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-6 divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.medicine.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Item Image */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                      {item.medicine.imageUrl ? (
                        <img 
                          src={item.medicine.imageUrl} 
                          alt={item.medicine.name} 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                            {item.medicine.brand}
                          </span>
                          <Link 
                            href={`/medicines/${item.medicine.slug}`} 
                            className="font-bold text-slate-900 hover:text-primary transition-colors text-base sm:text-lg block"
                          >
                            {item.medicine.name}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.medicine.composition}</p>
                          {item.medicine.prescriptionRequired && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1.5 border border-amber-200">
                              <AlertCircle size={11} /> Rx Required
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <div className="font-black text-lg text-slate-900">
                            ₹{item.medicine.price * item.quantity}
                          </div>
                          {item.medicine.mrp > item.medicine.price && (
                            <div className="text-xs text-slate-400 line-through">
                              ₹{item.medicine.mrp * item.quantity}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        {/* Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 h-9 w-fit">
                          <button 
                            onClick={() => updateQuantity(item.medicine.id, Math.max(1, item.quantity - 1))}
                            className="px-3 h-full text-slate-600 hover:text-primary transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-bold text-slate-900 text-xs sm:text-sm">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                            className="px-3 h-full text-slate-600 hover:text-primary transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button 
                          onClick={() => removeItem(item.medicine.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2 flex items-center gap-1 text-xs font-semibold"
                        >
                          <Trash2 size={15} /> <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescription Notice Banner */}
            {hasPrescriptionItems && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 text-amber-600 shadow-2xs border border-amber-100">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">Doctor&apos;s Prescription Required</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Some selected items in your cart require a valid prescription. You can attach it during final checkout or upload now.
                  </p>
                </div>
                <Link
                  href="/prescriptions"
                  className="flex items-center gap-1.5 bg-white border border-amber-300 text-amber-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100/50 transition shadow-2xs shrink-0"
                >
                  <Upload size={14} /> Upload Prescription
                </Link>
              </div>
            )}
          </div>

          {/* Order Summary & Coupon (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sticky top-24">
              {/* Coupon Box */}
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
                <Tag size={16} className="text-primary" /> Apply Promo Coupon
              </h3>

              {appliedCoupon ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-green-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-green-900 block">{appliedCoupon.code} Applied</span>
                      <span className="text-[11px] text-green-700">
                        {appliedCoupon.code === "FREEDEL" ? "Free delivery unlocked (₹50 off)" : `Saved ₹${appliedCoupon.discount}`}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={removeCoupon}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    placeholder="Enter coupon (e.g. FIRST20)" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 uppercase border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <button 
                    type="submit"
                    className="bg-slate-900 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Price Details */}
              <h3 className="font-bold text-slate-900 text-sm mb-3">Order Price Details</h3>
              <div className="space-y-2.5 text-xs sm:text-sm mb-6 pb-6 border-b border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Cart Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span className="font-semibold text-slate-900">₹{cartSubtotal}</span>
                </div>
                {cartSavings > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>You saved</span>
                    <span>-₹{cartSavings}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-slate-900">
                    {cartDeliveryFee === 0 ? <span className="text-green-600 font-bold">FREE</span> : `₹${cartDeliveryFee}`}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="flex justify-between items-baseline mb-6">
                <div>
                  <span className="font-bold text-slate-900 text-base">Total Payable</span>
                  <p className="text-[10px] text-slate-400">Inclusive of all applicable taxes</p>
                </div>
                <span className="font-black text-primary text-2xl">₹{cartTotal}</span>
              </div>

              <Link 
                href="/checkout" 
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-bold hover:bg-primary-dark transition shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
              >
                Proceed to Checkout <ArrowRight size={16} />
              </Link>

              {/* Trust Strip */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>100% Genuine WHO-GMP Medicines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span>Safe & Encrypted 256-bit Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
