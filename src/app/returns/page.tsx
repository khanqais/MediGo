import { siteConfig } from "@/config/site";
import { RotateCcw, ShieldAlert, CheckCircle, Clock, Ban, AlertTriangle } from "lucide-react";
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
            <RotateCcw size={14} /> Patient Assurance & Returns
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Return & Refund Policy
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
              1. Medicine Return Window & Grounds
            </h2>
            <p>
              In accordance with consumer assurance norms and pharmacy quality guidelines, medicines are eligible for return or replacement within <strong>7 days of delivery</strong> under the following qualifying conditions:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li><strong>Damaged in Transit:</strong> The medicine container, bottle, or strip arrived physically damaged or leaking.</li>
              <li><strong>Incorrect Item:</strong> The product or dosage delivered does not match the approved doctor prescription or order invoice.</li>
              <li><strong>Tampered Packaging:</strong> The safety seal was broken or compromised prior to delivery.</li>
              <li><strong>Defective Formulation:</strong> Noticeable discoloration, precipitation, or manufacturing anomaly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2 text-red-600">
              <Ban size={20} /> 2. Medicine Return Limits & Safety Exceptions
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 text-xs sm:text-sm space-y-2">
              <p className="font-bold">
                Under pharmaceutical quality assurance guidelines and patient safety standards, once medicines leave temperature-controlled pharmacy custody, the following cannot be returned or restocked under any circumstances:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-800">
                <li><strong>Cold-Chain & Temperature-Sensitive Medicines:</strong> Insulins, vaccines, and biologics requiring continuous refrigerated storage (2°C–8°C), as temperature integrity cannot be verified once delivered.</li>
                <li><strong>Opened or Consumed Medicines:</strong> Unsealed blister strips, open syrups, or punctured vials.</li>
                <li><strong>Personal Diagnostic Products:</strong> Glucometer strips, thermometers, and diagnostic test kits with broken outer packaging.</li>
                <li><strong>Missing Batch Identification:</strong> Any product missing the original manufacturer carton, batch identification, or expiry markings.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Refund Timelines & Processing Method
            </h2>
            <p>
              Upon return authorization and clinical inspection by our pharmacy personnel:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-1">Online Prepaid (Razorpay)</h4>
                <p className="text-xs text-slate-600">
                  Refund is credited directly back to the original source payment instrument within <strong>3 to 5 business days</strong>.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-1">Cash on Delivery (COD)</h4>
                <p className="text-xs text-slate-600">
                  Refund is disbursed via direct NEFT/IMPS bank transfer or UPI ID verified during cancellation within <strong>2 to 4 business days</strong>.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Grievance Officer & Customer Support
            </h2>
            <p>
              To initiate a return or escalate an unresolved refund, contact our compliance team:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1">
              <p><strong>Grievance Officer:</strong> Returns & Pharmacist Grievance Desk</p>
              <p><strong>Entity:</strong> {siteConfig.compliance.registeredEntity}</p>
              <p><strong>Drug License No:</strong> {siteConfig.compliance.drugLicenseNumber}</p>
              <p><strong>Licensing Authority:</strong> {siteConfig.compliance.issuingAuthority}</p>
              <p><strong>Support Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Pharmacist Assistance:</strong> {siteConfig.compliance.pharmacistAssistanceContact}</p>
            </div>
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
