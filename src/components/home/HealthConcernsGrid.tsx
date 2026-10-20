import Link from "next/link";
import { ArrowRight } from "lucide-react";

const concerns = [
  { name: "Diabetes maintenance", count: "18 items", slug: "diabetes" },
  { name: "Hypertension and blood pressure", count: "14 items", slug: "heart" },
  { name: "Thyroid care", count: "9 items", slug: "thyroid" },
  { name: "Fever and infection", count: "12 items", slug: "fever-pain" },
  { name: "Joint and bone mobility", count: "16 items", slug: "fever-pain" },
  { name: "Respiratory and asthma", count: "21 items", slug: "antibiotics" },
  { name: "Neurological health", count: "8 items", slug: "vitamins" },
  { name: "Immunity and wellness", count: "24 items", slug: "vitamins" },
  { name: "Ophthalmic care", count: "11 items", slug: "eye-care" },
  { name: "Women's wellness", count: "15 items", slug: "vitamins" },
  { name: "Digestive and gastro care", count: "28 items", slug: "vitamins" },
  { name: "Renal care", count: "7 items", slug: "digestion" },
];

export default function HealthConcernsGrid() {
  return (
    <section className="py-12 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              Find medicines by health condition
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Direct access to chronic therapies and daily treatment courses
            </p>
          </div>
          <Link
            href="/medicines"
            className="text-xs sm:text-sm font-heading font-bold text-primary hover:underline inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <span>All conditions</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* 6x2 Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {concerns.map((concern) => (
            <Link
              key={concern.name}
              href={`/categories/${concern.slug}`}
              className="blister-card p-3.5 rounded-md border border-border bg-card hover:border-primary transition-colors flex flex-col justify-between"
            >
              <div>
                <span className="inline-block w-2 h-2 rounded-full bg-primary/40 mb-2" />
                <h3 className="font-heading font-bold text-xs text-foreground leading-snug mb-1">
                  {concern.name}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground mt-2">
                {concern.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
