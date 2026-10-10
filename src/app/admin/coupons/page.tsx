"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  is_active: boolean;
  usage_count: number;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FLAT",
    value: "",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    validFrom: "",
    validTo: "",
    usageLimit: "",
    perUserLimit: "",
    isActive: true,
  });

  const fetchCoupons = () => {
    setLoading(true);
    fetch("/api/admin/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCoupons(data.data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Coupon status updated");
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c)));
    } else {
      toast.error(data.error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        value: Number(formData.value),
        minOrderAmount: Number(formData.minOrderAmount),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        perUserLimit: formData.perUserLimit ? Number(formData.perUserLimit) : null,
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null,
      };

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Coupon created successfully");
        setIsModalOpen(false);
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to create coupon");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Coupons Management</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              code: "",
              type: "PERCENTAGE",
              value: "",
              minOrderAmount: "0",
              maxDiscountAmount: "",
              validFrom: "",
              validTo: "",
              usageLimit: "",
              perUserLimit: "",
              isActive: true,
            });
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} /> Add Coupon
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Value</th>
                <th className="p-4 font-semibold">Min Order</th>
                <th className="p-4 font-semibold">Max Discount</th>
                <th className="p-4 font-semibold">Validity</th>
                <th className="p-4 font-semibold">Usage</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{c.code}</td>
                  <td className="p-4">{c.type}</td>
                  <td className="p-4 font-bold text-emerald-600">
                    {c.type === "PERCENTAGE" ? `${c.value}%` : `₹${c.value}`}
                  </td>
                  <td className="p-4">₹{c.min_order_amount}</td>
                  <td className="p-4">{c.max_discount_amount ? `₹${c.max_discount_amount}` : "None"}</td>
                  <td className="p-4 text-xs">
                    <div>From: {c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "Anytime"}</div>
                    <div>To: {c.valid_to ? new Date(c.valid_to).toLocaleDateString() : "Never"}</div>
                  </td>
                  <td className="p-4">
                    {c.usage_count} {c.usage_limit ? `/ ${c.usage_limit}` : ""}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {c.is_active ? "ACTIVE" : "DISABLED"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(c.id, c.is_active)}
                      className={`text-xs font-bold ${
                        c.is_active ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                      }`}
                    >
                      {c.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No coupons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Create New Coupon</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER50"
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 uppercase"
                    pattern="[A-Z0-9_-]+"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "PERCENTAGE" | "FLAT" })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g. 10 or 150"
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              {formData.type === "PERCENTAGE" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="e.g. 200 (Optional)"
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valid To</label>
                  <input
                    type="datetime-local"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="e.g. 1000 (Optional)"
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Per User Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                    placeholder="e.g. 1 (Optional)"
                    className="w-full text-sm p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700">
                  Coupon is Active
                </label>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
