import { siteConfig } from "@/config/site";
import { RotateCcw, ShieldAlert, CheckCircle, Clock, Ban } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Return & Refund Policy | MediQuick",
  description: "MediQuick medicine return, exchange, and refund terms with patient safety guidelines.",
};

export default function ReturnsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <RotateCcw size={14} /> 7-Day Patient Assurance
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Return & Refund Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last updated: October 4, 2026 • Patient safety and pharmaceutical integrity standards
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              1. Medicine Return Window & Grounds
            </h2>
            <p>
              Under Indian pharmaceutical guidelines and consumer protection norms, medicines are eligible for return or replacement within <strong>7 days of delivery</strong> solely under the following qualifying conditions:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li><strong>Damaged in Transit:</strong> The medicine container, bottle, or strip arrived physically damaged or leaking.</li>
              <li><strong>Wrong Product Delivered:</strong> The item delivered does not match the product or dosage ordered.</li>
              <li><strong>Tampered Packaging:</strong> The safety seal was broken prior to delivery.</li>
              <li><strong>Defective Formulation:</strong> Noticeable discoloration, precipitation, or manufacturing defect.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2 text-red-600">
              <Ban size={20} /> 2. Non-Returnable Products (Safety Exceptions)
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 text-xs sm:text-sm space-y-2">
              <p className="font-bold">
                For patient health and safety, the following cannot be returned once delivered:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-800">
                <li><strong>Cold-Chain & Temperature-Sensitive Medicines:</strong> Insulins, vaccines, and biologics requiring 2°C–8°C storage.</li>
                <li><strong>Opened or Consumed Items:</strong> Strips with opened blister packs, partially consumed syrups, or uncapped vials.</li>
                <li><strong>Personal Hygiene & Wellness Items:</strong> Diagnostic test kits, thermometers, and intimate hygiene products.</li>
                <li><strong>Medicines Returned Without Original Box:</strong> Items missing batch numbers, MRP stickers, or outer cartons.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Refund Process & Timelines
            </h2>
            <p>
              Once a return request is accepted and verified by our pharmacy team:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-1">Prepaid Orders (UPI / Cards)</h4>
                <p className="text-xs text-slate-600">
                  Refunds are processed back to the original payment source within <strong>3 to 5 business days</strong> via Razorpay.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-1">Cash on Delivery (COD)</h4>
                <p className="text-xs text-slate-600">
                  Refunds are credited to your bank account via NEFT/IMPS or UPI ID provided during return registration within <strong>2 to 4 business days</strong>.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. How to Raise a Return Request
            </h2>
            <p>
              To request a return or replacement:
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>Navigate to your <Link href="/orders" className="text-primary font-bold hover:underline">My Orders</Link> section.</li>
              <li>Select the affected order and photograph the damaged package with the batch number clearly visible.</li>
              <li>Send an email to <strong>{siteConfig.compliance.supportEmail}</strong> or call <strong>{siteConfig.compliance.pharmacistAssistanceContact}</strong> within 7 days of delivery.</li>
            </ol>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <Link href="/shipping" className="text-primary font-bold hover:underline">
              &larr; Express Shipping Policy
            </Link>
            <Link href="/editorial-policy" className="text-primary font-bold hover:underline">
              Editorial & Medical Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
