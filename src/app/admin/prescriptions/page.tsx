"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Prescription } from "@/types/prescription";

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Modal states
  const [previewRx, setPreviewRx] = useState<Prescription | null>(null);
  const [rejectingRx, setRejectingRx] = useState<Prescription | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/prescriptions?status=${statusFilter}&page=${page}&limit=${limit}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPrescriptions(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      } else {
        toast.error(json.error || "Failed to load prescriptions");
      }
    } catch {
      toast.error("Network error fetching prescriptions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleApprove = async (rx: Prescription) => {
    if (!confirm(`Are you sure you want to APPROVE this prescription for ${rx.user?.full_name || "the patient"}? Linked orders will be moved to CONFIRMED.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/prescriptions/${rx.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        fetchPrescriptions();
      } else {
        toast.error(json.error || "Failed to approve prescription");
      }
    } catch (err) {
      toast.error("Error communicating with server");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRx) return;

    if (!rejectionReason.trim()) {
      toast.error("A mandatory rejection reason is required.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/prescriptions/${rejectingRx.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          reason: rejectionReason.trim(),
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        setRejectingRx(null);
        setRejectionReason("");
        fetchPrescriptions();
      } else {
        toast.error(json.error || "Failed to reject prescription");
      }
    } catch (err) {
      toast.error("Error communicating with server");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = prescriptions.filter((rx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatches = rx.user?.full_name?.toLowerCase().includes(q);
    const emailMatches = rx.user?.email?.toLowerCase().includes(q);
    const orderMatches = rx.order_id?.toLowerCase().includes(q);
    return nameMatches || emailMatches || orderMatches;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pharmacist Prescription Scrutiny
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mandatory Schedule H/H1 clinical verification before order dispatch.
          </p>
        </div>

        <button
          onClick={fetchPrescriptions}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "Pending Verification", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Rejected", value: "REJECTED" },
            { label: "All Prescriptions", value: "ALL" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, email, order..."
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            Loading prescriptions for review...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText size={36} className="mx-auto mb-2 text-slate-300" />
            <h3 className="font-semibold text-slate-800 text-base">No Prescriptions Found</h3>
            <p className="text-sm text-slate-400 mt-1">
              {statusFilter === "PENDING"
                ? "All uploaded prescriptions have been reviewed by pharmacists."
                : "No records matching your current filter criteria."}
            </p>
          </div>
        ) : (
          filtered.map((rx) => {
            const isPending = rx.status === "PENDING";
            const isApproved = rx.status === "APPROVED";
            const isRejected = rx.status === "REJECTED";

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Patient & Order info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isApproved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {rx.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      Uploaded on {new Date(rx.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Patient Details</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {rx.user?.full_name || "Patient Name Not Provided"}
                      </p>
                      <p className="text-xs text-slate-500">{rx.user?.email}</p>
                      {rx.user?.phone && (
                        <p className="text-xs text-slate-500">📞 {rx.user.phone}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Linked Order</p>
                      {rx.order ? (
                        <div className="mt-0.5">
                          <p className="text-sm font-mono font-semibold text-slate-800">
                            #{rx.order.id.slice(0, 8)}... (₹{rx.order.total_amount})
                          </p>
                          <p className="text-xs text-slate-500">
                            Payment: {rx.order.payment_method} ({rx.order.payment_status})
                          </p>
                          <span className="inline-block text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded mt-0.5">
                            Order {rx.order.status}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          Prescription uploaded independently (no active checkout linked)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rejection Note if rejected */}
                  {isRejected && rx.rejection_reason && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
                      <strong>Rejection Reason:</strong> {rx.rejection_reason}
                    </div>
                  )}

                  {/* Review timestamp */}
                  {rx.reviewed_at && (
                    <p className="text-[11px] text-slate-400">
                      Reviewed on {new Date(rx.reviewed_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap md:flex-col items-stretch md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {rx.url && (
                    <button
                      onClick={() => setPreviewRx(rx)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      <Eye size={14} />
                      <span>Inspect Document</span>
                    </button>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(rx)}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve Rx</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingRx(rx);
                          setRejectionReason("");
                        }}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        <span>Reject Rx</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-900">{prescriptions.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> prescriptions (Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>)
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

      {/* Prescription Preview Modal */}
      {previewRx && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Prescription Scrutiny Preview
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {previewRx.user?.full_name || "Patient"} • Uploaded: {new Date(previewRx.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewRx.url && (
                  <a
                    href={previewRx.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"
                  >
                    <span>Full Tab</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  onClick={() => setPreviewRx(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-900/5 flex items-center justify-center min-h-[400px]">
              {previewRx.url?.includes(".pdf") ? (
                <iframe
                  src={previewRx.url}
                  className="w-full h-[65vh] rounded-lg border border-slate-200 bg-white"
                  title="Prescription PDF"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewRx.url || ""}
                  alt="Prescription document"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldAlert size={14} className="text-amber-500" />
                <span>Verify Doctor&apos;s Reg No., Clinic Name, Patient Name, and Date before approving.</span>
              </span>
              <button
                onClick={() => setPreviewRx(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 font-semibold rounded-lg text-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectingRx && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertCircle size={20} />
              <h3 className="font-bold text-slate-900 text-base">Reject Prescription</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Indian pharmacy regulations require a mandatory clinical reason for rejection. This reason will be logged in the audit trail and communicated to the patient.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Prescription illegible, expired (dated beyond 6 months), doctor registration number missing, or Schedule X substance not allowed online."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-rose-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                ⚠️ Notice: If an order is attached to this prescription, it will be marked CANCELLED and reserved inventory stock will be restored automatically.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRx(null);
                    setRejectionReason("");
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
