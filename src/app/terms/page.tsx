import { siteConfig } from "@/config/site";
import { ShieldCheck, FileText, AlertTriangle, Scale } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | MediQuick",
  description: "Terms and Conditions governing the use of MediQuick online pharmacy platform.",
};

export default function TermsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Scale size={14} /> Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-500 text-sm">
            Last updated: October 4, 2026 • Effective immediately across all digital channels
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              1. Platform Nature & Compliance
            </h2>
            <p>
              MediQuick (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates as a compliant digital pharmacy platform in full accordance with the <strong>Drugs and Cosmetics Act, 1940</strong>, the <strong>Drugs and Cosmetics Rules, 1945</strong>, and the <strong>Information Technology Act, 2000</strong> of India.
            </p>
            <p className="mt-2">
              Our registered pharmacy operations hold valid Drug Licence No. <strong className="text-slate-900 font-mono">{siteConfig.compliance.drugLicenseNumber}</strong> issued under Forms 20B and 21B by the Food and Drug Administration (FDA).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              2. Prescription Medications (Schedule H & H1 Drugs)
            </h2>
            <p>
              Under Indian law, medicines classified under Schedule H, Schedule H1, and Schedule X cannot be dispensed without a valid written prescription issued by a Registered Medical Practitioner (RMP).
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li>You must upload a legible prescription containing the doctor&apos;s name, registration number, patient name, date, and specific dosage instructions.</li>
              <li>Every prescription is scrutinized and verified by our in-house licensed pharmacists prior to order fulfillment.</li>
              <li>We strictly prohibit and block the sale of <strong>Schedule X drugs</strong> and habit-forming narcotic substances via this digital platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              3. User Eligibility & Account Security
            </h2>
            <p>
              You must be at least 18 years of age to register and place orders on MediQuick. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              4. Pricing, Taxes & Delivery
            </h2>
            <p>
              All prices displayed on the platform are in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST) as applicable under Indian tax laws. Delivery charges are applied at checkout based on order subtotal and promotional thresholds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              5. Statutory Medical Disclaimer
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <p>
                  {siteConfig.medicalDisclaimer}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              6. Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <p>Support Helpline: {siteConfig.compliance.pharmacistAssistanceContact}</p>
            <Link href="/privacy" className="text-primary font-bold hover:underline">
              Read our Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
