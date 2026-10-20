import { Search, ShoppingBag, ShieldCheck, Truck } from "lucide-react";

const steps = [
  {
    step: "1",
    title: "Search medicines or salt",
    desc: "Type the brand name or active generic salt to view dosages, pack sizes, and transparent rates.",
    icon: Search,
  },
  {
    step: "2",
    title: "Add to cart and attach prescription",
    desc: "Select pack quantity. For prescription drugs, attach your doctor slip or upload directly.",
    icon: ShoppingBag,
  },
  {
    step: "3",
    title: "Clinical pharmacist audit",
    desc: "Licensed pharmacists verify the script, check interactions, and authorize dispensing.",
    icon: ShieldCheck,
  },
  {
    step: "4",
    title: "Temperature-controlled delivery",
    desc: "Dispatched in sealed tamper-evident parcels with cold-chain protection directly to your home.",
    icon: Truck,
  },
];

export default function HowItWorks() {
  return (
    <section className="py-14 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-left mb-10 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
            How prescription dispensing works
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Compliant, safe pharmaceutical distribution verified by licensed pharmacists at every stage
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="blister-card rounded-md p-5 border border-border bg-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-sm bg-muted text-primary flex items-center justify-center border border-border">
                      <Icon size={20} className="stroke-[2.25]" />
                    </div>
                    <span className="w-7 h-7 rounded-sm bg-accent text-accent-foreground font-heading font-black text-xs flex items-center justify-center border border-foreground/20">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-heading font-bold text-foreground mb-1.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
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
