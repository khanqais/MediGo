import { siteConfig } from "@/config/site";
import { Truck, Clock, ShieldCheck, MapPin } from "lucide-react";
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
            Last updated: October 4, 2026 • PAN-India medicine delivery and temperature integrity
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
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
                  Delivered within <strong>24 to 48 hours</strong>. Select metro pincodes qualify for Same-Day or 2-Hour Express Delivery.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                  <Truck size={16} /> Tier-2, Tier-3 & Regional Pincodes
                </div>
                <p className="text-xs text-slate-600">
                  Delivered within <strong>2 to 4 business days</strong> via authorized pharmaceutical logistics partners.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. Shipping Charges & Free Delivery Threshold
            </h2>
            <p>
              We believe in transparent pricing without hidden packing fees:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Orders with subtotal <strong>₹{siteConfig.delivery.freeThreshold} and above</strong> qualify for <strong>FREE Delivery</strong> across all serviceable pincodes.</li>
              <li>Orders below ₹{siteConfig.delivery.freeThreshold} incur a nominal delivery fee of <strong>₹{siteConfig.delivery.standardFee}</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Cold-Chain Packaging & Integrity
            </h2>
            <p>
              Temperature-sensitive products (such as insulins, probiotics, eye drops) are dispatched in certified cold-chain insulated packaging with validated ice packs to guarantee product stability throughout transit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Prescription Verification Before Dispatch
            </h2>
            <p>
              Under Indian law, orders containing Schedule H or Schedule H1 prescription medications will only enter dispatch once our registered pharmacists review and approve the attached doctor prescription.
            </p>
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
