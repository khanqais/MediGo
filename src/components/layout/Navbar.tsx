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

  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
  }, []);
  
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
    <nav className="sticky top-0 z-50 w-full bg-card border-b border-border shadow-xs">
      {/* Main Navbar Bar */}
      <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3 md:gap-6">
        {/* Left: Mobile Hamburger & Logo */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:bg-muted rounded-md transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
              <Pill className="h-6 w-6 stroke-[2.25]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-2xl text-foreground tracking-tight flex items-center leading-none">
                Medi<span className="text-primary">Go</span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground mt-0.5 hidden sm:inline">
                Verified Indian Generic Pharmacy
              </span>
            </div>
          </Link>
        </div>

        {/* Location Picker */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setLocationMenuOpen(!locationMenuOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-foreground bg-muted/60 hover:bg-muted border border-border px-3.5 py-2 rounded-md transition min-h-[44px]"
          >
            <MapPin size={16} className="text-primary shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground leading-none">Deliver to</p>
              <p className="font-bold text-foreground leading-tight mt-0.5">{selectedCity}</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>

          {locationMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-md shadow-dropdown py-2 z-50">
              <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground">Select pin code</p>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setLocationMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition ${
                    selectedCity === city ? "text-primary font-bold bg-muted/80" : "text-foreground"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Search Bar with printed label styling */}
        <div className="flex-1 max-w-xl hidden md:block relative z-50">
          <form onSubmit={handleSearchSubmit} className="flex items-center relative z-50">
            <div className="relative w-full flex items-center rounded-md border-2 border-foreground/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-card shadow-xs overflow-hidden">
              <select
                value={categoryPrefix}
                onChange={(e) => setCategoryPrefix(e.target.value)}
                className="h-11 pl-3 pr-2 text-xs font-semibold text-foreground bg-muted/50 border-r border-border outline-none cursor-pointer hover:bg-muted"
                aria-label="Filter by department"
              >
                <option value="All">All medicines</option>
                <option value="Medicines">Generics</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Syrups">Syrups</option>
                <option value="Skin">Dermatology</option>
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
                placeholder="Search medicine name, active salt, strength (e.g. Paracetamol 500mg)..."
                className="flex-1 h-11 px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
              />

              <button
                type="submit"
                className="h-9 px-4 mr-1 bg-primary text-primary-foreground hover:bg-primary-dark font-semibold rounded-sm flex items-center justify-center transition active:scale-95 shadow-xs"
                aria-label="Search medicines"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && searchQuery.trim() && (
            <div className="absolute top-full mt-2 w-full bg-card rounded-md shadow-dropdown border border-border overflow-hidden z-[60]">
              {isSearching ? (
                <div className="p-4 text-xs text-muted-foreground text-center">Searching pharmacy directory...</div>
              ) : suggestions.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                  {suggestions.map((med, index) => (
                    <li 
                      key={med.id} 
                      className={`${index === highlightedIndex ? 'bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      <Link 
                        href={`/medicines/${med.slug}`}
                        className="block p-3"
                        onClick={() => setShowSuggestions(false)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-sm text-foreground">{med.name}</span>
                          <span className="font-mono text-sm font-bold text-primary">₹{med.price}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{med.composition}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {med.packSize && (
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {med.packSize}
                            </span>
                          )}
                          {med.prescriptionRequired && (
                            <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                              • Prescription required
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">No medicines found matching &ldquo;{searchQuery}&rdquo;.</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wishlist */}
          <Link
            href="/medicines"
            className="hidden lg:flex items-center justify-center text-foreground hover:text-primary p-2 rounded-md hover:bg-muted transition min-h-[44px] min-w-[44px]"
            title="Browse catalogue"
            aria-label="Catalogue"
          >
            <Heart size={20} className="stroke-[1.75]" />
          </Link>

          {/* Staff Portal Link if Admin or Pharmacist */}
          {mounted && isAuthenticated && (profile?.role === "admin" || profile?.role === "pharmacist") && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-2 rounded-md transition min-h-[44px]"
            >
              <ShieldCheck size={16} />
              <span>{profile.role === "admin" ? "Admin portal" : "Pharmacist portal"}</span>
            </Link>
          )}

          {/* User Account / Sign In */}
          {mounted && isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary px-3 py-2 rounded-md hover:bg-muted transition min-h-[44px]"
            >
              <User size={18} className="text-primary stroke-[2]" />
              <span className="max-w-[120px] truncate">{profile?.full_name ? profile.full_name.split(" ")[0] : "Account"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary px-3 py-2 rounded-md hover:bg-muted transition min-h-[44px]"
            >
              <User size={18} className="text-muted-foreground stroke-[1.75]" />
              <span>Sign in</span>
            </Link>
          )}

          {/* Cart Button with Label Yellow Accent Badge */}
          <button
            onClick={openDrawer}
            className="relative flex items-center gap-2 bg-card hover:bg-muted border border-border text-foreground px-3.5 py-2 rounded-md transition shadow-xs group min-h-[44px]"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <ShoppingBag size={20} className="text-primary stroke-[2.25]" />
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
            {mounted && cartCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-foreground bg-accent border border-foreground/20 rounded-sm min-w-[20px] h-5">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="p-3 border-t border-border md:hidden bg-muted/30">
        <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine name, salt, strength..."
            className="w-full h-11 pl-4 pr-11 text-sm rounded-md border-2 border-foreground/70 focus:outline-none focus:border-primary bg-card text-foreground placeholder:text-muted-foreground shadow-xs"
          />
          <button 
            type="submit" 
            className="absolute right-0 h-full px-3 text-muted-foreground hover:text-primary min-w-[44px] flex items-center justify-center"
            aria-label="Search medicines"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 py-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <MapPin size={16} className="text-primary" />
              <span>Deliver to: <strong>{selectedCity}</strong></span>
            </div>
            {mounted && isAuthenticated ? (
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-primary">
                My account ({profile?.full_name ? profile.full_name.split(" ")[0] : "Profile"})
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-primary">
                Sign in / Register
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-foreground">
            <Link href="/medicines" onClick={() => setMobileMenuOpen(false)} className="p-3 bg-muted/60 rounded-md hover:bg-muted min-h-[44px] flex items-center">
              All medicines
            </Link>
            <Link href="/prescriptions" onClick={() => setMobileMenuOpen(false)} className="p-3 bg-muted/60 rounded-md hover:bg-muted min-h-[44px] flex items-center">
              Upload prescription
            </Link>
            <Link href="/offers" onClick={() => setMobileMenuOpen(false)} className="p-3 bg-muted/60 rounded-md hover:bg-muted min-h-[44px] flex items-center">
              Deals & discounts
            </Link>
            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="p-3 bg-muted/60 rounded-md hover:bg-muted min-h-[44px] flex items-center">
              Order history
            </Link>
            {mounted && isAuthenticated && (profile?.role === "admin" || profile?.role === "pharmacist") && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="p-3 bg-primary/10 text-primary font-bold rounded-md hover:bg-primary/20 col-span-2 min-h-[44px] flex items-center">
                Staff portal ({profile.role === "admin" ? "Admin" : "Pharmacist"})
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
