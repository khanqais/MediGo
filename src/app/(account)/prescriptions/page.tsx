"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Upload, CheckCircle2, Clock, Eye, Trash2, Sparkles, AlertCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface PrescriptionItem {
  id: string;
  status: string;
  url?: string;
  created_at: string;
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPrescriptions = async () => {
    try {
      const res = await fetch("/api/prescriptions");
      const data = await res.json();
      if (res.ok && data.success) {
        setPrescriptions(data.data);
      }
    } catch (error) {
      toast.error("Failed to load prescriptions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a prescription document or image");
      return;
    }

    // Client-side validation
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Only JPG, PNG, and PDF are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Prescription uploaded! A licensed pharmacist is reviewing it.");
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchPrescriptions(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900">My Prescriptions</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Securely stored Rx documents verified by registered pharmacists</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold hover:bg-primary-dark transition shadow-md">
            <Upload size={16} /> Upload New Prescription
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>No prescriptions uploaded yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-50 text-primary rounded-xl flex items-center justify-center shrink-0 border border-green-100">
                        <FileText size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Prescription Document</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Uploaded on {new Date(rx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {rx.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> Verified</span>
                    ) : rx.status === "REJECTED" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full"><X size={12} /> Rejected</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full"><Clock size={12} /> Pending Review</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs mt-4">
                  {rx.url ? (
                    <a href={rx.url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1">
                      <Eye size={14} /> View Document
                    </a>
                  ) : (
                    <span className="text-slate-400">File unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Upload className="text-primary" /> Upload Prescription
            </h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed rounded-2xl p-6 text-center border-slate-300">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,application/pdf" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm"
                />
                <p className="text-xs text-slate-400 mt-2">JPG, PNG, PDF up to 5MB</p>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border font-bold text-xs">Cancel</button>
                <button type="submit" disabled={isUploading || !selectedFile} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs disabled:opacity-50">
                  {isUploading ? "Uploading..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
