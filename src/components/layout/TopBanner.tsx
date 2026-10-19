"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

export default function TopBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("mediquick-banner-dismissed")) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("mediquick-banner-dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div className="bg-primary-dark text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between transition-all duration-300 shadow-xs">
      <div className="flex-1 flex items-center justify-center gap-2 text-center">
        <Sparkles size={15} className="text-yellow-300 hidden sm:inline" />
        <span>🚚 Free delivery above ₹499 | COD Available | <strong>Up to 80% off generics</strong></span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
        aria-label="Dismiss banner"
      >
        <X size={15} />
      </button>
    </div>
  );
}
