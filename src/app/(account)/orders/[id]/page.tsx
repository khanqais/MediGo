"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Package, 
  MapPin, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Printer, 
  RotateCcw, 
  XCircle, 
  AlertTriangle, 
  ArrowLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { siteConfig } from "@/config/site";

interface OrderItemData {
  id: string;
  medicine_id: string;
  quantity: number;
  price: number;
  total: number;
  medicine?: {
    id: string;
    name: string;
    brand: string;
    slug: string;
    composition: string;
    pack_size?: string | null;
    image_url?: string | null;
    prescription_required: boolean;
    drug_schedule: string;
    price: number;
    mrp: number;
  };
}

interface StatusHistoryItem {
  id: string;
  status: string;
  notes?: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  user_id: string;
  address_snapshot: Record<string, any>;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  prescription_id?: string | null;
  coupon_id?: string | null;
  coupon?: {
    code: string;
    discount: number;
    type?: string;
    value?: number;
  } | null;
  stock_restored?: boolean;
  created_at: string;
  updated_at: string;
  order_items: OrderItemData[];
  status_history: StatusHistoryItem[];
  prescription?: {
    id: string;
    status: string;
    url?: string | null;
    rejection_reason?: string | null;
    reviewed_at?: string | null;
    created_at: string;
  } | null;
}

const ORDER_STEPS = [
  { key: "PLACED", label: "Order Placed" },
  { key: "VERIFICATION", label: "Rx Scrutiny" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKED", label: "Packed" },
  { key: "DISPATCHED", label: "Shipped & Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${params.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOrder(json.data);
      } else {
        toast.error(json.error || "Failed to load order details");
      }
    } catch {
      toast.error("Network error fetching order");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Reorder functionality: adds items back into cart
  const handleReorder = () => {
    if (!order?.order_items?.length) return;

    let addedCount = 0;
    let rxItemsFound = false;

    order.order_items.forEach((item) => {
      if (item.medicine) {
        // Add to Zustand cart
        useCartStore.getState().addItem(
          {
            id: item.medicine.id,
            name: item.medicine.name,
            brand: item.medicine.brand,
            slug: item.medicine.slug,
            composition: item.medicine.composition,
            mrp: item.medicine.mrp,
            price: item.medicine.price,
            discountPercentage: 0,
            prescriptionRequired: item.medicine.prescription_required,
            drugSchedule: (item.medicine.drug_schedule as any) || "OTC",
            category: "General",
            imageUrl: item.medicine.image_url || "",
            stock: 50,
            description: "",
            directions: "",
            sideEffects: "",
            genericName: "",
            images: [],
            packSize: item.medicine.pack_size || "",
            dosage: "",
            manufacturer: "",
            faqs: [],
            tags: [],
          },
          item.quantity
        );
        addedCount++;
        if (item.medicine.prescription_required || item.medicine.drug_schedule === "H" || item.medicine.drug_schedule === "H1") {
          rxItemsFound = true;
        }
      }
    });

    if (addedCount > 0) {
      if (rxItemsFound) {
        toast.success(`${addedCount} items re-added to your cart! Note: Prescription items will require prescription selection at checkout.`);
      } else {
        toast.success(`${addedCount} items re-added to your cart!`);
      }
      useCartStore.getState().openDrawer();
    }
  };

  // Customer cancellation
  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order? Any reserved inventory will be restored.")) {
      return;
    }

    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to cancel order");
      }
    } catch {
      toast.error("Error communicating with server");
    } finally {
      setCancelling(false);
    }
  };

  // Pay Now for pending online orders
  const handlePayNow = async () => {
    if (!order) return;
    try {
      setPaying(true);
      const rzpRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
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
        name: "MediQuick",
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
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              toast.success("Payment successful!");
              fetchOrder();
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch {
            toast.error("Error verifying payment");
          }
        },
        theme: { color: "#16a34a" },
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-12 text-center">
        <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-12 text-center">
        <Package size={40} className="mx-auto text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested order does not exist or you do not have permission to view it.</p>
        <Link href="/orders" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">
          <ArrowLeft size={14} /> Back to My Orders
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "CANCELLED";
  const isCancellable = ["PENDING", "PENDING_PRESCRIPTION_APPROVAL", "CONFIRMED", "PROCESSING"].includes(order.status);
  const isPendingApproval = order.status === "PENDING_PRESCRIPTION_APPROVAL";
  const isPaymentPending = order.payment_method === "ONLINE" && (order.payment_status === "PENDING" || order.payment_status === "FAILED") && !isCancelled && !isPendingApproval;

  // Build stepper dynamically from status history
  const hasRxScrutiny = Boolean(order.prescription_id) || order.status_history?.some(h => h.status === "PENDING_PRESCRIPTION_APPROVAL");
  const orderSteps = [
    { key: "PENDING", label: "Order Placed" },
    ...(hasRxScrutiny ? [{ key: "PENDING_PRESCRIPTION_APPROVAL", label: "Rx Scrutiny" }] : []),
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PACKED", label: "Packed" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const cancelledHistory = order.status_history?.find(h => h.status === "CANCELLED");

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-2">
            <ArrowLeft size={14} /> Back to My Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isCancelled
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : order.status === "DELIVERED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isPendingApproval
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {order.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <Printer size={14} />
            <span>Tax Invoice</span>
          </button>

          <button
            onClick={handleReorder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary bg-green-50 hover:bg-green-100 border border-primary/20 rounded-xl transition shadow-xs"
          >
            <RotateCcw size={14} />
            <span>Reorder Items</span>
          </button>

          {isCancellable && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50"
            >
              <XCircle size={14} />
              <span>{cancelling ? "Cancelling..." : "Cancel Order"}</span>
            </button>
          )}

          {isPaymentPending && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl transition shadow-xs"
            >
              <CreditCard size={14} />
              <span>{paying ? "Opening..." : "Pay Now"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper / Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Live Order Stepper (From Status History)</h2>

        {isCancelled && (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-3 mb-6">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-rose-900">
                Order Cancelled {cancelledHistory?.created_at && `• ${new Date(cancelledHistory.created_at).toLocaleString("en-IN")}`}
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                {cancelledHistory?.notes || "Order cancelled. Reserved inventory stock has been returned to the pharmacy."}
                {order.payment_status === "REFUNDED" && " Refund has been initiated to your source payment method."}
              </p>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {orderSteps.map((step, idx) => {
              const historyItem = order.status_history?.find(
                (h) => h.status === step.key
              );
              const isCurrent = order.status === step.key;
              const isComplete = Boolean(historyItem) || isCurrent;

              return (
                <div key={step.key} className="flex flex-col items-center text-center relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition mb-2 z-10 ${
                      isCurrent
                        ? "bg-primary text-white ring-4 ring-green-100"
                        : isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <p className={`text-xs font-bold leading-tight ${isComplete ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  {historyItem && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(historyItem.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit History Timeline */}
        {order.status_history?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status Log History</h3>
            <div className="space-y-2">
              {order.status_history.map((h) => (
                <div key={h.id} className="text-xs flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span className="font-bold text-slate-800 uppercase">{h.status.replace(/_/g, " ")}</span>
                    {h.notes && <span className="text-slate-500">— {h.notes}</span>}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(h.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Address Snapshot + Prescription Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Address */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <MapPin size={16} className="text-primary" />
              <span>Delivery Address Snapshot</span>
            </div>
            <p className="font-bold text-sm text-slate-900">{order.address_snapshot?.full_name || order.address_snapshot?.name || "Recipient"}</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {order.address_snapshot?.address_line_1 || order.address_snapshot?.flat}
              {order.address_snapshot?.address_line_2 && `, ${order.address_snapshot.address_line_2}`}
              {order.address_snapshot?.locality && `, ${order.address_snapshot.locality}`}
              <br />
              {order.address_snapshot?.city}, {order.address_snapshot?.state} - {order.address_snapshot?.postal_code || order.address_snapshot?.pincode}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              📞 Phone: <strong>{order.address_snapshot?.phone || "N/A"}</strong>
            </p>
          </div>
        </div>

        {/* Prescription Verification Status */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <FileText size={16} className="text-amber-600" />
              <span>Prescription Scrutiny Status</span>
            </div>

            {order.prescription ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Uploaded Document</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      order.prescription.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : order.prescription.status === "REJECTED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {order.prescription.status}
                  </span>
                </div>

                {order.prescription.rejection_reason && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <strong>Rejection Reason:</strong> {order.prescription.rejection_reason}
                  </p>
                )}

                {order.prescription.status === "PENDING" && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    A licensed pharmacist is reviewing your prescription. Once verified, order moves to confirmed.
                  </p>
                )}

                {order.prescription.url && (
                  <a
                    href={order.prescription.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition mt-1"
                  >
                    <Eye size={13} />
                    <span>View Attached Prescription</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mt-2">
                Over-The-Counter (OTC) Order. No doctor prescription was required for this purchase.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Ordered Medicines ({order.order_items?.length || 0})
        </h2>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {order.order_items?.map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Package className="text-slate-400" size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">
                    {item.medicine?.name || "Medicine Item"}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {item.medicine?.brand} • {item.medicine?.composition}
                  </p>
                  {item.medicine?.drug_schedule && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      Sched {item.medicine.drug_schedule}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-slate-900">₹{item.total}</p>
                <p className="text-xs text-slate-400">
                  {item.quantity} × ₹{item.price}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-xs text-slate-500 space-y-1">
            <p>Payment Method: <strong className="text-slate-800">{order.payment_method}</strong></p>
            <p>Payment Status: <strong className="text-slate-800">{order.payment_status}</strong></p>
            <p>GST Inclusive: <strong className="text-slate-800">5% / 12% statutory pharmacy tax</strong></p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{order.subtotal}</span>
            </div>
            {order.coupon ? (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Applied ({order.coupon.code}):</span>
                <span>-₹{order.coupon.discount}</span>
              </div>
            ) : order.discount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span>-₹{order.discount}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>Standard Express Delivery:</span>
              <span>{order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee}`}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Paid:</span>
              <span className="text-primary">₹{order.total_amount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Actions */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-700 uppercase">Tax Invoice Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-primary text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-xs text-slate-800 space-y-6 print:p-0">
              {/* Invoice Header */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{siteConfig.compliance.registeredEntity}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{siteConfig.name} Licensed Online Pharmacy</p>
                  <p className="text-[11px] text-slate-500">
                    Drug License No: <strong>{siteConfig.compliance.drugLicenseNumber}</strong> ({siteConfig.compliance.issuingAuthority})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    GSTIN: <strong>{siteConfig.compliance.gstNumber}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Support: {siteConfig.compliance.pharmacistAssistanceContact} • {siteConfig.compliance.supportEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-900">TAX INVOICE</p>
                  <p className="font-mono text-xs font-semibold">INV-{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[11px] text-slate-500">{new Date(order.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* Patient / Customer Details */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="font-bold uppercase text-[10px] text-slate-400">Billed &amp; Delivered To:</p>
                  <p className="font-bold text-slate-900 mt-1">{order.address_snapshot?.full_name || order.address_snapshot?.name || "Customer"}</p>
                  <p className="text-[11px] text-slate-600">
                    {order.address_snapshot?.address_line_1 || order.address_snapshot?.flat}, {order.address_snapshot?.city}, {order.address_snapshot?.state} - {order.address_snapshot?.postal_code || order.address_snapshot?.pincode}
                  </p>
                  <p className="text-[11px] text-slate-600">📞 {order.address_snapshot?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold uppercase text-[10px] text-slate-400">Payment Summary:</p>
                  <p className="text-[11px] mt-1">Method: <strong>{order.payment_method}</strong></p>
                  <p className="text-[11px]">Payment Status: <strong className="uppercase">{order.payment_status}</strong></p>
                  <p className="text-[11px]">Fulfillment Status: <strong className="uppercase">{order.status}</strong></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 font-bold uppercase text-[10px] text-slate-500">
                    <th className="py-2">Item Description</th>
                    <th className="py-2">Sched</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.order_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2">
                        <span className="font-bold text-slate-900">{item.medicine?.name}</span>
                        <span className="block text-[10px] text-slate-500">{item.medicine?.composition}</span>
                      </td>
                      <td className="py-2 font-mono text-[10px]">{item.medicine?.drug_schedule || "OTC"}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">₹{item.price}</td>
                      <td className="py-2 text-right font-semibold">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Invoice Totals */}
              <div className="pt-4 border-t-2 border-slate-800 space-y-1 text-right text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal}</span>
                </div>
                {order.coupon ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon Discount ({order.coupon.code}):</span>
                    <span>-₹{order.coupon.discount}</span>
                  </div>
                ) : order.discount > 0 ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{order.discount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>Delivery Charges:</span>
                  <span>{order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee}`}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total (INR):</span>
                  <span>₹{order.total_amount}</span>
                </div>
              </div>

              {/* Statutory Disclaimer */}
              <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-tight">
                <p>1. Certified medicines dispensed by registered pharmacists under Form 20/21 of Drugs &amp; Cosmetics Rules 1945.</p>
                <p>2. Keep medications stored below 25°C in a dry place protected from direct sunlight.</p>
                <p>3. This is a computer-generated tax invoice and requires no physical signature.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
