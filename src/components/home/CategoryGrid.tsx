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
import { createClient } from "@/lib/supabase/server";

const categories = [
  { id: "1", name: "Fever and pain", icon: Flame, slug: "fever-pain" },
  { id: "2", name: "Diabetes maintenance", icon: Activity, slug: "diabetes" },
  { id: "3", name: "Cardiac care", icon: Heart, slug: "heart" },
  { id: "4", name: "Vitamins and immunity", icon: Sparkles, slug: "vitamins" },
  { id: "5", name: "Dermatology", icon: Smile, slug: "skin-care" },
  { id: "6", name: "Ophthalmic care", icon: Eye, slug: "eye-care" },
  { id: "7", name: "Pediatric care", icon: Baby, slug: "baby-care" },
  { id: "8", name: "Ayurvedic formulations", icon: Leaf, slug: "ayurveda" },
];

/**
 * Counts reflect only medicines an admin has published, so the grid never
 * advertises stock that is not in the database.
 */
async function getCategoryCounts(): Promise<Record<string, number>> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("medicines")
      .select("id, categories(slug)")
      .eq("is_active", true);

    const counts: Record<string, number> = {};

    (data ?? []).forEach((row: any) => {
      const slug = row.categories?.slug;
      if (typeof slug === "string" && slug.length > 0) {
        counts[slug] = (counts[slug] ?? 0) + 1;
      }
    });

    return counts;
  } catch {
    return {};
  }
}

export default async function CategoryGrid() {
  const counts = await getCategoryCounts();

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
            const count = counts[cat.slug] ?? 0;

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
                  {count === 0 ? "No items yet" : `${count} item${count === 1 ? "" : "s"}`}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
