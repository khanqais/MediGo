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

/** Minimal catalogue shape passed from the server (real DB rows only). */
export interface HeroCatalogueItem {
  name: string;
  genericName: string;
  composition: string;
  packSize: string;
}

/** Pull distinct strengths (e.g. "500 mg", "10 ml") out of a composition string. */
function extractStrengths(composition: string): string[] {
  const matches = composition.match(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|iu)\b/gi) ?? [];
  const unique = Array.from(new Set(matches.map((value) => value.replace(/\s+/g, " ").trim())));
  return unique.slice(0, 4);
}

/** Split a pack size string (e.g. "1 strip of 10 tablets") into selectable chips. */
function extractPackSizes(packSize: string): string[] {
  const parts = packSize
    .split(/[,/|]/)
    .map((value) => value.trim())
    .filter(Boolean);
  return (parts.length > 0 ? parts : packSize ? [packSize.trim()] : []).slice(0, 4);
}

export default function HeroCarousel({
  catalogue = [],
}: {
  catalogue?: HeroCatalogueItem[];
}) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null);
  const [selectedPackSize, setSelectedPackSize] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const licenseNo = siteConfig.compliance.drugLicenseNumber || "DL-MH-2024-89412";

  // Match the typed query against medicines that actually exist in the catalogue.
  const activeMeta = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    const match = catalogue.find((item) => {
      const name = item.name.toLowerCase();
      const generic = item.genericName.toLowerCase();
      const composition = item.composition.toLowerCase();
      return name.includes(q) || generic.includes(q) || composition.includes(q) || q.includes(generic);
    });

    if (!match) return null;

    return {
      name: match.name,
      salt: match.genericName || match.composition || match.name,
      strengths: extractStrengths(match.composition),
      packSizes: extractPackSizes(match.packSize),
    };
  }, [catalogue, query]);

  const frequentItems = useMemo(() => catalogue.slice(0, 6), [catalogue]);

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

  // `shouldReduceMotion` is null on the server, so we must not use it to set
  // the initial `y` offset until after hydration. Before mount both server and
  // client agree on y:0, preventing the "translateY(16px) vs none" warning.
  const slideY = mounted && !shouldReduceMotion ? 16 : 0;
  const staggerDelay = mounted && !shouldReduceMotion ? 0.08 : 0;

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 1, y: slideY },
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
                <div className="flex flex-col sm:flex-row border-2 border-foreground rounded-sm bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                  {/* Text Input Row */}
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="pl-3.5 pr-2 text-muted-foreground flex items-center justify-center shrink-0">
                      <Search size={20} className="stroke-[2.25] text-primary" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search medicine or active salt..."
                      className="w-full flex-1 min-w-0 h-12 sm:h-14 px-2 text-base font-medium text-foreground placeholder:text-muted-foreground placeholder:truncate outline-none bg-transparent"
                      aria-label="Search medicine name or active salt"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => { setQuery(""); setSelectedStrength(null); setSelectedPackSize(null); }}
                        className="h-12 sm:h-14 px-3 text-xs text-muted-foreground hover:text-foreground font-bold shrink-0 min-w-[44px] flex items-center justify-center transition-colors"
                        aria-label="Clear search input"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Mobile Stacked Submit Action */}
                  <button
                    type="submit"
                    className="sm:hidden w-full h-12 px-5 bg-primary text-primary-foreground hover:bg-primary-dark active:bg-primary-dark font-heading font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shrink-0 border-t-2 border-foreground"
                  >
                    <span>Find medicine</span>
                    <ArrowRight size={16} />
                  </button>

                  {/* Desktop Inline Submit Action */}
                  <button
                    type="submit"
                    className="hidden sm:flex h-12 sm:h-14 px-5 sm:px-7 bg-primary text-primary-foreground hover:bg-primary-dark font-heading font-bold text-sm tracking-wide transition-colors items-center gap-2 shrink-0 border-l-2 border-foreground"
                  >
                    <span>Find medicine</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Strength and Pack Size Selectable Tags */}
              {activeMeta && (activeMeta.strengths.length > 0 || activeMeta.packSizes.length > 0) && (
                <div className="bg-muted/50 border border-border rounded-sm p-3.5 flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-heading font-bold text-foreground">
                      Active composition: <span className="font-mono text-primary font-normal">{activeMeta.salt}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">Select strength and pack size to filter:</span>
                  </div>

                  {/* Strengths */}
                  {activeMeta.strengths.length > 0 && (
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
                  )}

                  {/* Pack Sizes */}
                  {activeMeta.packSizes.length > 0 && (
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
                  )}
                </div>
              )}

              {/* Quick Popular Medicines Shortcut Bar (only real catalogue items) */}
              {frequentItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground mr-1">In stock now:</span>
                  {frequentItems.map((med) => (
                    <button
                      key={med.name}
                      type="button"
                      onClick={() => handleSampleClick(med.name)}
                      className="px-2 py-0.5 rounded-sm bg-muted hover:bg-border text-foreground text-xs font-medium border border-border"
                    >
                      {med.name}
                    </button>
                  ))}
                </div>
              )}

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
