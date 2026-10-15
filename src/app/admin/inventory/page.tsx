"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Plus, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { getStock } from "@/lib/inventory";

interface Batch {
  id: string;
  medicine_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  mfg_date: string;
}

interface Medicine {
  id: string;
  name: string;
  brand: string;
  inventory: { stock_quantity: number; reorder_level: number };
}

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingBatch, setAdjustingBatch] = useState<Batch | null>(null);
  const [adjustData, setAdjustData] = useState({ quantityDelta: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [addBatchData, setAddBatchData] = useState({ batchNumber: "", mfgDate: "", expiryDate: "", quantity: "0" });
  const [addingBatch, setAddingBatch] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  const loadMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/medicines", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      if (search.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setMedicines(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch {
      toast.error("Failed to load inventory medicines");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const loadBatches = async (medId: string) => {
    const res = await fetch(`/api/admin/inventory/batches?medicine_id=${medId}`);
    const data = await res.json();
    if (data.success) {
      setBatches(data.data);
    }
  };

  const handleSelectMed = (med: Medicine) => {
    setSelectedMed(med);
    loadBatches(med.id);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingBatch) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/api/admin/inventory/batches/${adjustingBatch.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityDelta: Number(adjustData.quantityDelta),
          reason: adjustData.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stock adjusted");
        setAdjustModalOpen(false);
        setAdjustData({ quantityDelta: "", reason: "" });
        loadBatches(selectedMed!.id);
        // We'd ideally reload medicine list too for correct root stock
      } else {
        toast.error(data.error || "Failed to adjust");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setAdjusting(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    setAddingBatch(true);
    try {
      const res = await fetch("/api/admin/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: selectedMed.id,
          batchNumber: addBatchData.batchNumber,
          mfgDate: addBatchData.mfgDate,
          expiryDate: addBatchData.expiryDate,
          quantity: Number(addBatchData.quantity),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Batch added");
        setAddBatchModalOpen(false);
        setAddBatchData({ batchNumber: "", mfgDate: "", expiryDate: "", quantity: "0" });
        loadBatches(selectedMed.id);
      } else {
        toast.error(data.error || "Failed to add batch");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setAddingBatch(false);
    }
  };

  const filtered = medicines.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const getExpiryColor = (dateStr: string) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsDiff < 0) return "bg-rose-100 text-rose-800 border-rose-200"; // Expired
    if (monthsDiff < 3) return "bg-amber-100 text-amber-800 border-amber-200"; // Expiring within buffer (3 months)
    return "bg-emerald-100 text-emerald-800 border-emerald-200"; // Good
  };

  return (
    <div className="p-4 sm:p-8 flex flex-col md:flex-row gap-6 h-full">
      {/* Left sidebar: Medicines list */}
      <div className="w-full md:w-1/3 flex flex-col h-[calc(100vh-8rem)]">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Inventory</h1>
        <p className="text-slate-500 text-sm mb-4">Manage FEFO batches and write-offs</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 text-sm text-slate-500 text-center">Loading...</div>
          ) : (
            filtered.map((med) => (
              <button
                key={med.id}
                onClick={() => handleSelectMed(med)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition ${
                  selectedMed?.id === med.id ? "bg-emerald-50 border-l-4 border-l-emerald-500" : ""
                }`}
              >
                <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                <div className="text-xs text-slate-500 mb-1">{med.brand}</div>
                <div className={`text-xs font-bold ${getStock(med) <= ((med.inventory as any)?.reorder_level ?? 10) ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {getStock(med)} in stock
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-2 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-500">
          <span>
            Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({totalCount})
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right side: Batches */}
      <div className="w-full md:w-2/3 flex flex-col">
        {selectedMed ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMed.name}</h2>
                <p className="text-sm text-slate-500">Total Stock: {getStock(selectedMed)}</p>
              </div>
              <button
                onClick={() => setAddBatchModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Plus size={16} /> Add Batch
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {batches.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No batches found for this medicine.</div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm mb-1">Batch: {batch.batch_number}</div>
                        <div className="text-xs text-slate-600 flex gap-4">
                          <span>Mfg: {new Date(batch.mfg_date).toLocaleDateString()}</span>
                          <span className={`px-2 py-0.5 rounded border font-semibold ${getExpiryColor(batch.expiry_date)}`}>
                            Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 mb-1">{batch.quantity} units</div>
                        <button
                          onClick={() => {
                            setAdjustingBatch(batch);
                            setAdjustData({ quantityDelta: "", reason: "" });
                            setAdjustModalOpen(true);
                          }}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          Adjust / Write-off
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
            Select a medicine to manage its batches
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && adjustingBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6">
            <h3 className="font-bold text-slate-900 mb-4">Adjust Stock: {adjustingBatch.batch_number}</h3>
            <p className="text-xs text-slate-500 mb-4 bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-800">
              <AlertTriangle className="inline mr-1" size={14} />
              Admins and Pharmacists can adjust stock.
            </p>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Quantity: {adjustingBatch.quantity}</label>
                <div className="text-xs text-slate-500 mb-2">Delta (e.g. -5 to write off, 10 to add)</div>
                <input
                  type="number"
                  required
                  value={adjustData.quantityDelta}
                  onChange={(e) => setAdjustData({ ...adjustData, quantityDelta: e.target.value })}
                  placeholder="-5"
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason (Required) *</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="e.g. Expired stock"
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {addBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6">
            <h3 className="font-bold text-slate-900 mb-4">Add Batch</h3>
            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  value={addBatchData.batchNumber}
                  onChange={(e) => setAddBatchData({ ...addBatchData, batchNumber: e.target.value })}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturing Date *</label>
                <input
                  type="date"
                  required
                  value={addBatchData.mfgDate}
                  onChange={(e) => setAddBatchData({ ...addBatchData, mfgDate: e.target.value })}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={addBatchData.expiryDate}
                  onChange={(e) => setAddBatchData({ ...addBatchData, expiryDate: e.target.value })}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={addBatchData.quantity}
                  onChange={(e) => setAddBatchData({ ...addBatchData, quantity: e.target.value })}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBatchModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingBatch}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
