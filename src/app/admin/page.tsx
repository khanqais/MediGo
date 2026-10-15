"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  IndianRupee, 
  FileText, 
  AlertTriangle, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "sonner";

interface DashboardData {
  todayOrdersCount: number;
  todayRevenue: number;
  pendingRxCount: number;
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    medicineId: string;
    name: string;
    brand: string;
    slug: string;
    schedule: string;
    composition: string;
    stockQuantity: number;
    reorderLevel: number;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "Failed to load dashboard data");
      }
    } catch (err) {
      toast.error("Network error fetching dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pharmacy Control Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time fulfillment metrics, prescription scrutiny, and inventory health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/medicines"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-xs shadow-emerald-600/20"
          >
            <Plus size={16} />
            <span>Add Medicine</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Orders</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1.5">
              {loading ? "..." : data?.todayOrdersCount ?? 0}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Incoming customer orders</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1.5 flex items-center">
              <span>₹</span>
              <span>{loading ? "..." : (data?.todayRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Delivered orders, plus paid online orders</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={24} />
          </div>
        </div>

        {/* Pending Prescriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Rx</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1.5">
              {loading ? "..." : data?.pendingRxCount ?? 0}
            </h3>
            <Link
              href="/admin/prescriptions"
              className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1 mt-1"
            >
              <span>Verify Prescriptions</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1.5">
              {loading ? "..." : data?.lowStockCount ?? 0}
            </h3>
            <Link
              href="/admin/medicines"
              className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 mt-1"
            >
              <span>Replenish Stock</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert List & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Low Stock Items */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="font-bold text-slate-900 text-base">Low Stock Medicines</h2>
            </div>
            <Link
              href="/admin/medicines"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading inventory...</div>
            ) : !data?.lowStockItems?.length ? (
              <div className="py-8 text-center text-sm text-emerald-600 font-medium">
                ✓ All medicines are adequately stocked
              </div>
            ) : (
              data.lowStockItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 truncate">{item.brand} • {item.composition}</p>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                      item.schedule === "H" || item.schedule === "H1"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : item.schedule === "X"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      Sched {item.schedule}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-rose-600">
                      {item.stockQuantity} left
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Reorder: {item.reorderLevel}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-base">Recent Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Manage Orders
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading orders...
                    </td>
                  </tr>
                ) : !data?.recentOrders?.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent orders found.
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map((order) => {
                    const statusColor: Record<string, string> = {
                      PENDING_PRESCRIPTION_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
                      CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
                      PACKED: "bg-indigo-50 text-indigo-700 border-indigo-200",
                      SHIPPED: "bg-purple-50 text-purple-700 border-purple-200",
                      OUT_FOR_DELIVERY: "bg-sky-50 text-sky-700 border-sky-200",
                      DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
                      PENDING: "bg-slate-50 text-slate-700 border-slate-200",
                    };

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 font-mono text-xs font-semibold text-slate-900">
                          #{order.id.slice(0, 8)}...
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-slate-900 truncate max-w-[140px]">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[140px]">
                            {order.customerEmail}
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-slate-900">
                          ₹{order.totalAmount}
                        </td>
                        <td className="py-3 text-xs font-medium text-slate-600">
                          {order.paymentMethod}
                        </td>
                        <td className="py-3">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[order.status] || "bg-slate-100 text-slate-700"}`}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/admin/orders?search=${order.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
