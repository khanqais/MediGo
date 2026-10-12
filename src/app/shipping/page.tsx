import { siteConfig } from "@/config/site";
import { Truck, Clock, ShieldCheck, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Shipping & Delivery Policy | MediQuick",
  description: "MediQuick express delivery timelines, shipping charges, and cold-chain pharmaceutical packaging.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Truck size={14} /> Express Fulfillment
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Shipping & Delivery Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Operational draft template • Requires verification by qualified legal counsel
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Visible Draft Banner */}
          <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm font-medium">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-bold uppercase tracking-wider block text-amber-800 text-xs mb-0.5">
                Draft - replace with lawyer-reviewed text
              </span>
              This document is an operational compliance draft template for {siteConfig.name} ({siteConfig.compliance.registeredEntity}) and must be reviewed and certified by qualified legal counsel prior to formal publication.
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              1. Delivery Timelines
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                  <Clock size={16} /> Metro & Tier-1 Cities
                </div>
                <p className="text-xs text-slate-600">
                  Delivered within <strong>24 to 48 hours</strong>. Select urban clusters qualify for Same-Day or 2-Hour Express Delivery.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                  <Truck size={16} /> Tier-2, Tier-3 & Regional Pincodes
                </div>
                <p className="text-xs text-slate-600">
                  Delivered within <strong>2 to 4 business days</strong> via certified pharmaceutical logistics providers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. Shipping Charges & Free Delivery Threshold
            </h2>
            <p>
              Transparent shipping without hidden packing charges:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Orders with item subtotal of <strong>₹{siteConfig.delivery.freeThreshold} and above</strong> qualify for <strong>FREE Delivery</strong> across all serviceable pincodes.</li>
              <li>Orders below ₹{siteConfig.delivery.freeThreshold} incur a standard shipping fee of <strong>₹{siteConfig.delivery.standardFee}</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Cold-Chain Packaging & Temperature Integrity
            </h2>
            <p>
              Temperature-sensitive pharmaceuticals (such as insulins, vaccines, and biologics) are dispatched in validated cold-chain insulated shipper boxes with ice gel packs to maintain temperatures between 2°C and 8°C throughout transit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Mandatory Prescription Verification Before Dispatch
            </h2>
            <p>
              Under applicable Indian pharmacy distribution guidelines, orders containing prescription medications will only be released for packaging and transit after our licensed pharmacists review and approve the doctor prescription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              5. Logistics Grievances & Pharmacy Licensing
            </h2>
            <p>
              For shipping delays, transit damages, or logistics queries:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1">
              <p><strong>Pharmacy Entity:</strong> {siteConfig.compliance.registeredEntity}</p>
              <p><strong>Drug License No:</strong> {siteConfig.compliance.drugLicenseNumber}</p>
              <p><strong>Licensing Authority:</strong> {siteConfig.compliance.issuingAuthority}</p>
              <p><strong>Support Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Assistance Helpline:</strong> {siteConfig.compliance.pharmacistAssistanceContact}</p>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <Link href="/terms" className="text-primary font-bold hover:underline">
              &larr; Terms of Service
            </Link>
            <Link href="/returns" className="text-primary font-bold hover:underline">
              Return & Refund Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
