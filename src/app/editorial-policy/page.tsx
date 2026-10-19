import { siteConfig } from "@/config/site";
import { BookOpen, Award, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Editorial & Medical Policy | MediQuick",
  description: "MediQuick medical content verification standards, references, and pharmaceutical editorial principles.",
};

export default function EditorialPolicyPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <BookOpen size={14} /> Medical Accuracy Standards
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Editorial & Medical Content Policy
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
              1. Our Clinical Philosophy
            </h2>
            <p>
              {siteConfig.name} is dedicated to providing transparent, clinically reliable, and unbiased pharmaceutical information. All medicine salt monographs, side effect disclosures, drug interaction warnings, and dosage guidance published on {siteConfig.name} are developed from accredited clinical references and pharmacopoeial compendia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. Authoritative Clinical Reference Sources
            </h2>
            <p>
              Information on active pharmaceutical ingredients, drug mechanisms, and contraindications is cross-referenced against authoritative scientific compendia:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li><strong>Indian Pharmacopoeia (IP)</strong> – Official standards published under the Ministry of Health and Family Welfare, Government of India.</li>
              <li><strong>Central Drugs Standard Control Organisation (CDSCO)</strong> – Approved product literature and regulatory prescribing directives.</li>
              <li><strong>British Pharmacopoeia (BP) & United States Pharmacopeia (USP)</strong> – Recognized international therapeutic compendia.</li>
              <li>Peer-reviewed biomedical literature indexed on the National Library of Medicine (PubMed / NCBI).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Pharmacist Editorial Oversight & Verification
            </h2>
            <p>
              Educational monographs and drug alternative data are authored and audited by qualified pharmacists (B.Pharm / Pharm.D) registered with State Pharmacy Councils in India. Commercial relationships never influence our therapeutic monographs or generic drug price comparisons.
            </p>
          </section>


          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              5. Editorial Feedback & Grievance Contact
            </h2>
            <p>
              To report factual inaccuracies or request medical content revisions:
            </p>
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1">
              <p><strong>Editorial Desk:</strong> Medical & Pharmacovigilance Cell</p>
              <p><strong>Pharmacy Entity:</strong> {siteConfig.compliance.registeredEntity}</p>
              <p><strong>Drug License No:</strong> {siteConfig.compliance.drugLicenseNumber}</p>
              <p><strong>Licensing Authority:</strong> {siteConfig.compliance.issuingAuthority}</p>
              <p><strong>Support Email:</strong> {siteConfig.compliance.supportEmail}</p>
              <p><strong>Pharmacist Consultation:</strong> {siteConfig.compliance.pharmacistAssistanceContact}</p>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <Link href="/terms" className="text-primary font-bold hover:underline">
              &larr; Terms of Service
            </Link>
            <Link href="/privacy" className="text-primary font-bold hover:underline">
              Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
