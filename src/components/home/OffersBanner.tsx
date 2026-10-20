import Link from "next/link";
import { ArrowRight, Tag, Percent, Sparkles, ShieldCheck } from "lucide-react";

const offers = [
  {
    id: 1,
    code: "FIRST20",
    headline: "Flat 20% off on your first order",
    subtext: "Replace expensive branded medicines with identical certified generic salts.",
    cta: "Shop generic medicines",
    href: "/medicines?filter=generics",
    badge: "New patient discount",
  },
  {
    id: 2,
    code: "DIABETES25",
    headline: "Extra 25% off chronic maintenance care",
    subtext: "Save on monthly blood sugar monitoring strips, metformin, and daily supplements.",
    cta: "Explore diabetes medicines",
    href: "/medicines?category=diabetes",
    badge: "Monthly refill saving",
  },
  {
    id: 3,
    code: "FREEDEL",
    headline: "Free express cold-chain delivery",
    subtext: "Complimentary doorstep courier dispatch on any order valued at ₹299 or above.",
    cta: "View offers page",
    href: "/offers",
    badge: "Express shipping",
  },
  {
    id: 4,
    code: "CARDIAC30",
    headline: "Cardiovascular therapies at direct cost",
    subtext: "Laboratory tested anti-hypertensives and statins sourced directly from WHO-GMP labs.",
    cta: "Browse cardiac care",
    href: "/medicines?category=heart",
    badge: "Clinical wellness",
  },
];

export default function OffersBanner() {
  return (
    <section className="py-12 bg-background border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              Verified coupon savings
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Apply tested promotional codes at checkout for additional savings
            </p>
          </div>
          <Link
            href="/offers"
            className="text-xs sm:text-sm font-heading font-bold text-primary hover:underline inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <span>All offers</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="pharmacy-label bg-card border-2 border-border rounded-md p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-sm">
                    {offer.badge}
                  </span>
                  <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-sm border border-border">
                    <Tag size={13} className="text-muted-foreground" />
                    <span className="font-mono font-bold text-xs text-foreground tracking-wider">{offer.code}</span>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-lg text-foreground mb-1.5 leading-snug">
                  {offer.headline}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {offer.subtext}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Applies at checkout</span>
                <Link
                  href={offer.href}
                  className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-primary hover:underline min-h-[44px]"
                >
                  <span>{offer.cta}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
