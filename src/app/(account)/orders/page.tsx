"use client";

import { Package, ChevronRight, ShoppingBag, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data.data || []);
      } catch (error) {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">My Orders</h2>
      
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No orders yet</h3>
            <p className="text-sm text-slate-500 mb-4">You haven&apos;t placed any orders yet.</p>
            <Link href="/medicines" className="inline-block px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl">
              Start Shopping
            </Link>
          </div>
        ) : orders.map((order) => {
          const isPaymentPending = order.payment_method === 'ONLINE' && 
            (order.payment_status === 'PENDING' || order.payment_status === 'FAILED') && 
            order.status !== 'CANCELLED';

          const handlePayNow = async () => {
            try {
              const rzpRes = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: order.id })
              });
              const rzpData = await rzpRes.json();
              if (!rzpRes.ok) throw new Error(rzpData.error || "Failed to create payment");

              const isLoaded = await new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = "https://checkout.razorpay.com/v1/checkout.js";
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
              });

              if (!isLoaded) throw new Error("Razorpay SDK failed to load. Are you online?");

              const options = {
                key: rzpData.key_id,
                amount: rzpData.amount,
                currency: rzpData.currency,
                name: "MediGo",
                description: `Order ${order.id}`,
                order_id: rzpData.razorpay_order_id,
                prefill: {
                  contact: order.address_snapshot?.phone || "",
                },
                handler: async function (response: any) {
                  try {
                    const verifyRes = await fetch("/api/payments/verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                      })
                    });
                    const verifyData = await verifyRes.json();
                    
                    if (verifyRes.ok && verifyData.success) {
                      toast.success("Payment successful!");
                      window.location.reload();
                    } else {
                      toast.error(verifyData.error || "Payment verification failed");
                    }
                  } catch (err) {
                    toast.error("Error verifying payment");
                  }
                },
                theme: { color: "#16a34a" }
              };

              const rzp1 = new (window as any).Razorpay(options);
              rzp1.on('payment.failed', function (response: any) {
                toast.error(response.error.description || "Payment failed");
              });
              rzp1.open();
            } catch (error: any) {
              toast.error(error.message);
            }
          };

          return (
            <div key={order.id} className="border border-slate-200 rounded-xl p-4 sm:p-6 hover:border-primary/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-900">OD{order.id.split('-')[0].toUpperCase()}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {order.status}
                    </span>
                    {isPaymentPending && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                        Payment pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold text-slate-700">Payment: </span>
                    <span className="text-slate-600">
                      {order.payment_method === 'COD' ? 'COD' : 
                       order.payment_status === 'PAID' ? 'Paid' : 
                       order.payment_status === 'FAILED' ? 'Failed' : 'Pending'}
                    </span>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                  <p className="font-bold text-slate-900">₹{order.total_amount}</p>
                  {isPaymentPending && (
                    <button 
                      onClick={handlePayNow}
                      className="mt-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Package size={18} className="text-slate-400" />
                  <span className="truncate max-w-[200px] sm:max-w-md">
                    {order.order_items?.map((i: any) => i.medicines?.name).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!order.order_items?.length) return;
                      let addedCount = 0;
                      let hasRx = false;
                      order.order_items.forEach((item: any) => {
                        if (item.medicines) {
                          useCartStore.getState().addItem(
                            {
                              id: item.medicine_id || item.medicines.id,
                              name: item.medicines.name,
                              brand: item.medicines.brand || "",
                              slug: item.medicines.slug || "",
                              composition: item.medicines.composition || "",
                              mrp: item.medicines.mrp || item.price,
                              price: item.price,
                              discountPercentage: 0,
                              prescriptionRequired: Boolean(item.medicines.prescription_required),
                              drugSchedule: item.medicines.drug_schedule || "OTC",
                              category: "General",
                              imageUrl: item.medicines.image_url || "",
                              stock: 50,
                              description: "",
                              directions: "",
                              sideEffects: "",
                              genericName: "",
                              images: [],
                              packSize: item.medicines.pack_size || "",
                              dosage: "",
                              manufacturer: "",
                              faqs: [],
                              tags: [],
                            },
                            item.quantity
                          );
                          addedCount++;
                          if (item.medicines.prescription_required) hasRx = true;
                        }
                      });
                      if (addedCount > 0) {
                        toast.success(`${addedCount} items re-added to cart!${hasRx ? " Note: Prescription required at checkout." : ""}`);
                        useCartStore.getState().openDrawer();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-green-50 hover:bg-green-100 border border-primary/20 rounded-lg transition"
                  >
                    <RotateCcw size={13} />
                    <span>Reorder</span>
                  </button>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    <span>View Details</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
