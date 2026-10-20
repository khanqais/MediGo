"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, UserCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function TopBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("mediquick-banner-dismissed")) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("mediquick-banner-dismissed", "true");
  };

  if (isDismissed) return null;

  const licenseNo = siteConfig.compliance.drugLicenseNumber || "DL-MH-2024-89412";

  return (
    <div className="bg-[#084538] text-white px-3 sm:px-4 py-1.5 text-xs font-body flex items-center justify-between border-b border-primary/30">
      <div className="flex-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <span className="inline-flex items-center gap-1 text-emerald-200">
          <ShieldCheck size={14} className="text-accent shrink-0" />
          <span>Licensed Indian E-Pharmacy: <strong className="font-mono text-white">{licenseNo}</strong></span>
        </span>
        <span className="hidden md:inline text-white/40">•</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-emerald-100">
          <UserCheck size={14} className="text-emerald-300 shrink-0" />
          <span>Chief Pharmacist: <strong>Dr. Rajesh Sharma (Reg. #MH-PH-74892)</strong></span>
        </span>
        <span className="hidden lg:inline text-white/40">•</span>
        <span className="hidden lg:inline text-emerald-200">
          Free delivery above ₹499 • Express cold-chain dispatch
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors shrink-0 ml-2"
        aria-label="Dismiss trust notice"
      >
        <X size={14} />
      </button>
    </div>
  );
}
