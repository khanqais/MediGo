import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Youtube, Pill, ShieldCheck, Award, PhoneCall, Mail, Clock, AlertTriangle } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Column 1: Brand & Bio */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-2xl mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
                <Pill className="h-5 w-5" />
              </div>
              <span>Medi<span className="text-primary">Quick</span></span>
            </Link>
            <p className="text-sm mb-5 text-slate-400 max-w-sm leading-relaxed">
              India&apos;s leading generic online pharmacy delivering 100% genuine WHO-GMP certified medicines with up to 80% savings directly to your home.
            </p>

            {/* Certifications Strip */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Accredited & Certified by</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-green-400 text-xs px-2.5 py-1 rounded-md font-semibold">
                  <ShieldCheck size={14} /> WHO-GMP
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-blue-400 text-xs px-2.5 py-1 rounded-md font-semibold">
                  <Award size={14} /> ISO 9001:2015
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-yellow-400 text-xs px-2.5 py-1 rounded-md font-semibold">
                  FDA Compliant
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-purple-400 text-xs px-2.5 py-1 rounded-md font-semibold">
                  NABL Labs
                </span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              <Link href="/" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors" aria-label="Facebook">
                <Facebook size={18} />
              </Link>
              <Link href="/" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors" aria-label="Instagram">
                <Instagram size={18} />
              </Link>
              <Link href="/" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors" aria-label="Twitter">
                <Twitter size={18} />
              </Link>
              <Link href="/" className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors" aria-label="YouTube">
                <Youtube size={18} />
              </Link>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4 text-base">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/medicines" className="hover:text-primary transition-colors">All Medicines</Link></li>
              <li><Link href="/prescriptions" className="hover:text-primary transition-colors">Upload Prescription</Link></li>
              <li><Link href="/offers" className="hover:text-primary transition-colors">Today&apos;s Deals & Discounts</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/medicines?category=antibiotics" className="hover:text-primary transition-colors">Antibiotics Store</Link></li>
              <li><Link href="/medicines?category=vitamins" className="hover:text-primary transition-colors">Vitamins & Immunity</Link></li>
            </ul>
          </div>

          {/* Column 3: Policies */}
          <div>
            <h3 className="text-white font-bold mb-4 text-base">Our Policies</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/returns" className="hover:text-primary transition-colors">7-Day Return & Refund</Link></li>
              <li><Link href="/shipping" className="hover:text-primary transition-colors">Express Shipping Policy</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-primary transition-colors">Editorial & Medical Policy</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact & Help */}
          <div>
            <h3 className="text-white font-bold mb-4 text-base">Customer Support</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-2.5">
                <PhoneCall size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">+91 1800-266-4321</p>
                  <p className="text-xs text-slate-400">Toll-free 24/7 helpline</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">care@mediquick.in</p>
                  <p className="text-xs text-slate-400">Response within 2 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-white font-semibold">Fast Express Delivery</p>
                  <p className="text-xs text-slate-400">Delivery in 2 hours in metro cities</p>
                </div>
              </div>
            </div>
          </div>
        </div>





        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} <strong>{siteConfig.compliance.registeredEntity}</strong> All rights reserved.</p>
            <span className="hidden sm:inline text-slate-700">•</span>
            <p className="text-slate-400">Drug Licence No: <strong className="font-mono text-slate-300">{siteConfig.compliance.drugLicenseNumber}</strong></p>
          </div>


        </div>
      </div>
    </footer>
  );
}
