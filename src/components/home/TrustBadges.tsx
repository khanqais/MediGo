import { ShieldCheck, Truck, PiggyBank, Award } from "lucide-react";

const trustItems = [
  {
    icon: Award,
    title: "WHO-GMP certified",
    subtitle: "Lab verified active salts and chemical purity",
  },
  {
    icon: ShieldCheck,
    title: "100% authentic generics",
    subtitle: "Sourced directly from licensed Indian manufacturers",
  },
  {
    icon: PiggyBank,
    title: "Up to 80% lower cost",
    subtitle: "Exact therapeutic bio-equivalence at fair prices",
  },
  {
    icon: Truck,
    title: "Express cold-chain dispatch",
    subtitle: "Sealed packaging with temperature controls",
  },
];

export default function TrustBadges() {
  return (
    <section className="bg-muted/40 border-b border-border py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-card border border-border rounded-md shadow-blister"
              >
                <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Icon size={18} className="stroke-[2.25]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
