import { Suspense } from "react";
import HeroCarousel, { HeroCatalogueItem } from "@/components/home/HeroCarousel";
import TrustBadges from "@/components/home/TrustBadges";
import FeaturedMedicines from "@/components/home/FeaturedMedicines";
import FeaturedMedicinesSkeleton from "@/components/home/FeaturedMedicinesSkeleton";
import PrescriptionUploadPromo from "@/components/home/PrescriptionUploadPromo";
import HealthConcernsGrid from "@/components/home/HealthConcernsGrid";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";
import AppDownloadBanner from "@/components/home/AppDownloadBanner";
import FAQSection from "@/components/home/FAQSection";
import { createClient } from "@/lib/supabase/server";

/**
 * The hero's strength / pack-size chips are driven by medicines an admin has
 * actually published. Nothing is hardcoded, so an empty catalogue simply hides
 * the chips instead of advertising products that do not exist.
 */
async function getHeroCatalogue(): Promise<HeroCatalogueItem[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("medicines")
      .select("name, generic_name, composition, pack_size")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(60);

    return (data ?? []).map((med: any) => ({
      name: med.name ?? "",
      genericName: med.generic_name ?? "",
      composition: med.composition ?? "",
      packSize: med.pack_size ?? "",
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const catalogue = await getHeroCatalogue();

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero with dispensary-label search (strengths come from the catalogue) */}
      <HeroCarousel catalogue={catalogue} />

      {/* 2. Trust Strip (green bg below hero) */}
      <TrustBadges />

      {/* 3. Best Sellers (5-column product grid using authentic catalogue images) */}
      <Suspense fallback={<FeaturedMedicinesSkeleton />}>
        <FeaturedMedicines />
      </Suspense>

      {/* 4. Prescription Upload Promo Banner (full width) */}
      <PrescriptionUploadPromo />

      {/* 5. Browse by Health Concern (6x2 grid with 12 conditions) */}
      <HealthConcernsGrid />

      {/* 6. How MediQuick Works (4 numbered steps) */}
      <HowItWorks />

      {/* 7. Customer Testimonials (3 verified buyer cards) */}
      <Testimonials />

      {/* 8. App Download Banner (2M+ stats, App Store & Google Play) */}
      <AppDownloadBanner />

      {/* 9. FAQ Accordion (5 animated questions) */}
      <FAQSection />
    </div>
  );
}
