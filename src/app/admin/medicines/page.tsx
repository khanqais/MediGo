"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Pill, 
  Search, 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download, 
  FileSpreadsheet, 
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { DrugSchedule } from "@/types/medicine";
import { getStock, getInventory } from "@/lib/inventory";

interface MedicineItem {
  id: string;
  name: string;
  slug: string;
  brand: string;
  generic_name?: string | null;
  composition: string;
  price: number;
  mrp: number;
  discount_percentage: number;
  drug_schedule: DrugSchedule;
  prescription_required: boolean;
  manufacturer?: string | null;
  pack_size?: string | null;
  dosage?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  inventory?: {
    stock_quantity: number;
    reorder_level: number;
  } | null;
}

interface RowError {
  row: number;
  name?: string;
  errors: string[];
}

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    brand: "",
    genericName: "",
    composition: "",
    mrp: "",
    price: "",
    batchQuantity: "50",
      batchNumber: "",
      expiryDate: "",
    reorderLevel: "10",
    drugSchedule: "OTC" as DrugSchedule,
    manufacturer: "",
    packSize: "",
    dosage: "",
    description: "",
    imageUrl: "",
    isActive: true,
  });

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    errors: RowError[];
    samplePreview: any[];
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/medicines", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      if (scheduleFilter !== "ALL") url.searchParams.set("schedule", scheduleFilter);
      if (activeFilter !== "ALL") url.searchParams.set("active", activeFilter);
      if (search.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (res.ok && json.success) {
        setMedicines(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      } else {
        toast.error(json.error || "Failed to load medicines");
      }
    } catch {
      toast.error("Network error fetching medicines");
    } finally {
      setLoading(false);
    }
  }, [scheduleFilter, activeFilter, search, page]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const openAddModal = () => {
    setEditingMed(null);
    setFormErrors({});
    setFormData({
      name: "",
      slug: "",
      brand: "",
      genericName: "",
      composition: "",
      mrp: "",
      price: "",
      batchQuantity: "50",
      batchNumber: "",
      expiryDate: "",
      reorderLevel: "10",
      drugSchedule: "OTC",
      manufacturer: "",
      packSize: "",
      dosage: "",
      description: "",
      imageUrl: "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (med: MedicineItem) => {
    setEditingMed(med);
    setFormErrors({});
    setFormData({
      name: med.name,
      slug: med.slug,
      brand: med.brand,
      genericName: med.generic_name || "",
      composition: med.composition,
      mrp: String(med.mrp),
      price: String(med.price),
      batchQuantity: "0", // Editing existing medicine requires separate batch adjustment
        batchNumber: "",
        expiryDate: "",
      reorderLevel: String(getInventory(med)?.reorder_level ?? 10),
      drugSchedule: med.drug_schedule || "OTC",
      manufacturer: med.manufacturer || "",
      packSize: med.pack_size || "",
      dosage: med.dosage || "",
      description: med.description || "",
      imageUrl: med.image_url || "",
      isActive: med.is_active,
    });
    setModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingMed ? prev.slug : slug,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Client validation
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Medicine name is required";
    if (!formData.slug.trim()) errors.slug = "Slug is required";
    if (!formData.brand.trim()) errors.brand = "Brand is required";
    if (!formData.composition.trim()) errors.composition = "Composition / Salt is required";

    const mrp = Number(formData.mrp);
    const price = Number(formData.price);
    const batchQuantity = Number(formData.batchQuantity);
      const batchNumber = formData.batchNumber;
      const expiryDate = formData.expiryDate;
    const reorderLevel = Number(formData.reorderLevel);

    if (isNaN(mrp) || mrp <= 0) errors.mrp = "Valid MRP is required";
    if (isNaN(price) || price <= 0) errors.price = "Valid price is required";
    if (price > mrp) errors.price = "Price cannot exceed MRP";
    if (isNaN(batchQuantity) || batchQuantity < 0) errors.batchQuantity = "Quantity must be 0 or more";
      if (batchQuantity > 0 && !batchNumber) errors.batchNumber = "Batch Number is required";
      if (batchQuantity > 0 && !expiryDate) errors.expiryDate = "Expiry Date is required";
    if (isNaN(reorderLevel) || reorderLevel < 0) errors.reorderLevel = "Reorder level must be 0 or more";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix form validation errors");
      return;
    }

    try {
      setFormSubmitting(true);
      const url = editingMed
        ? `/api/admin/medicines/${editingMed.id}`
        : "/api/admin/medicines";
      const method = editingMed ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          brand: formData.brand.trim(),
          genericName: formData.genericName.trim(),
          composition: formData.composition.trim(),
          mrp,
          price,
          batchQuantity,
            batchNumber,
            expiryDate,
          reorderLevel,
          drugSchedule: formData.drugSchedule,
          manufacturer: formData.manufacturer.trim(),
          packSize: formData.packSize.trim(),
          dosage: formData.dosage.trim(),
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          isActive: formData.isActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setModalOpen(false);
        fetchMedicines();
      } else {
        toast.error(json.error || "Failed to save medicine");
      }
    } catch (err) {
      toast.error("Error communicating with server");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (med: MedicineItem) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${med.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/medicines/${med.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        fetchMedicines();
      } else {
        toast.error(json.error || "Failed to delete medicine");
      }
    } catch (err) {
      toast.error("Error communicating with server");
    }
  };

  // CSV Parsing & Dry-Run
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvParsing(true);
    setCsvPreviewData(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("CSV file must contain a header row and at least one data row");
        setCsvParsing(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle simple CSV splitting
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const rowObj: Record<string, any> = {};

        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });

        parsed.push({
          name: rowObj.name,
          slug: rowObj.slug,
          brand: rowObj.brand,
          composition: rowObj.composition || rowObj.salt,
          mrp: rowObj.mrp,
          price: rowObj.price,
          stock: rowObj.stock,
          batch_number: rowObj.batch_number,
          expiry_date: rowObj.expiry_date,
          drug_schedule: rowObj.drug_schedule || rowObj.schedule || "OTC",
          manufacturer: rowObj.manufacturer,
          pack_size: rowObj.pack_size,
          dosage: rowObj.dosage,
          description: rowObj.description,
        });
      }

      setParsedRows(parsed);

      // Call bulk API in dry-run mode
      const res = await fetch("/api/admin/medicines/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, rows: parsed }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCsvPreviewData(json);
      } else {
        toast.error(json.error || "CSV dry-run validation failed");
      }
    } catch (err) {
      toast.error("Error reading CSV file");
    } finally {
      setCsvParsing(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!parsedRows.length) return;

    try {
      setCsvImporting(true);
      const res = await fetch("/api/admin/medicines/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, rows: parsedRows }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Successfully imported ${json.importedCount} medicines!`);
        setCsvModalOpen(false);
        setCsvFile(null);
        setCsvPreviewData(null);
        setParsedRows([]);
        fetchMedicines();
      } else {
        toast.error(json.error || "Bulk import failed");
      }
    } catch (err) {
      toast.error("Network error during bulk import");
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "name,brand,composition,mrp,price,stock,batch_number,expiry_date,drug_schedule,manufacturer,pack_size,dosage,description\n" +
      "Paracetamol 650mg,Dolo,Paracetamol 650mg,30,24,100,B-001,2026-12-31,OTC,Micro Labs,15 tablets,Oral,Fever and pain relief\n" +
      "Amoxicillin 500mg,Mox,Amoxicillin 500mg,120,95,45,B-002,2025-10-15,H,Sun Pharma,10 capsules,Oral,Antibiotic for bacterial infections\n" +
      "Azithromycin 500mg,Azithral,Azithromycin 500mg,140,110,30,B-003,2025-08-01,H1,Alembic,5 tablets,Oral,Broad spectrum antibiotic\n" +
      "Cetirizine 10mg,Cetzine,Cetirizine HCl 10mg,40,32,150,B-004,2026-05-20,OTC,Dr Reddys,10 tablets,Oral,Allergy relief";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mediquick_medicines_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Medicine Catalogue & Pricing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage pharmaceutical inventory, statutory drug schedules, and bulk imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
          >
            <Upload size={14} />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs shadow-emerald-600/20"
          >
            <Plus size={14} />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Schedule:</span>
          {["ALL", "OTC", "H", "H1", "X"].map((sch) => (
            <button
              key={sch}
              onClick={() => setScheduleFilter(sch)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                scheduleFilter === sch
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {sch === "ALL" ? "All Schedules" : `Schedule ${sch}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMedicines()}
              placeholder="Search name, salt, brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500"
            />
          </div>
          <button
            onClick={fetchMedicines}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Medicine Details</th>
                <th className="py-3 px-4 font-semibold">Schedule</th>
                <th className="py-3 px-4 font-semibold">Pricing</th>
                <th className="py-3 px-4 font-semibold">Inventory Stock</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading catalogue...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No medicines found. Use &apos;Add Medicine&apos; or &apos;Bulk CSV Import&apos; to populate the catalogue.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const stock = getStock(med);
                  const invRow = getInventory(med);
                  const reorder = invRow?.reorder_level ?? 10;
                  const isLow = stock <= reorder;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-xs text-slate-500">
                          {med.brand} • <span className="font-medium text-slate-700">{med.composition}</span>
                        </div>
                        {med.pack_size && (
                          <div className="text-[11px] text-slate-400">{med.pack_size}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            med.drug_schedule === "OTC"
                              ? "bg-slate-50 text-slate-700 border-slate-200"
                              : med.drug_schedule === "H" || med.drug_schedule === "H1"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          Sched {med.drug_schedule}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">₹{med.price}</div>
                        <div className="text-xs text-slate-400 line-through">MRP ₹{med.mrp}</div>
                        {med.discount_percentage > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600">
                            {med.discount_percentage}% OFF
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          className={`text-sm font-bold ${
                            isLow ? "text-rose-600" : "text-slate-800"
                          }`}
                        >
                          {stock} in stock
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Reorder level: {reorder}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            med.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {med.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Medicine"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(med)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Deactivate / Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{medicines.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> medicines (Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>)
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

      {/* Add / Edit Medicine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingMed ? "Edit Medicine" : "Add New Medicine"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Dolo 650 Tablet"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                    required
                  />
                  {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. dolo-650-tablet"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white font-mono"
                    required
                  />
                  {formErrors.slug && <p className="text-[11px] text-rose-600 mt-1">{formErrors.slug}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Micro Labs"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                    required
                  />
                  {formErrors.brand && <p className="text-[11px] text-rose-600 mt-1">{formErrors.brand}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Active Salt / Composition *
                  </label>
                  <input
                    type="text"
                    value={formData.composition}
                    onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                    required
                  />
                  {formErrors.composition && <p className="text-[11px] text-rose-600 mt-1">{formErrors.composition}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="30"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                    required
                  />
                  {formErrors.mrp && <p className="text-[11px] text-rose-600 mt-1">{formErrors.mrp}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="25"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                    required
                  />
                  {formErrors.price && <p className="text-[11px] text-rose-600 mt-1">{formErrors.price}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.batchQuantity}
                    onChange={(e) => setFormData({ ...formData, batchQuantity: e.target.value })}
                    placeholder="50"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="10"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Drug Schedule Select */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Statutory Drug Schedule *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["OTC", "H", "H1", "X"] as DrugSchedule[]).map((sch) => (
                    <button
                      key={sch}
                      type="button"
                      onClick={() => setFormData({ ...formData, drugSchedule: sch })}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                        formData.drugSchedule === sch
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Schedule {sch}
                    </button>
                  ))}
                </div>

                {formData.drugSchedule === "OTC" && (
                  <p className="text-[11px] text-slate-500">
                    Over-The-Counter: No doctor prescription required for customer checkout.
                  </p>
                )}
                {(formData.drugSchedule === "H" || formData.drugSchedule === "H1") && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    ⚠️ Schedule {formData.drugSchedule}: Prescription upload strictly required. Order held for pharmacist scrutiny before confirmation.
                  </p>
                )}
                {formData.drugSchedule === "X" && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    ⛔ Schedule X Narcotic: Indian regulations prohibit online checkout of Schedule X substances. Server will block checkout.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g. Micro Labs Ltd"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pack Size
                  </label>
                  <input
                    type="text"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    placeholder="e.g. strip of 15 tablets"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosage Form
                  </label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g. Tablet / Syrup"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Image URL
                </label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Indications
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Used for fever, mild to moderate aches, headaches..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700">
                  Visible in store catalogue (is_active)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : editingMed ? "Update Medicine" : "Create Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Bulk CSV Catalogue Import
                </h3>
              </div>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Step 1: Template Download */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">1. Download Sample CSV Template</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Includes columns for name, brand, composition, mrp, price, batchQuantity,
            batchNumber,
            expiryDate, and statutory drug_schedule.
                  </p>
                </div>
                <button
                  onClick={downloadSampleCsv}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
                >
                  <Download size={14} />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">2. Select Your Completed CSV File</h4>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csvFileInput"
                  />
                  <label htmlFor="csvFileInput" className="cursor-pointer block">
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-emerald-600 hover:underline">
                      Click to choose CSV file
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {csvFile ? csvFile.name : "or drag and drop here"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Step 3: Dry-Run Validation Preview */}
              {csvParsing ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  Validating CSV rows against pharmacy rules...
                </div>
              ) : csvPreviewData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <p className="text-xs text-slate-400">Total Rows</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{csvPreviewData.totalRows}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <p className="text-xs text-emerald-600 font-semibold">Valid Rows</p>
                      <p className="text-lg font-bold text-emerald-700 mt-0.5">{csvPreviewData.validCount}</p>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                      <p className="text-xs text-rose-600 font-semibold">Row Errors</p>
                      <p className="text-lg font-bold text-rose-700 mt-0.5">{csvPreviewData.errorCount}</p>
                    </div>
                  </div>

                  {/* Errors List */}
                  {csvPreviewData.errors.length > 0 && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 max-h-40 overflow-y-auto text-xs space-y-1.5">
                      <p className="font-bold text-rose-800">Row-Level Error Report:</p>
                      {csvPreviewData.errors.map((err, idx) => (
                        <div key={idx} className="text-rose-700 pl-2 border-l-2 border-rose-300">
                          <strong>Row {err.row} ({err.name}):</strong> {err.errors.join(", ")}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview of Valid Rows */}
                  {csvPreviewData.samplePreview?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-1">Preview of Valid Entries (First 5):</p>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                            <tr>
                              <th className="p-2">Name</th>
                              <th className="p-2">Brand</th>
                              <th className="p-2">Salt</th>
                              <th className="p-2">MRP</th>
                              <th className="p-2">Price</th>
                              <th className="p-2">Stock</th>
                              <th className="p-2">Schedule</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {csvPreviewData.samplePreview.map((item, idx) => (
                              <tr key={idx}>
                                <td className="p-2 font-semibold text-slate-800">{item.name}</td>
                                <td className="p-2 text-slate-600">{item.brand}</td>
                                <td className="p-2 text-slate-600">{item.composition}</td>
                                <td className="p-2 text-slate-600">₹{item.mrp}</td>
                                <td className="p-2 font-bold text-slate-800">₹{item.price}</td>
                                <td className="p-2 text-slate-600">{item.stock}</td>
                                <td className="p-2">
                                  <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                                    {item.schedule}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={csvImporting || !csvPreviewData || csvPreviewData.validCount === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {csvImporting ? "Importing..." : `Import ${csvPreviewData?.validCount ?? 0} Valid Medicines`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
