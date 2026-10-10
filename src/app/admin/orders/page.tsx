"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Package, 
  User, 
  MapPin, 
  FileText, 
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { DbOrderStatus } from "@/types/order";

const STATUS_TRANSITIONS: Record<DbOrderStatus, DbOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  PENDING_PRESCRIPTION_APPROVAL: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PACKED", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_BADGE_STYLE: Record<string, string> = {
  PENDING: "bg-slate-50 text-slate-700 border-slate-200",
  PENDING_PRESCRIPTION_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-purple-50 text-purple-700 border-purple-200",
  PACKED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 border-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Inspect Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/orders", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (search.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (res.ok && json.success) {
        setOrders(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      } else {
        toast.error(json.error || "Failed to load orders");
      }
    } catch {
      toast.error("Network error fetching orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadOrderDetail = async (id: string) => {
    try {
      setSelectedOrderId(id);
      setDetailsLoading(true);
      setUpdateNotes("");
      const res = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOrderDetails(json.data);
      } else {
        toast.error(json.error || "Failed to load order details");
      }
    } catch (err) {
      toast.error("Network error loading order details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (targetStatus: DbOrderStatus) => {
    if (!selectedOrderId) return;

    if (
      targetStatus === "CANCELLED" &&
      !confirm("Are you sure you want to cancel this order? Reserved stock will be automatically restored.")
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          notes: updateNotes.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        loadOrderDetail(selectedOrderId);
        fetchOrders();
      } else {
        toast.error(json.error || "Failed to update order status");
      }
    } catch (err) {
      toast.error("Failed to communicate with server");
    } finally {
      setActionLoading(false);
    }
  };

  const currentStatus = orderDetails?.status as DbOrderStatus | undefined;
  const allowedTransitions = currentStatus ? STATUS_TRANSITIONS[currentStatus] || [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Order Fulfillment Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track pharmacy workflow, packaging, dispatch, and delivery state transitions.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { label: "All Orders", value: "ALL" },
            { label: "Pending Rx", value: "PENDING_PRESCRIPTION_APPROVAL" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Packed", value: "PACKED" },
            { label: "Shipped", value: "SHIPPED" },
            { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
            { label: "Delivered", value: "DELIVERED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
              placeholder="Search by order ID, customer name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500"
            />
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold">Total</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900">
                      #{order.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-[150px]">
                        {order.profiles?.full_name || "Customer"}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[150px]">
                        {order.profiles?.phone || order.profiles?.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-900">{order.payment_method}</div>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                          order.payment_status === "PAID"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{order.total_amount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          STATUS_BADGE_STYLE[order.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => loadOrderDetail(order.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-xs"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{orders.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> orders (Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>)
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={page >= totalPages || loading} 
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Order Details & Workflow Drawer Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-base">
                    Order #{selectedOrderId.slice(0, 8)}
                  </span>
                  {orderDetails && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_BADGE_STYLE[orderDetails.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {orderDetails.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {orderDetails?.created_at ? new Date(orderDetails.created_at).toLocaleString("en-IN") : "..."}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedOrderId(null);
                  setOrderDetails(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {detailsLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading full order record...
                </div>
              ) : !orderDetails ? (
                <div className="py-16 text-center text-slate-400">Order not found</div>
              ) : (
                <>
                  {/* Customer & Address Snapshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                        <User size={14} />
                        <span>Customer Profile</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {orderDetails.profiles?.full_name || orderDetails.address_snapshot?.name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{orderDetails.profiles?.email}</p>
                      <p className="text-xs text-slate-600">
                        📞 {orderDetails.address_snapshot?.phone || orderDetails.profiles?.phone || "No phone"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                        <MapPin size={14} />
                        <span>Delivery Address Snapshot</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {orderDetails.address_snapshot?.address_line_1 || orderDetails.address_snapshot?.flat}
                        {orderDetails.address_snapshot?.address_line_2 && `, ${orderDetails.address_snapshot.address_line_2}`}
                        {orderDetails.address_snapshot?.area && `, ${orderDetails.address_snapshot.area}`}
                        <br />
                        {orderDetails.address_snapshot?.city}, {orderDetails.address_snapshot?.state} - {orderDetails.address_snapshot?.postal_code || orderDetails.address_snapshot?.pincode}
                        {orderDetails.address_snapshot?.landmark && (
                          <span className="block text-slate-500 mt-0.5">
                            Landmark: {orderDetails.address_snapshot.landmark}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Prescription Section if linked */}
                  {orderDetails.prescription && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-900 uppercase">
                            Doctor Prescription Attached
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Verification Status: <strong className="uppercase">{orderDetails.prescription.status}</strong>
                          </p>
                        </div>
                      </div>
                      {orderDetails.prescription.url && (
                        <a
                          href={orderDetails.prescription.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-bold bg-white text-amber-800 border border-amber-300 rounded-xl hover:bg-amber-50"
                        >
                          View Rx
                        </a>
                      )}
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Order Items ({orderDetails.items?.length || 0})
                    </h4>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {orderDetails.items?.map((item: any) => (
                        <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.medicine?.name || "Medicine"}</p>
                            <p className="text-xs text-slate-400">
                              {item.medicine?.brand} • {item.medicine?.pack_size || "Standard pack"}
                            </p>
                            {item.medicine?.drug_schedule && (
                              <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mt-1">
                                Schedule {item.medicine.drug_schedule}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">₹{item.total}</p>
                            <p className="text-xs text-slate-400">
                              {item.quantity} × ₹{item.price}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 p-4 bg-slate-50 rounded-2xl flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <span>Subtotal: ₹{orderDetails.subtotal}</span> •{" "}
                        <span>Delivery: ₹{orderDetails.delivery_fee}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        Total Amount: ₹{orderDetails.total_amount}
                      </div>
                    </div>
                  </div>

                  {/* Validated State Machine Transitions */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Advance Workflow State (State Machine)
                    </h4>
                    <p className="text-xs text-slate-300 mb-4">
                      Current state: <strong className="text-white uppercase">{currentStatus?.replace(/_/g, " ")}</strong>.
                      Select the next valid state according to standard operating procedures.
                    </p>

                    {allowedTransitions.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-800 text-xs text-slate-400 text-center">
                        This order is in a terminal state ({currentStatus}). No further transitions allowed.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={updateNotes}
                          onChange={(e) => setUpdateNotes(e.target.value)}
                          placeholder="Optional notes for status update (e.g. Courier tracking ID, packaging bay number)..."
                          className="w-full text-xs p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 placeholder-slate-500 focus:outline-emerald-500"
                        />

                        <div className="flex flex-wrap gap-2 pt-1">
                          {allowedTransitions.map((nextState) => {
                            const isCancel = nextState === "CANCELLED";
                            return (
                              <button
                                key={nextState}
                                onClick={() => handleStatusChange(nextState)}
                                disabled={actionLoading}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 ${
                                  isCancel
                                    ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                                }`}
                              >
                                <span>Move to {nextState.replace(/_/g, " ")}</span>
                                <ArrowRight size={14} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audit Trail: Status History */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Fulfillment Audit Trail ({orderDetails.status_history?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {!orderDetails.status_history?.length ? (
                        <p className="text-xs text-slate-400 italic">No transition logs recorded yet.</p>
                      ) : (
                        orderDetails.status_history.map((h: any) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-800 uppercase">{h.status.replace(/_/g, " ")}</span>
                              {h.notes && <span className="text-slate-600 ml-2">— {h.notes}</span>}
                            </div>
                            <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(h.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
