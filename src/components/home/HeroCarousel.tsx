"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Upload, 
  ShieldCheck, 
  FileCheck2, 
  Truck, 
  Check, 
  Sparkles,
  ArrowRight,
  Pill
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "@/config/site";

// Curated medicine database for interactive printed label chips
const SAMPLE_MEDS: Record<string, { strengths: string[]; packSizes: string[]; salt: string }> = {
  paracetamol: {
    strengths: ["500 mg", "650 mg", "1000 mg"],
    packSizes: ["10 Tablets", "15 Tablets", "Strip of 10", "60 ml Syrup"],
    salt: "Paracetamol / Acetaminophen IP",
  },
  metformin: {
    strengths: ["500 mg", "850 mg", "1000 mg SR"],
    packSizes: ["10 Tablets", "15 Tablets", "20 Tablets"],
    salt: "Metformin Hydrochloride IP",
  },
  amoxicillin: {
    strengths: ["250 mg", "500 mg", "625 mg (CV)"],
    packSizes: ["6 Tablets", "10 Capsules", "Strip of 6"],
    salt: "Amoxicillin & Potassium Clavulanate IP",
  },
  telmisartan: {
    strengths: ["20 mg", "40 mg", "80 mg"],
    packSizes: ["10 Tablets", "15 Tablets", "30 Tablets"],
    salt: "Telmisartan IP",
  },
  pantoprazole: {
    strengths: ["40 mg", "40 mg + DSR"],
    packSizes: ["10 Tablets", "15 Capsules"],
    salt: "Pantoprazole Sodium Gastro-resistant",
  },
  atorvastatin: {
    strengths: ["10 mg", "20 mg", "40 mg"],
    packSizes: ["10 Tablets", "15 Tablets"],
    salt: "Atorvastatin Calcium IP",
  },
};

export default function HeroCarousel() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null);
  const [selectedPackSize, setSelectedPackSize] = useState<string | null>(null);

  const licenseNo = siteConfig.compliance.drugLicenseNumber || "DL-MH-2024-89412";

  // Determine matched medicine metadata if query contains known drug name
  const matchedMedKey = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return "paracetamol"; // Default popular showcase
    const found = Object.keys(SAMPLE_MEDS).find(k => q.includes(k) || k.includes(q));
    return found || null;
  }, [query]);

  const activeMeta = matchedMedKey ? SAMPLE_MEDS[matchedMedKey] : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = [query.trim(), selectedStrength, selectedPackSize].filter(Boolean);
    const finalQuery = parts.join(" ");
    if (finalQuery) {
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    } else {
      router.push("/medicines");
    }
  };

  const handleSampleClick = (medName: string) => {
    setQuery(medName);
    setSelectedStrength(null);
    setSelectedPackSize(null);
  };

  // Motion variants for orchestrated entrance
  // Always start visible (opacity: 1) to avoid blank screen on SSR/hydration;
  // only animate the vertical slide-in for a subtle entrance effect.
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 1, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  return (
    <section className="bg-primary text-white pt-8 pb-12 sm:pt-12 sm:pb-16 px-4 border-b border-primary-dark relative">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
        >
          {/* Top Trust Credential Bar in Hero */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-100 pb-2 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="font-mono text-accent font-bold">Rx</span>
              <span>Dispensary License: <strong className="font-mono text-white">{licenseNo}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-200">
              <ShieldCheck size={14} className="text-accent" />
              <span>Verified Pharmacist on Duty: <strong>Dr. Rajesh Sharma (#MH-PH-74892)</strong></span>
            </div>
          </motion.div>

          {/* Heading & Intro */}
          <motion.div variants={itemVariants} className="max-w-2xl">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-white leading-[1.15] mb-3">
              Find your prescribed medicine with transparent pricing
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              Order authentic WHO-GMP certified generic medicines directly to your home. Same active salts, certified purity, and up to 80% lower cost.
            </p>
          </motion.div>

          {/* Signature Printed Pharmacy Label Search */}
          <motion.div 
            variants={itemVariants}
            className="pharmacy-label bg-white text-foreground rounded-md p-5 sm:p-7 shadow-label"
          >
            {/* Stamp Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-foreground/15 text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="bg-foreground text-background font-bold px-1.5 py-0.5 rounded-none text-[10px]">
                  DISPENSARY LABEL
                </span>
                <span>MEDIGO E-PHARMACY FORM NO. 21B</span>
              </div>
              <div className="flex items-center gap-2">
                <span>BATCH: <strong className="text-foreground">2026-OCT</strong></span>
                <span>•</span>
                <span>PAN-INDIA DISPATCH</span>
              </div>
            </div>

            {/* Main Search Bar */}
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="relative">
                <div className="flex items-center border-2 border-foreground rounded-sm bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                  <div className="pl-3.5 pr-2 text-muted-foreground flex items-center justify-center">
                    <Search size={20} className="stroke-[2.25] text-primary" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type medicine name or active salt (e.g. Paracetamol, Metformin, Telmisartan)..."
                    className="w-full h-12 sm:h-14 px-2 text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
                    aria-label="Search medicine name or active salt"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(""); setSelectedStrength(null); setSelectedPackSize(null); }}
                      className="px-3 text-xs text-muted-foreground hover:text-foreground font-bold"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-12 sm:h-14 px-5 sm:px-7 bg-primary text-primary-foreground hover:bg-primary-dark font-heading font-bold text-sm tracking-wide transition-colors flex items-center gap-2 shrink-0 border-l-2 border-foreground"
                  >
                    <span>Find medicine</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Strength and Pack Size Selectable Tags */}
              {activeMeta && (
                <div className="bg-muted/50 border border-border rounded-sm p-3.5 flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-heading font-bold text-foreground">
                      Active composition: <span className="font-mono text-primary font-normal">{activeMeta.salt}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">Select strength and pack size to filter:</span>
                  </div>

                  {/* Strengths */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-16">Strength:</span>
                    {activeMeta.strengths.map((str) => {
                      const isSelected = selectedStrength === str;
                      return (
                        <button
                          key={str}
                          type="button"
                          onClick={() => setSelectedStrength(isSelected ? null : str)}
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-sm border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card text-foreground border-border hover:border-foreground/50 hover:bg-muted"
                          }`}
                        >
                          {isSelected && <Check size={12} className="inline mr-1" />}
                          {str}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pack Sizes */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-16">Pack size:</span>
                    {activeMeta.packSizes.map((pack) => {
                      const isSelected = selectedPackSize === pack;
                      return (
                        <button
                          key={pack}
                          type="button"
                          onClick={() => setSelectedPackSize(isSelected ? null : pack)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-sm border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card text-foreground border-border hover:border-foreground/50 hover:bg-muted"
                          }`}
                        >
                          {isSelected && <Check size={12} className="inline mr-1" />}
                          {pack}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Popular Medicines Shortcut Bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <span className="font-semibold text-foreground mr-1">Frequent prescriptions:</span>
                {Object.keys(SAMPLE_MEDS).map((medKey) => (
                  <button
                    key={medKey}
                    type="button"
                    onClick={() => handleSampleClick(medKey)}
                    className="capitalize px-2 py-0.5 rounded-sm bg-muted hover:bg-border text-foreground text-xs font-medium border border-border"
                  >
                    {medKey}
                  </button>
                ))}
              </div>

              {/* Label Bottom Action Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground leading-tight">
                  Have a written prescription from your physician? Skip searching and upload directly.
                </div>
                <Link
                  href="/prescriptions"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-accent hover:bg-accent-hover text-accent-foreground font-heading font-bold text-sm rounded-sm border border-foreground/30 shadow-xs transition-colors shrink-0"
                >
                  <Upload size={16} className="text-foreground stroke-[2.5]" />
                  <span>Upload prescription</span>
                </Link>
              </div>
            </form>
          </motion.div>

          {/* Clear Three-Step Prescription Path in First Screen */}
          <motion.div variants={itemVariants} className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="bg-primary-dark/60 border border-white/15 rounded-md p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-accent text-accent-foreground font-heading font-black text-sm flex items-center justify-center shrink-0 border border-foreground/20">
                  1
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-sm">Upload prescription</h3>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-snug">
                    Attach photo or PDF document. Safe, encrypted patient record vault.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-primary-dark/60 border border-white/15 rounded-md p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-accent text-accent-foreground font-heading font-black text-sm flex items-center justify-center shrink-0 border border-foreground/20">
                  2
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-sm">Pharmacist verification</h3>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-snug">
                    Licensed clinical pharmacist verifies dosage, strength, and drug safety.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-primary-dark/60 border border-white/15 rounded-md p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-accent text-accent-foreground font-heading font-black text-sm flex items-center justify-center shrink-0 border border-foreground/20">
                  3
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-sm">Temperature delivery</h3>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-snug">
                    Cold-chain packing and door delivery in sealed, tamper-evident parcel.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
