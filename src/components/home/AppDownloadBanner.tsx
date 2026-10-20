import { Smartphone, Star, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AppDownloadBanner() {
  return (
    <section className="py-12 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-[#0B5D4B] text-white rounded-md p-6 sm:p-10 border border-primary-dark shadow-label">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content */}
            <div className="space-y-3 text-left max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-sm text-xs font-semibold text-emerald-200 border border-white/20">
                <Smartphone size={14} /> Mobile prescription access
              </span>

              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
                Refill chronic medicines in seconds
              </h2>

              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
                Set monthly refill schedules, receive dosage verification alerts from your assigned pharmacist, and track cold-chain parcels on your phone.
              </p>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15 text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white">2,00,000+</div>
                  <div className="text-[11px] text-emerald-200">Dispensed orders</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white flex items-center gap-1">
                    4.8 <Star size={14} className="text-accent fill-current" />
                  </div>
                  <div className="text-[11px] text-emerald-200">Patient review score</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-accent">80%</div>
                  <div className="text-[11px] text-emerald-200">Average savings</div>
                </div>
              </div>
            </div>

            {/* Right Action Badges */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href="/medicines"
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-card text-foreground px-6 py-3.5 rounded-sm border border-border font-heading font-bold text-xs hover:bg-muted transition-colors min-h-[48px]"
              >
                <span className="text-lg">📱</span>
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground leading-none">Instant web app</p>
                  <p className="text-xs font-bold leading-tight">Launch MediGo PWA</p>
                </div>
              </Link>

              <Link
                href="/prescriptions"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-accent-foreground px-6 py-3.5 rounded-sm border border-foreground/30 font-heading font-bold text-xs transition-colors min-h-[48px]"
              >
                <span>Upload prescription</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
