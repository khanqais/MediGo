import Link from "next/link";
import { 
  Flame, 
  Activity, 
  Heart, 
  Sparkles, 
  Smile, 
  Eye, 
  Baby, 
  Leaf, 
  ArrowRight 
} from "lucide-react";

const categories = [
  { id: "1", name: "Fever and pain", icon: Flame, slug: "fever-pain", count: "14 items" },
  { id: "2", name: "Diabetes maintenance", icon: Activity, slug: "diabetes", count: "8 items" },
  { id: "3", name: "Cardiac care", icon: Heart, slug: "heart", count: "9 items" },
  { id: "4", name: "Vitamins and immunity", icon: Sparkles, slug: "vitamins", count: "12 items" },
  { id: "5", name: "Dermatology", icon: Smile, slug: "skin-care", count: "11 items" },
  { id: "6", name: "Ophthalmic care", icon: Eye, slug: "eye-care", count: "6 items" },
  { id: "7", name: "Pediatric care", icon: Baby, slug: "baby-care", count: "5 items" },
  { id: "8", name: "Ayurvedic formulations", icon: Leaf, slug: "ayurveda", count: "10 items" },
];

export default function CategoryGrid() {
  return (
    <section className="py-12 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              Browse therapeutic categories
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Select a clinical department to view generic equivalents and verified salts
            </p>
          </div>
          <Link
            href="/medicines"
            className="text-xs sm:text-sm font-heading font-bold text-primary hover:underline inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <span>All categories</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="blister-card flex flex-col items-center p-3.5 rounded-md border border-border bg-card hover:border-primary transition-colors text-center"
              >
                <div className="w-11 h-11 rounded-sm bg-muted/70 text-primary border border-border flex items-center justify-center mb-2.5">
                  <Icon size={20} className="stroke-[2.25]" />
                </div>
                <h3 className="font-heading font-bold text-xs text-foreground leading-snug mb-0.5">
                  {cat.name}
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {cat.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
