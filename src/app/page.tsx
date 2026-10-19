import { Suspense } from "react";
import dynamic from "next/dynamic";
import HeroCarousel from "@/components/home/HeroCarousel";
import TrustBadges from "@/components/home/TrustBadges";
import FeaturedMedicines from "@/components/home/FeaturedMedicines";
import FeaturedMedicinesSkeleton from "@/components/home/FeaturedMedicinesSkeleton";

// Lazy-load below-the-fold sections so they don't block initial render
const CategoryGrid = dynamic(() => import("@/components/home/CategoryGrid"), { ssr: true });
const OffersBanner = dynamic(() => import("@/components/home/OffersBanner"), { ssr: true });
const PrescriptionUploadPromo = dynamic(() => import("@/components/home/PrescriptionUploadPromo"), { ssr: true });
const HealthConcernsGrid = dynamic(() => import("@/components/home/HealthConcernsGrid"), { ssr: true });
const HowItWorks = dynamic(() => import("@/components/home/HowItWorks"), { ssr: true });
const Testimonials = dynamic(() => import("@/components/home/Testimonials"), { ssr: true });
const AppDownloadBanner = dynamic(() => import("@/components/home/AppDownloadBanner"), { ssr: true });
const FAQSection = dynamic(() => import("@/components/home/FAQSection"), { ssr: true });

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
