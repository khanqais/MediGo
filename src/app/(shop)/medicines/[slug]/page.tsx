"use client";

import { useCartStore } from "@/store/cartStore";
import { Medicine } from "@/types/medicine";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  ShieldCheck,
  ArrowLeft,
  Truck,
  RotateCcw,
  Check,
  Copy,
  Tag,
  MapPin,
  Sparkles,
  Zap,
  Package
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import MedicineCard from "@/components/medicine/MedicineCard";
import RatingStars from "@/components/shared/RatingStars";
import { isOtcMedicine, isOtcOnlyMode, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";

export default function MedicineDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [similarMedicines, setSimilarMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function fetchMedicine() {
      try {
        const res = await fetch(`/api/medicines/${params.slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Medicine not found");
            router.push("/medicines");
            return;
          }
          throw new Error("Failed to fetch medicine");
        }
        const json = await res.json();
        const medData = json.data;
        setMedicine(medData);

        // Substitutes from backend
        if (json.substitutes && json.substitutes.length > 0) {
          setSimilarMedicines(json.substitutes);
        } else if (medData.category) {
          // Fallback to similar category medicines if no exact substitutes
          const simRes = await fetch(`/api/medicines?category=${medData.category}&limit=6`);
          if (simRes.ok) {
            const simData = await simRes.json();
            setSimilarMedicines(simData.data.filter((m: Medicine) => m.id !== medData.id).slice(0, 5));
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load medicine details");
      } finally {
        setLoading(false);
      }
    }
    fetchMedicine();
  }, [params.slug, router]);

  // Gallery images directly from medicine data
  const galleryImages = useMemo(() => {
    if (!medicine) return [];
    if (medicine.images && medicine.images.length > 0) {
      return medicine.images;
    }
    return [medicine.imageUrl || "/products/catalogue-1.jpg"];
  }, [medicine]);

  const [activeImage, setActiveImage] = useState<string>("");

  // Reset active image when medicine slug changes
  useEffect(() => {
    if (medicine) {
      setActiveImage(medicine.images?.[0] || medicine.imageUrl || "/products/catalogue-1.jpg");
    }
  }, [medicine]);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb skeleton */}
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image skeleton - matches the aspect ratio of the actual image container */}
            <div className="aspect-square bg-slate-200 rounded-2xl animate-pulse" />
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
              <div className="h-12 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
              <div className="h-12 w-full bg-primary/20 rounded-xl animate-pulse mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-medium">Medicine not found</p>
        </div>
      </div>
    );
  }

  const savings = Math.max(0, medicine.mrp - medicine.price);

  const handleAddToCart = () => {
    addItem(medicine, qty);
    toast.success(`${qty}x ${medicine.name} added to cart!`, {
      description: `Saved ₹${savings * qty} with generic pricing.`
    });
  };

  const handleBuyNow = () => {
    addItem(medicine, qty);
    router.push("/checkout");
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error("Please enter a valid 6-digit Indian PIN code");
      return;
    }
    setIsCheckingPincode(true);
    setTimeout(() => {
      setIsCheckingPincode(false);
      setPincodeStatus(`Available! Delivery to ${pincode.trim()} by Tomorrow, 2:00 PM`);
      toast.success("Delivery available to this pincode!");
    }, 450);
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(true);
    toast.success(`Coupon ${code} copied!`);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-6 overflow-x-auto whitespace-nowrap pb-1">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
          <Link href="/medicines" className="hover:text-primary transition-colors">Medicines</Link>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
          <Link href={`/categories/${medicine.category}`} className="hover:text-primary transition-colors capitalize">
            {medicine.category.replace("-", " ")}
          </Link>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
          <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-none">{medicine.name}</span>
        </div>

        {/* Main Product Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8 lg:p-10 mb-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left Gallery (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Main Image Viewport with Zoom */}
              <div className="aspect-square bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-6 relative overflow-hidden group shadow-inner">
                {/* Badges */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                  {medicine.drugSchedule === "X" ? (
                    <span className="bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                      Schedule X (Prohibited Online)
                    </span>
                  ) : medicine.drugSchedule === "H1" ? (
                    <span className="bg-rose-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                      Schedule H1 (Rx)
                    </span>
                  ) : medicine.prescriptionRequired || medicine.drugSchedule === "H" ? (
                    <span className="bg-amber-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                      Schedule H (Rx Required)
                    </span>
                  ) : (
                    <span className="bg-emerald-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                      OTC Medicine
                    </span>
                  )}
                  {medicine.discountPercentage > 0 && (
                    <span className="bg-primary text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm ml-auto">
                      {medicine.discountPercentage}% OFF
                    </span>
                  )}
                </div>

                {activeImage ? (
                  <Image
                    src={activeImage}
                    alt={medicine.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 500px"
                    className="object-contain p-6 group-hover:scale-125 transition-transform duration-500 ease-out cursor-crosshair"
                    priority
                    unoptimized={activeImage.startsWith("http")}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 rounded-lg animate-pulse" />
                )}

                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-[10px] text-slate-500 font-medium px-2 py-1 rounded-md border border-slate-200 shadow-xs pointer-events-none">
                  Hover to zoom
                </div>
              </div>

              {/* Thumbnails strip */}
              <div className="flex items-center gap-3">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 rounded-xl border-2 p-1.5 bg-slate-50 overflow-hidden transition-all duration-200 ${activeImage === img ? "border-primary shadow-sm scale-102" : "border-slate-200 hover:border-slate-300 opacity-80"
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`${medicine.name} angle ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                      unoptimized={img.startsWith("http")}
                    />
                  </button>
                ))}
              </div>

              {/* Trust Badges under gallery */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck size={18} className="text-primary shrink-0" />
                  <span>100% Genuine WHO-GMP Certified</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <RotateCcw size={18} className="text-primary shrink-0" />
                  <span>7 Days Return Policy</span>
                </div>
              </div>
            </div>

            {/* Right Product Details (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                  {medicine.brand}
                </span>
                <span className="text-xs text-slate-400 capitalize">• {medicine.category.replace("-", " ")}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-2 leading-tight">
                {medicine.name}
              </h1>

              {/* Active Salt Composition with substitute finder */}
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Active Composition:{" "}
                  <Link
                    href={`/search?query=${encodeURIComponent(medicine.composition)}`}
                    className="font-bold text-slate-900 hover:text-primary hover:underline transition-colors"
                  >
                    {medicine.composition}
                  </Link>
                </div>
                <Link
                  href={`/search?query=${encodeURIComponent(medicine.composition)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-white px-2.5 py-1 rounded-lg border border-primary/30 hover:bg-primary hover:text-white transition-colors shadow-2xs"
                >
                  <Sparkles size={12} /> Check Generic Alternatives
                </Link>
              </div>

              {/* Ratings / Genuine Formulation Badge */}
              <div className="flex items-center gap-3 mb-6">
                {medicine.rating && medicine.reviewsCount ? (
                  <>
                    <RatingStars rating={medicine.rating} reviewsCount={medicine.reviewsCount} size={16} />
                    <span className="text-xs text-slate-400">• Verified Buyer Feedback</span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/70 px-3 py-1.5 rounded-lg border border-slate-200/60">
                    <ShieldCheck size={16} className="text-primary" />
                    <span>WHO-GMP Certified Genuine Formulation • Laboratory Batch Tested</span>
                  </div>
                )}
              </div>

              {/* Pricing Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-green-50/70 via-slate-50 to-white border border-green-100 mb-6">
                <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹{medicine.price}</span>
                  {medicine.mrp > medicine.price && (
                    <span className="text-base sm:text-lg text-slate-400 line-through">MRP ₹{medicine.mrp}</span>
                  )}
                  {medicine.discountPercentage > 0 && (
                    <span className="text-xs sm:text-sm font-black text-primary bg-white px-2.5 py-1 rounded-full border border-green-200 shadow-2xs">
                      {medicine.discountPercentage}% OFF
                    </span>
                  )}
                </div>

                {savings > 0 && (
                  <p className="text-xs font-bold text-green-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    You save ₹{savings} ({medicine.discountPercentage}%) vs standard branded MRP
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Inclusive of all taxes • In Stock ({medicine.stock} units available)</p>
              </div>

              {/* Coupon Highlight Box */}
              <div className="mb-6 p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Tag size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Get Extra 20% OFF up to ₹100
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Use code <strong className="text-accent font-bold">FIRST20</strong> on orders above ₹399
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon("FIRST20")}
                  className="px-3 py-1.5 bg-white border border-orange-200 text-accent hover:bg-accent hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedCoupon ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCoupon ? "Copied" : "FIRST20"}
                </button>
              </div>

              {/* Schedule and Prescription Warnings */}
              {medicine.drugSchedule === "X" ? (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl mb-6 text-xs">
                  <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong className="font-bold text-red-950 block text-sm mb-0.5">Schedule X Narcotic / Habit-Forming Substance</strong>
                    <p className="text-red-800">
                      As per the Drugs and Cosmetics Rules, 1945, Schedule X drugs are strictly prohibited from being ordered or dispensed online. Please visit a licensed offline retail pharmacy with a duplicate prescription from a Registered Medical Practitioner.
                    </p>
                  </div>
                </div>
              ) : medicine.drugSchedule === "H1" ? (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl mb-6 text-xs">
                  <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <strong className="font-bold text-rose-950 block text-sm mb-0.5">Schedule H1 Prescription Drug (Strict Rx Record)</strong>
                    <p className="text-rose-800">
                      This medicine is a monitored Schedule H1 drug requiring a doctor prescription. Our registered pharmacist will verify the prescription and maintain statutory dispensing records.
                    </p>
                  </div>
                </div>
              ) : (medicine.prescriptionRequired || medicine.drugSchedule === "H") ? (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6 text-xs">
                  <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-950 block text-sm mb-0.5">Schedule H Prescription Required (Rx)</strong>
                    <p className="text-amber-800">
                      This medicine requires a valid doctor prescription. You can attach it during checkout or upload it to your Prescription repository. Orders are dispatched after pharmacist approval.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Quantity & CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <div className="flex items-center border border-slate-300 rounded-xl bg-white h-12 w-fit shadow-xs">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={medicine.drugSchedule === "X"}
                    className="px-3.5 h-full text-slate-600 hover:text-primary hover:bg-slate-50 transition rounded-l-xl disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-bold text-slate-900 text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    disabled={medicine.drugSchedule === "X"}
                    className="px-3.5 h-full text-slate-600 hover:text-primary hover:bg-slate-50 transition rounded-r-xl disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {medicine.drugSchedule === "X" ? (
                  <div className="flex-1 h-12 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold flex items-center justify-center text-sm cursor-not-allowed">
                    Prohibited from Online Sale (Offline Retail Only)
                  </div>
                ) : isOtcOnlyMode() && !isOtcMedicine(medicine) ? (
                  <div className="flex-1 h-12 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold flex items-center justify-center text-sm cursor-not-allowed">
                    {OTC_ONLY_STOREFRONT_LABEL}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
                    >
                      <ShoppingCart size={18} />
                      Add to Cart • ₹{medicine.price * qty}
                    </button>

                    <button
                      onClick={handleBuyNow}
                      className="h-12 px-6 bg-accent hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
                    >
                      <Zap size={18} />
                      Buy Now
                    </button>
                  </>
                )}
              </div>

              {/* Pincode delivery checker */}
              <div className="border-t border-slate-100 pt-5 mt-2">
                <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> Delivery & Pincode Checker
                </span>
                <form onSubmit={handleCheckPincode} className="flex gap-2 max-w-sm mb-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter 6-digit Pincode (e.g. 110001)"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingPincode}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    {isCheckingPincode ? "Checking..." : "Check"}
                  </button>
                </form>

                {pincodeStatus ? (
                  <p className="text-xs text-primary font-bold flex items-center gap-1.5 mt-1">
                    <Check size={14} /> {pincodeStatus}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Enter your delivery pincode to check instant express availability & COD.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Detailed Tabs: Overview, Dosage, Side Effects, Standards */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 mb-12">
          <Tabs.Root defaultValue="description" className="w-full">
            <Tabs.List className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar gap-8 mb-6">
              {[
                { id: "description", label: "Product Overview & Uses" },
                { id: "directions", label: "Dosage & Directions" },
                { id: "sideEffects", label: "Side Effects & Safety" },
                { id: "specifications", label: "Drug Specifications" },
                { id: "faqs", label: "FAQs" },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className="pb-4 text-sm font-bold text-slate-500 hover:text-slate-900 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary capitalize whitespace-nowrap outline-none transition-colors"
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="description" className="text-slate-700 leading-relaxed outline-none text-sm sm:text-base space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Product Overview</h3>
              <p>{medicine.description}</p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
                <h4 className="font-bold text-slate-900 text-sm mb-2">Key Therapeutic Benefits:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  <li>Rapid relief from clinical symptoms under medical supervision.</li>
                  <li>WHO-GMP certified generic formulation guaranteeing bioequivalence to premium innovator brands.</li>
                  <li>Rigorous quality testing through NABL accredited analytical laboratories.</li>
                  <li>Affordable pricing saving up to 80% on long-term treatment costs.</li>
                </ul>
              </div>
            </Tabs.Content>

            <Tabs.Content value="directions" className="text-slate-700 leading-relaxed outline-none text-sm sm:text-base space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Recommended Usage & Dosage</h3>
              <p>{medicine.directions}</p>
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 mt-4 text-xs text-amber-900">
                <strong>Important Notice:</strong> Never exceed the prescribed dose. Always complete the full course prescribed by your physician, even if you start feeling better.
              </div>
            </Tabs.Content>

            <Tabs.Content value="sideEffects" className="text-slate-700 leading-relaxed outline-none text-sm sm:text-base space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Potential Side Effects & Precautions</h3>
              <p>{medicine.sideEffects}</p>
              <p className="text-xs text-slate-500 mt-3">
                Most side effects are temporary and do not require medical intervention. If severe symptoms persist or cause discomfort, consult your treating doctor promptly.
              </p>
            </Tabs.Content>

            <Tabs.Content value="specifications" className="outline-none text-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Pharmaceutical Profile</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Brand Name:</span>
                  <span className="font-bold text-slate-800">{medicine.brand}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Generic Salt:</span>
                  <span className="font-bold text-slate-800">{medicine.composition}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Therapeutic Category:</span>
                  <span className="font-bold text-slate-800 capitalize">{medicine.category.replace("-", " ")}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Drug Schedule:</span>
                  <span className="font-bold text-slate-800">{medicine.prescriptionRequired ? "Schedule H (Prescription Only)" : "Over-The-Counter (OTC)"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Storage Conditions:</span>
                  <span className="font-bold text-slate-800">Store below 25°C in a dry place away from direct sunlight</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Country of Origin:</span>
                  <span className="font-bold text-slate-800">India (Made in India)</span>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="faqs" className="outline-none text-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Frequently Asked Questions</h3>
              {medicine.faqs && medicine.faqs.length > 0 ? (
                <div className="space-y-3">
                  {medicine.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-start gap-2">
                        <span className="text-primary font-black">Q{idx + 1}.</span> {faq.question}
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed pl-6">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No FAQs available for this medicine.</p>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* Similar Medicines & Generic Alternatives */}
        {similarMedicines.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Similar Medicines & Substitutes</h2>
                <p className="text-xs sm:text-sm text-slate-500">Other recommended generic formulations in {medicine.category.replace("-", " ")}</p>
              </div>
              <Link
                href={`/categories/${medicine.category}`}
                className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                View all <ChevronRight size={16} />
              </Link>
            </div>

            {(medicine.drugSchedule === "H" || medicine.drugSchedule === "H1" || medicine.prescriptionRequired) && (
              <div className="mb-4 p-3 bg-amber-50 text-amber-800 text-xs sm:text-sm rounded-xl border border-amber-200">
                <strong className="font-bold">Medical Disclaimer:</strong> This is a prescription medicine. Please consult your doctor or pharmacist before switching to a substitute, even if the composition is the same.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarMedicines.map((item) => {
                const savings = medicine.price - item.price;
                const savingsPercent = Math.round((savings / medicine.price) * 100);
                const isSubstitute = item.composition === medicine.composition;
                return (
                  <div key={item.id} className="relative">
                    {isSubstitute && savings > 0 && (
                      <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                        Save {savingsPercent}% (₹{savings})
                      </div>
                    )}
                    <MedicineCard medicine={item} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link href="/medicines" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm">
            <ArrowLeft size={16} /> Back to all medicines
          </Link>
        </div>
      </div>
    </div>
  );
}
