import { siteConfig } from "@/config/site";
import { ShieldCheck, Lock, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MediQuick",
  description: "MediQuick privacy policy and patient medical data protection standards.",
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
              1. Information We Collect
            </h2>
            <p>
              To process pharmaceutical orders and fulfill operational safety duties under Indian healthcare practices, {siteConfig.name} collects:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-600">
              <li><strong>Identity & Contact Details:</strong> Full name, verified mobile number, email address, and physical delivery address.</li>
              <li><strong>Prescription & Clinical Details:</strong> Physician name, medical registration identification, patient details, and medication regimens contained within uploaded prescription images.</li>
              <li><strong>Transaction Data:</strong> Payment order identifiers and transaction amounts (card numbers, UPI PINs, and banking credentials are processed directly by certified payment gateways and are never stored).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. Prescription Document Security & Access Controls
            </h2>
            <p>
              Prescriptions constitute highly confidential personal health information. Uploaded documents are stored in secure private storage with cryptographic access controls. Documents are accessible exclusively by registered pharmacists conducting clinical order audits and by the verified account owner through temporary signed URLs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Data Handling Principles (Digital Personal Data Protection Framework)
            </h2>
            <p>
              In adherence to general Indian data protection principles, including the <strong>Digital Personal Data Protection Act, 2023</strong>:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Personal data is collected and processed with user consent solely for order fulfillment, customer support, and regulatory compliance.</li>
              <li>Users retain rights to review, update, or request erasure of non-statutory personal data.</li>
              <li>We never sell, rent, or trade patient personal or health information to third-party commercial marketing entities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Mandatory Healthcare Record Retention
            </h2>
            <p>
              Under applicable Indian pharmacy regulations and statutory dispensing standards, prescription registers and order fulfillment logs must be preserved for mandatory audit periods by regulatory authorities. Right-to-erasure requests are accommodated in harmony with these overriding statutory retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              5. Grievance Officer & Privacy Desk
            </h2>
            <p>
              For privacy queries, consent management, or grievances regarding personal data processing, contact our designated officer:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1">
              <p><strong>Grievance & Privacy Officer:</strong> Data Protection & Compliance Cell</p>
              <p><strong>Entity:</strong> {siteConfig.compliance.registeredEntity}</p>
              <p><strong>Drug License No:</strong> {siteConfig.compliance.drugLicenseNumber}</p>
              <p><strong>Licensing Authority:</strong> {siteConfig.compliance.issuingAuthority}</p>
              <p><strong>Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Turnaround:</strong> Grievance requests are acknowledged promptly and addressed under applicable Indian data guidelines.</p>
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
