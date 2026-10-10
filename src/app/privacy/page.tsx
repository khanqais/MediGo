import { siteConfig } from "@/config/site";
import { ShieldCheck, Lock, Eye, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MediQuick",
  description: "MediQuick privacy policy and patient medical data protection standards under Indian DPDPA.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Lock size={14} /> Data Protection & Confidentiality
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last updated: October 4, 2026 • Compliant with Digital Personal Data Protection Act, 2023 (DPDPA)
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              1. Information We Collect
            </h2>
            <p>
              To process pharmacy orders and comply with statutory healthcare records standards, MediQuick collects:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li><strong>Personal Identification Data:</strong> Full name, contact telephone number, email address, and shipping address.</li>
              <li><strong>Prescription & Medical Records:</strong> Scanned copies or photographs of prescriptions containing doctor name, patient name, and prescribed pharmaceuticals.</li>
              <li><strong>Transaction & Payment Records:</strong> Payment transaction identifiers, billing amounts, and payment method details (we never store raw credit card numbers or UPI MPINs).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. How We Protect Prescription Documents
            </h2>
            <p>
              Prescription documents represent sensitive health data. All prescription uploads are stored in private encrypted storage buckets with strict row-level access control. Documents are accessible strictly by registered pharmacists conducting dispensing reviews and by the account owner via temporary time-limited cryptographic signed URLs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Data Usage & Non-Disclosure
            </h2>
            <p>
              We do not sell, rent, or lease your personal or medical data to third-party marketing companies. Data is processed solely for:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Fulfilling and delivering your pharmaceutical orders.</li>
              <li>Pharmacist verification as mandated by the Drugs and Cosmetics Act.</li>
              <li>Providing transaction alerts, delivery status, and order invoices.</li>
              <li>Complying with statutory inspection requests by drug regulatory authorities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Patient Data Rights
            </h2>
            <p>
              Under the Digital Personal Data Protection Act (DPDPA), 2023, you retain the right to review, update, and request erasure of your non-statutory personal data. Note that drug dispensing transaction registers are required to be preserved for statutory audit periods under Indian pharmacy regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              5. Contact Our Data Protection Officer (DPO)
            </h2>
            <p>
              For privacy inquiries or grievance redressal, please contact our Data Protection Officer at:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm">
              <p><strong>Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Grievance Officer:</strong> MediQuick Compliance Cell</p>
              <p><strong>Drug License No:</strong> {siteConfig.compliance.drugLicenseNumber}</p>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <Link href="/terms" className="text-primary font-bold hover:underline">
              &larr; Terms of Service
            </Link>
            <Link href="/returns" className="text-primary font-bold hover:underline">
              Refund & Return Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
