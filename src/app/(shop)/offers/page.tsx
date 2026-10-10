"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import MedicineCard from "@/components/medicine/MedicineCard";
import { Medicine } from "@/types/medicine";
import { 
  Sparkles, 
  Tag, 
  Copy, 
  Check, 
  Clock, 
  Percent, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard, 
  ChevronRight 
} from "lucide-react";
import { toast } from "sonner";

const coupons = [
  {
    code: "FIRST20",
    title: "Flat 20% OFF",
    sub: "On your first generic medicine order",
    minOrder: 399,
    maxDiscount: 100,
    color: "from-emerald-500 to-green-600",
    badge: "NEW USER"
  },
  {
    code: "GENERIC50",
    title: "Up to 50% Additional Savings",
    sub: "On chronic & daily healthcare prescriptions",
    minOrder: 799,
    maxDiscount: 250,
    color: "from-blue-500 to-indigo-600",
    badge: "CHRONIC CARE"
  },
  {
    code: "FREEDEL",
    title: "Free Express Delivery",
    sub: "Guaranteed same-day/next-day dispatch",
    minOrder: 299,
    maxDiscount: 50,
    color: "from-amber-500 to-orange-600",
    badge: "ALL USERS"
  },
  {
    code: "HEALTH25",
    title: "Extra 25% OFF Supplements",
    sub: "On vitamins, minerals & daily wellness packs",
    minOrder: 499,
    maxDiscount: 150,
    color: "from-rose-500 to-pink-600",
    badge: "WELLNESS"
  }
];

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Countdown timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 24, seconds: 45 });
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMedicines() {
      try {
        const res = await fetch("/api/medicines?limit=100");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMedicines(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load medicines");
      } finally {
        setLoading(false);
      }
    }
    fetchMedicines();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Top discounted medicines (60%+ off)
  const topDiscountMedicines = useMemo(() => {
    return medicines
      .filter((m) => m.discountPercentage >= 60)
      .slice(0, 10);
  }, [medicines]);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white py-12 px-4 shadow-md">
        <div className="container mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-white/80 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={13} />
            <span className="text-white font-bold">Offers & Deals Hub</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles size={14} /> Flash Discounts & Coupons
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-3">
                Exclusive Deals & Pharmacy Discounts
              </h1>
              <p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">
                Save up to 80% on certified WHO-GMP generic alternatives. Combine coupons, free shipping codes, and payment partner cashbacks for maximum family savings.
              </p>
            </div>

            {/* Countdown timer card */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                <Clock size={15} /> Flash Sale Ends In:
              </div>
              <div className="flex items-center justify-center gap-2 text-white font-mono text-2xl font-black">
                <span className="bg-black/30 px-2.5 py-1 rounded-lg">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span>:</span>
                <span className="bg-black/30 px-2.5 py-1 rounded-lg">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span>:</span>
                <span className="bg-black/30 px-2.5 py-1 rounded-lg">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-14">
        {/* Active Promo Codes Grid */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">COUPONS</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Available Voucher Codes</h2>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Click any coupon to copy code</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className={`p-4 bg-gradient-to-r ${c.color} text-white relative`}>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full inline-block mb-1">
                    {c.badge}
                  </span>
                  <h3 className="text-xl font-black">{c.title}</h3>
                  <p className="text-xs text-white/90 mt-1">{c.sub}</p>
                </div>

                <div className="p-4 bg-slate-50 flex items-center justify-between gap-3 border-t border-dashed border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Use Code</span>
                    <span className="font-mono font-black text-sm text-slate-800">{c.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-primary text-xs font-bold text-slate-700 hover:text-primary transition flex items-center gap-1.5 shadow-2xs"
                  >
                    {copiedCode === c.code ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copiedCode === c.code ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bank & Payment Offers */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <CreditCard className="text-primary" /> Payment Partner Offers
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
              <span className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
                <img src="/products/PhonePay.jpg" alt="PhonePe" className="h-6 w-auto object-contain" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-900">PhonePe Cashback</h4>
                <p className="text-xs text-slate-600">Flat ₹50 cashback on min order ₹499 via UPI</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
              <span className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
                <img src="/products/gpay.jpg" alt="Google Pay" className="h-6 w-auto object-contain" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Google Pay Rewards</h4>
                <p className="text-xs text-slate-600">Assured scratch card up to ₹100 on every transaction</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
              <span className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
                <img src="/products/bhim.png" alt="BHIM UPI" className="h-6 w-auto object-contain" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-900">BHIM UPI Instant</h4>
                <p className="text-xs text-slate-600">Zero convenience fee + Instant payment confirmation</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center gap-3">
              <span className="p-1.5 bg-black border border-slate-700 rounded-xl shadow-2xs shrink-0">
                <img src="/products/cred.png" alt="CRED" className="h-6 w-auto object-contain" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">CRED Pay Boost</h4>
                <p className="text-xs text-slate-300">Earn up to ₹75 cashback directly to CRED balance</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mega Discounted Generic Medicines Grid */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">FLASH SAVINGS</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Deals of the Day: 60%+ OFF
              </h2>
            </div>
            <Link
              href="/medicines"
              className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              Browse All Medicines <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center">
               <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {topDiscountMedicines.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
