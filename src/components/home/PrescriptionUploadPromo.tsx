import Link from "next/link";
import { Upload, ShieldCheck, FileCheck2, UserCheck } from "lucide-react";

export default function PrescriptionUploadPromo() {
  return (
    <section className="py-12 bg-background border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="pharmacy-label bg-card border-2 border-foreground rounded-md p-6 sm:p-10 shadow-label">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-left max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-muted text-foreground px-2.5 py-1 rounded-sm text-xs font-semibold border border-border">
                <FileCheck2 size={15} className="text-primary" />
                <span>Clinical prescription verification</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight leading-tight">
                Upload your doctor prescription for pharmacist review
              </h2>

              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Our registered clinical pharmacists check the active salts, verify safety and dosage, and calculate fair generic equivalents before order confirmation.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-primary shrink-0" /> Encrypted clinical data
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck size={15} className="text-primary shrink-0" /> Verified by Dr. Rajesh Sharma
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-primary shrink-0" /> Form 20B/21B statutory records
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center sm:items-stretch gap-2.5 w-full sm:w-auto">
              <Link
                href="/prescriptions"
                className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-accent-foreground px-8 py-3.5 rounded-sm font-heading font-bold text-sm shadow-xs border border-foreground/30 transition-colors w-full sm:w-auto min-h-[48px]"
              >
                <Upload size={18} className="stroke-[2.5]" />
                <span>Upload prescription</span>
              </Link>
              <p className="text-center text-[11px] text-muted-foreground">Supported file formats: JPG, PNG, PDF up to 5MB</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
