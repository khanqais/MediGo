"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { 
  Check, 
  ChevronRight, 
  Package, 
  Home, 
  Truck, 
  Clock, 
  ShieldCheck, 
  FileText,
  PhoneCall,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("No order ID was provided. Please check your order history.");
      return;
    }

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/orders/${orderId}`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setOrder(json.data);
        } else {
          setError(json.error || "Order not found or does not belong to your account.");
        }
      } catch {
        setError("Network error communicating with order service.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center">
          <RefreshCw size={28} className="animate-spin mx-auto text-primary mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Retrieving Order Confirmation</h2>
          <p className="text-xs text-slate-500 mt-1">Verifying order ownership and loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center">
          <AlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Order Verification Failed</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            {error || "We could not find this order under your account."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/orders" className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-xs">
              Go to My Orders
            </Link>
            <Link href="/medicines" className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200">
              Browse Medicines
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPendingApproval = order.status === "PENDING_PRESCRIPTION_APPROVAL";

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 flex items-center justify-center">
      <div 
        className="max-w-xl w-full bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden animate-[fadeScaleIn_0.4s_ease-out_forwards]"
      >
        {/* Top Gradient Ribbon */}
        <div className={`absolute top-0 left-0 w-full h-2.5 ${
          isPendingApproval 
            ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600"
            : "bg-gradient-to-r from-primary via-emerald-400 to-green-500"
        }`} />
        
        {/* Animated Icon Circle */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative border-2 ${
          isPendingApproval
            ? "bg-amber-50 text-amber-600 border-amber-200"
            : "bg-green-50 text-primary border-green-200"
        }`}>
          <div className="animate-[popIn_0.35s_0.15s_ease-out_both]">
            {isPendingApproval ? (
              <FileText size={38} className="stroke-[2.5]" />
            ) : (
              <Check size={42} className="stroke-[3]" />
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          {isPendingApproval ? "Prescription Received & Order Reserved!" : "Order Confirmed Successfully!"}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed max-w-md mx-auto">
          {isPendingApproval 
            ? "Your doctor's prescription has been submitted to our licensed pharmacist team for clinical review. Your items are reserved in stock."
            : "Thank you for choosing MediQuick. Your generic medicine package has been scheduled for certified WHO-GMP packaging and fast courier dispatch."}
        </p>

        {/* Real Order Details Box (strictly verified data, no placeholders) */}
        <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-200 space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Order ID:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Order Date:</span>
            <span className="font-semibold text-slate-800">
              {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Total Amount:</span>
            <span className="font-bold text-slate-900">₹{order.total_amount} ({order.payment_method})</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Current Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
              isPendingApproval 
                ? "bg-amber-100 text-amber-800" 
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {order.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Live Delivery Progress Tracker */}
        <div className="mb-8 text-left">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">
            Order Fulfillment Pipeline
          </h3>
          <div className="space-y-4 relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 -z-0" />
            
            {[
              {
                label: "Order Placed",
                sub: "Cart validated & saved in database",
                done: true,
              },
              {
                label: isPendingApproval ? "Pharmacist Prescription Review" : "Clinical Verification",
                sub: isPendingApproval ? "In Progress: Pharmacist verifying registration & dosage" : "Prescription verified / OTC cleared",
                done: !isPendingApproval,
                current: isPendingApproval,
              },
              {
                label: "WHO-GMP Certified Packaging",
                sub: "Batch number & expiry double-checked",
                done: false,
              },
              {
                label: "Courier Dispatch & Delivery",
                sub: "Express delivery straight to your address",
                done: false,
              },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step.done
                    ? "bg-primary text-white"
                    : step.current
                    ? "bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}>
                  {step.done ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                </div>
                <div className="flex-1 text-xs">
                  <p className={`font-bold ${step.done || step.current ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Notice */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl mb-8 flex items-center gap-3 text-left">
          <PhoneCall size={18} className="text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-950">Questions about your medicine order?</p>
            <p className="text-emerald-800 text-[11px]">Contact our certified pharmacists at 1800-200-MEDI or reply to your order confirmation.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {orderId ? (
            <Link 
              href={`/orders/${orderId}`}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-bold hover:bg-primary-dark transition shadow-md text-xs sm:text-sm"
            >
              <span>Track Order &amp; View Details</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link 
              href="/orders" 
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-bold hover:bg-primary-dark transition shadow-md text-xs sm:text-sm"
            >
              <span>View My Orders</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <Link 
            href="/medicines" 
            className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 py-3.5 px-6 rounded-2xl font-bold hover:bg-slate-50 transition text-xs sm:text-sm"
          >
            <span>Continue Shopping</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-slate-50 min-h-screen py-12 flex items-center justify-center">
          <RefreshCw className="animate-spin text-primary w-8 h-8" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
