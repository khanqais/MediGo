"use client";

import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Upload, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

const slides = [
  {
    id: 1,
    gradient: "from-emerald-900 via-green-800 to-teal-900",
    badge: "⚡ India's Most Trusted Generic Pharmacy",
    headline: "Save up to 80% on every medicine",
    subtext: "Identical active salts, identical therapeutic potency, certified WHO-GMP standards at honest generic prices.",
    primaryCta: { label: "Shop Now", href: "/medicines" },
    secondaryCta: { label: "Upload Prescription", href: "/prescriptions", icon: Upload },
    highlight: "100% Quality Guaranteed",
  },
  {
    id: 2,
    gradient: "from-blue-950 via-indigo-900 to-slate-900",
    badge: "🩺 Chronic Care Specialist",
    headline: "Complete Diabetes Care",
    subtext: "Keep blood glucose in check with daily maintenance medications, test strips, and specialized diet formulas at massive savings.",
    primaryCta: { label: "Explore Diabetes Care", href: "/medicines?category=diabetes" },
    secondaryCta: { label: "View All Medicines", href: "/medicines" },
    highlight: "Daily Delivery Subscriptions",
  },
  {
    id: 3,
    gradient: "from-purple-950 via-purple-900 to-slate-950",
    badge: "🚀 2-Hour Metro Delivery",
    headline: "Medicines at your door in 2 hrs",
    subtext: "Cold-chain temperature regulated express dispatch across Mumbai, Delhi, Bengaluru, and 1,000+ pin codes nationwide.",
    primaryCta: { label: "Order Now", href: "/medicines" },
    secondaryCta: { label: "Check Availability", href: "/#pincode" },
    highlight: "Free Delivery Above ₹499",
  },
];

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();

    // 4-second autoplay
    const timer = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);

    return () => {
      clearInterval(timer);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative overflow-hidden w-full bg-slate-900 group" ref={emblaRef}>
      <div className="flex h-[380px] sm:h-[440px] md:h-[480px]">
        {slides.map((slide, index) => (
          <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 h-full">
            <div className={`w-full h-full bg-gradient-to-r ${slide.gradient} flex items-center relative px-6 sm:px-12 md:px-20 overflow-hidden`}>
              {/* Background ambient lighting */}
              <div className="absolute -right-16 -top-16 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="container mx-auto z-10 text-white max-w-4xl">
                <div
                  className={`space-y-4 sm:space-y-6 transition-opacity transition-transform duration-500 ${
                    selectedIndex === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-300">
                    <Zap size={14} className="text-yellow-300 fill-current" />
                    <span>{slide.badge}</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-sm">
                    {slide.headline}
                  </h1>

                  <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-2xl leading-relaxed opacity-90">
                    {slide.subtext}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      href={slide.primaryCta.href}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-7 py-3.5 rounded-full font-bold text-sm sm:text-base shadow-lg hover:shadow-primary/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {slide.primaryCta.label} <ArrowRight size={18} />
                    </Link>

                    {slide.secondaryCta && (
                      <Link
                        href={slide.secondaryCta.href}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md px-6 py-3.5 rounded-full font-bold text-sm sm:text-base transition hover:border-white"
                      >
                        {slide.secondaryCta.icon && <slide.secondaryCta.icon size={18} className="text-emerald-300" />}
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-md transition z-20 opacity-0 group-hover:opacity-100 hidden sm:block"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-md transition z-20 opacity-0 group-hover:opacity-100 hidden sm:block"
        aria-label="Next Slide"
      >
        <ChevronRight size={22} />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`transition-all rounded-full ${
              selectedIndex === i
                ? "w-8 h-2 bg-primary shadow-sm"
                : "w-2 h-2 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
