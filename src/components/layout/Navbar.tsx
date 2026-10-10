"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Search, MapPin, User, ShoppingBag, Pill, Heart, ChevronDown, Menu, X, ShieldCheck
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const router = useRouter();
  const cartCount = useCartStore((state) => state.cartCount());
  const openDrawer = useCartStore((state) => state.openDrawer);

  const { isAuthenticated, profile } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryPrefix, setCategoryPrefix] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Mumbai 400001");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  useEffect(() => {
    setHighlightedIndex(-1);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    
    const abortController = new AbortController();
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=5`, {
          signal: abortController.signal
        });
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.data || []);
        } else {
          setSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Search failed", err);
          setSuggestions([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      abortController.abort();
    };
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      router.push(`/medicines/${suggestions[highlightedIndex].slug}`);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const cities = ["Mumbai 400001", "Delhi 110001", "Bengaluru 560001", "Hyderabad 500001", "Chennai 600001", "Kolkata 700001"];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/medicines");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-xs">
      {/* Main Navbar Bar */}
      <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3 md:gap-6">
        {/* Left: Mobile Hamburger & Logo */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-xs">
              <Pill className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight flex items-center">
                Medi<span className="text-primary">Quick</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider hidden sm:inline -mt-1">
                GENERIC PHARMACY
              </span>
            </div>
          </Link>
        </div>

        {/* Location Picker */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setLocationMenuOpen(!locationMenuOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition"
          >
            <MapPin size={16} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 leading-none">Deliver to</p>
              <p className="font-bold text-slate-800 leading-tight">{selectedCity}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {locationMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Pincode</p>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setLocationMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-green-50 hover:text-primary transition ${
                    selectedCity === city ? "text-primary font-bold bg-green-50/50" : "text-slate-700"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Search Bar with category dropdown prefix */}
        <div className="flex-1 max-w-xl hidden md:block relative z-50">
          <form onSubmit={handleSearchSubmit} className="flex items-center relative z-50">
            <div className="relative w-full flex items-center shadow-xs rounded-full border border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-white overflow-hidden">
              <select
                value={categoryPrefix}
                onChange={(e) => setCategoryPrefix(e.target.value)}
                className="h-11 pl-3.5 pr-2 text-xs font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="All">All</option>
                <option value="Medicines">Medicines</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Syrups">Syrups</option>
                <option value="Skin">Skin Care</option>
              </select>
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder="Search medicines, brands, salt names..."
                className="flex-1 h-11 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
              />

              <button
                type="submit"
                className="h-9 px-4 mr-1 bg-primary text-white hover:bg-primary-dark font-semibold rounded-full flex items-center justify-center transition active:scale-95 shadow-xs"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && searchQuery.trim() && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[60]">
              {isSearching ? (
                <div className="p-4 text-sm text-slate-500 text-center">Searching...</div>
              ) : suggestions.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto">
                  {suggestions.map((med, index) => (
                    <li 
                      key={med.id} 
                      className={`border-b border-slate-100 last:border-0 ${index === highlightedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <Link 
                        href={`/medicines/${med.slug}`}
                        className="block p-3"
                        onClick={() => setShowSuggestions(false)}
                      >
                        <div className="font-bold text-sm text-slate-900">{med.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{med.composition}</div>
                        <div className="text-xs font-bold text-primary mt-1">₹{med.price}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-sm text-slate-500 text-center">No medicines found.</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Wishlist */}
          <Link
            href="/medicines"
            className="hidden lg:flex items-center gap-1 text-slate-700 hover:text-primary p-2 rounded-xl hover:bg-slate-50 transition"
            title="Wishlist"
          >
            <Heart size={20} className="stroke-[1.75]" />
          </Link>

          {/* Staff Portal Link if Admin or Pharmacist */}
          {isAuthenticated && (profile?.role === "admin" || profile?.role === "pharmacist") && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition shadow-xs"
            >
              <ShieldCheck size={15} />
              <span>{profile.role === "admin" ? "Admin Portal" : "Pharmacist Portal"}</span>
            </Link>
          )}

          {/* User Account / Sign In */}
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary px-3 py-2 rounded-xl hover:bg-slate-50 transition"
            >
              <User size={20} className="text-primary stroke-[2]" />
              <span className="max-w-[120px] truncate">{profile?.full_name ? profile.full_name.split(" ")[0] : "Account"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary px-3 py-2 rounded-xl hover:bg-slate-50 transition"
            >
              <User size={20} className="text-slate-600 stroke-[1.75]" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Cart Button with Orange Badge */}
          <button
            onClick={openDrawer}
            className="relative flex items-center gap-2 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-primary/40 text-slate-800 px-3.5 py-2 rounded-full transition shadow-xs group active:scale-95"
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag size={20} className="text-primary stroke-[2.25]" />
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-black text-white bg-accent rounded-full min-w-[20px] h-5 shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="p-3 border-t border-slate-100 md:hidden bg-slate-50/70">
        <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicines, salts..."
            className="w-full h-10 pl-4 pr-10 text-sm rounded-full border border-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white shadow-xs"
          />
          <button type="submit" className="absolute right-0 h-full px-3 text-slate-500 hover:text-primary">
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <MapPin size={16} className="text-primary" />
              <span>Deliver to: <strong>{selectedCity}</strong></span>
            </div>
            {isAuthenticated ? (
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-primary">
                My Account ({profile?.full_name ? profile.full_name.split(" ")[0] : "Profile"})
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-primary">
                Sign In / Register
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-slate-700">
            <Link href="/medicines" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg hover:bg-green-50">
              💊 All Medicines
            </Link>
            <Link href="/prescriptions" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg hover:bg-green-50">
              📄 Upload Prescription
            </Link>
            <Link href="/offers" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg hover:bg-green-50">
              🔥 Today&apos;s Deals
            </Link>
            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg hover:bg-green-50">
              📦 Track Orders
            </Link>
            {isAuthenticated && (profile?.role === "admin" || profile?.role === "pharmacist") && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-emerald-50 text-emerald-800 font-semibold rounded-lg hover:bg-emerald-100 col-span-2">
                🛡️ {profile.role === "admin" ? "Admin Portal" : "Pharmacist Portal"}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
