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
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              1. Platform Nature & Pharmacy Licensing
            </h2>
            <p>
              {siteConfig.name} (&quot;Platform&quot;) is operated by <strong>{siteConfig.compliance.registeredEntity}</strong> in adherence to applicable Indian pharmacy laws, pharmaceutical distribution regulations, and the general Information Technology framework.
            </p>
            <p className="mt-2">
              Our registered pharmacy operations operate under Drug Licence No. <strong className="text-slate-900 font-mono">{siteConfig.compliance.drugLicenseNumber}</strong> under the jurisdiction of the <strong>{siteConfig.compliance.issuingAuthority}</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              2. Prescription Medications (Schedule H & H1 Classification)
            </h2>
            <p>
              Under Indian pharmaceutical regulations, prescription medicines (including statutory Schedule H and Schedule H1 classifications) cannot be dispensed without a valid, legible prescription issued by a Registered Medical Practitioner (RMP).
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li>Users must upload a valid prescription containing the physician&apos;s name, medical registration number, patient details, date, and dosage instructions.</li>
              <li>Every uploaded prescription is audited and approved by our licensed pharmacists prior to order packaging and fulfillment.</li>
              <li><strong>Prohibited Substances:</strong> Sale and distribution of habit-forming narcotics and Schedule X controlled substances via this digital platform is strictly prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              3. User Eligibility & Account Security
            </h2>
            <p>
              You must be at least 18 years of age to register and place orders on {siteConfig.name}. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              4. Pricing, Taxes & Payment Processing
            </h2>
            <p>
              All prices displayed on the platform are in Indian Rupees (INR) and inclusive of Goods and Services Tax (GST) as applicable under Indian laws. Orders above ₹{siteConfig.delivery.freeThreshold} qualify for free delivery; otherwise, a standard fee of ₹{siteConfig.delivery.standardFee} applies.
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
              6. Grievance Officer & Customer Support
            </h2>
            <p>
              In accordance with applicable consumer protection and digital intermediary guidelines, our designated Grievance Officer details are:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1">
              <p><strong>Grievance Officer:</strong> Customer Grievance & Compliance Cell</p>
              <p><strong>Entity:</strong> {siteConfig.compliance.registeredEntity}</p>
              <p><strong>Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Helpline:</strong> {siteConfig.compliance.pharmacistAssistanceContact}</p>
              <p><strong>Turnaround:</strong> Inquiries are acknowledged promptly and resolved in accordance with applicable consumer norms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              7. Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
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
