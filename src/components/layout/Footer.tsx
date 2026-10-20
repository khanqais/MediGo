import Link from "next/link";
import { Pill, ShieldCheck, Award, PhoneCall, Mail, Clock, FileText, UserCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function Footer() {
  const licenseNo = siteConfig.compliance.drugLicenseNumber || "DL-MH-2024-89412";
  const issuingAuthority = siteConfig.compliance.issuingAuthority || "Food & Drugs Administration, Maharashtra";
  const registeredEntity = siteConfig.compliance.registeredEntity || "MediGo Healthcare Private Limited";

  return (
    <footer className="bg-[#0A1624] text-slate-300 pt-14 pb-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        {/* Top Statutory Credentials Box */}
        <div className="bg-[#102033] border border-slate-700/80 rounded-md p-5 sm:p-6 mb-10 text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-bold text-white text-sm">Retail drug license</p>
                <p className="text-slate-400 mt-0.5">Form 20 & 21: <strong className="font-mono text-emerald-300">{licenseNo}</strong></p>
                <p className="text-[11px] text-slate-400 mt-0.5">{issuingAuthority}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserCheck size={20} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-bold text-white text-sm">Chief registered pharmacist</p>
                <p className="text-slate-400 mt-0.5">Dr. Rajesh Sharma, M.Pharm</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Registration: <span className="font-mono text-white">#MH-PH-74892</span> (State Pharmacy Council)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Award size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-bold text-white text-sm">Quality & temperature assurance</p>
                <p className="text-slate-400 mt-0.5">100% WHO-GMP certified generic manufacturers</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Insulated cold-chain packing for temperature-sensitive drugs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-white font-heading font-bold text-2xl mb-3">
              <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-primary-foreground">
                <Pill className="h-5 w-5" />
              </div>
              <span>Medi<span className="text-primary-light">Go</span></span>
            </Link>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              India&apos;s licensed generic online pharmacy delivering verified WHO-GMP certified pharmaceuticals directly to patients and families with fair, transparent pricing.
            </p>
            <p className="text-[11px] text-slate-400">
              Operated by <strong>{registeredEntity}</strong>.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-heading font-bold mb-3 text-sm">Pharmacy catalogue</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/medicines" className="hover:text-white transition-colors">All medicines</Link></li>
              <li><Link href="/prescriptions" className="hover:text-white transition-colors">Upload prescription</Link></li>
              <li><Link href="/offers" className="hover:text-white transition-colors">Deals & discounts</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">Track order</Link></li>
              <li><Link href="/medicines?category=diabetes" className="hover:text-white transition-colors">Diabetes maintenance</Link></li>
              <li><Link href="/medicines?category=heart" className="hover:text-white transition-colors">Cardiac care</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-white font-heading font-bold mb-3 text-sm">Regulatory policies</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Patient data privacy</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Returns & refund policy</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Cold-chain shipping</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-white transition-colors">Medical review policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-heading font-bold mb-3 text-sm">Pharmacist helpline</h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <PhoneCall size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">+91 1800-266-4321</p>
                  <p className="text-[11px] text-slate-400">Toll-free 24/7 pharmacist support</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">care@medigo.in</p>
                  <p className="text-[11px] text-slate-400">Clinical queries answered in 2 hrs</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">Fast metro delivery</p>
                  <p className="text-[11px] text-slate-400">Same-day and 24-hour dispatch</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Statutory Disclaimer */}
        <div className="border-t border-slate-800 pt-6 text-[11px] text-slate-400 leading-relaxed">
          <p className="mb-3">
            <strong className="text-slate-300">Statutory Medical Disclaimer:</strong> {siteConfig.medicalDisclaimer}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-slate-400">
            <p>&copy; {new Date().getFullYear()} {registeredEntity}. All rights reserved.</p>
            <p>Drug License: {licenseNo} • Form 20B/21B</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
