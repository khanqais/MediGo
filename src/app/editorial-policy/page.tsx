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
            Last updated: October 4, 2026 • Evidence-based pharmaceutical information governance
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              1. Our Clinical Philosophy
            </h2>
            <p>
              MediQuick is dedicated to empowering Indian consumers and patients with credible, medically verified, and culturally relevant pharmaceutical information. All medicine salt monographs, side effect profiles, interactions, and dosage guidelines published on MediQuick are authored and reviewed in accordance with verified clinical pharmacopoeias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              2. Authoritative Clinical Reference Sources
            </h2>
            <p>
              Information on active chemical salts, indications, contraindications, and therapeutic equivalence is cross-referenced with:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li><strong>Indian Pharmacopoeia (IP)</strong> – Ministry of Health and Family Welfare, Government of India.</li>
              <li><strong>Central Drugs Standard Control Organisation (CDSCO)</strong> approved prescribing literature.</li>
              <li><strong>British Pharmacopoeia (BP)</strong> and <strong>United States Pharmacopeia (USP)</strong>.</li>
              <li>Peer-reviewed biomedical journals indexed in PubMed and the National Center for Biotechnology Information (NCBI).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              3. Pharmacist Editorial Review Process
            </h2>
            <p>
              Every monograph and patient guide is reviewed by certified pharmacists holding degrees in Pharmacy (B.Pharm/Pharm.D) registered with State Pharmacy Councils under the Pharmacy Act, 1948.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              4. Statutory Medical Disclaimer
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
