import { Suspense } from "react";
import HeroCarousel from "@/components/home/HeroCarousel";
import TrustBadges from "@/components/home/TrustBadges";
import CategoryGrid from "@/components/home/CategoryGrid";
import OffersBanner from "@/components/home/OffersBanner";
import FeaturedMedicines from "@/components/home/FeaturedMedicines";
import FeaturedMedicinesSkeleton from "@/components/home/FeaturedMedicinesSkeleton";
import PrescriptionUploadPromo from "@/components/home/PrescriptionUploadPromo";
import HealthConcernsGrid from "@/components/home/HealthConcernsGrid";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";
import AppDownloadBanner from "@/components/home/AppDownloadBanner";
import FAQSection from "@/components/home/FAQSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Carousel (4s autoplay, 3 gradient slides) */}
      <HeroCarousel />

      {/* 2. Trust Strip (green bg below hero) */}
      <TrustBadges />

      {/* 3. Shop by Category (8-card grid with item counts) */}
      <CategoryGrid />

      {/* 4. Deals & Offers (2x2 gradient grid) */}
      <OffersBanner />

      {/* 5. Best Sellers (5-column product grid using 49 authentic catalogue images) */}
      <Suspense fallback={<FeaturedMedicinesSkeleton />}>
        <FeaturedMedicines />
      </Suspense>

      {/* 6. Prescription Upload Promo Banner (full width) */}
      <PrescriptionUploadPromo />

      {/* 7. Browse by Health Concern (6x2 grid with 12 conditions) */}
      <HealthConcernsGrid />

      {/* 8. How MediQuick Works (4 numbered steps) */}
      <HowItWorks />

      {/* 9. Customer Testimonials (3 verified buyer cards) */}
      <Testimonials />

      {/* 10. App Download Banner (2M+ stats, App Store & Google Play) */}
      <AppDownloadBanner />

      {/* 11. FAQ Accordion (5 animated questions) */}
      <FAQSection />
    </div>
  );
}
