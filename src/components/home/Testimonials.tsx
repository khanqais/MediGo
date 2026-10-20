import { Star, ShieldCheck, Quote } from "lucide-react";

const reviews = [
  {
    id: 1,
    name: "Dr. Anand Kulkarni",
    city: "Mumbai, Maharashtra",
    initials: "AK",
    rating: 5,
    quote: "As a physician, I inspect active chemical salts carefully. MediGo dispenses authentic WHO-GMP certified generic formulations with identical bio-equivalence to top commercial brands at a fraction of the cost.",
    badge: "Verified physician & patient",
  },
  {
    id: 2,
    name: "Pooja Verma",
    city: "Bengaluru, Karnataka",
    initials: "PV",
    rating: 5,
    quote: "My elderly mother requires chronic maintenance medicines for hypertension and diabetes each month. Our monthly pharmacy bill dropped from ₹3,800 to ₹840 with free express delivery. The dosages are clearly printed on each pack.",
    badge: "Verified monthly buyer",
  },
  {
    id: 3,
    name: "Amitabh Sen",
    city: "Kolkata, West Bengal",
    initials: "AS",
    rating: 5,
    quote: "Prescription verification was completed within 10 minutes by a registered pharmacist. The packaging arrived in insulated tamper-evident packaging with clear batch numbers and expiry dates.",
    badge: "Verified buyer",
  },
];

export default function Testimonials() {
  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-10 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
            Verified patient feedback
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Genuine experiences from patients and families managing daily prescriptions across India
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="blister-card rounded-md p-5 sm:p-6 border border-border bg-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-accent">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={15} className="fill-current text-foreground" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                    {rev.badge}
                  </span>
                </div>

                <p className="text-foreground text-xs sm:text-sm leading-relaxed mb-6">
                  &ldquo;{rev.quote}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-sm bg-muted text-foreground font-heading font-bold text-xs flex items-center justify-center border border-border shrink-0">
                  {rev.initials}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground">
                    {rev.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {rev.city}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
