"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Upload, ShoppingBag, Home, User } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useState } from "react";

export default function MobileNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((state) => state.cartCount());
  const openDrawer = useCartStore((state) => state.openDrawer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      aria-label="Mobile sticky action bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-drawer px-2 py-1 flex items-center justify-around safe-bottom"
    >
      {/* Home */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 transition-colors ${
          pathname === "/" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Home"
      >
        <Home size={20} className={pathname === "/" ? "stroke-[2.5]" : "stroke-[1.75]"} />
        <span className="text-[10px] mt-0.5">Home</span>
      </Link>

      {/* Search */}
      <Link
        href="/search"
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 transition-colors ${
          pathname.startsWith("/search") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Search medicines"
      >
        <Search size={20} className={pathname.startsWith("/search") ? "stroke-[2.5]" : "stroke-[1.75]"} />
        <span className="text-[10px] mt-0.5">Search</span>
      </Link>

      {/* Upload Prescription - Main prominent action */}
      <Link
        href="/prescriptions"
        className="flex flex-col items-center justify-center -mt-3.5"
        aria-label="Upload prescription"
      >
        <div className="size-12 rounded-full bg-accent text-accent-foreground border-2 border-foreground/80 flex items-center justify-center shadow-md active:scale-95 transition-transform">
          <Upload size={22} className="stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-bold text-foreground mt-0.5">Upload Rx</span>
      </Link>

      {/* Cart Drawer Trigger */}
      <button
        onClick={openDrawer}
        className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Open cart with ${cartCount} items`}
      >
        <div className="relative">
          <ShoppingBag size={20} className="stroke-[1.75]" />
          {mounted && cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-accent text-accent-foreground font-black text-[9px] px-1 rounded-sm border border-foreground/20 leading-tight">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Cart</span>
      </button>

      {/* Account */}
      <Link
        href="/profile"
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 transition-colors ${
          pathname.startsWith("/profile") || pathname.startsWith("/orders")
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="User account"
      >
        <User size={20} className={pathname.startsWith("/profile") ? "stroke-[2.5]" : "stroke-[1.75]"} />
        <span className="text-[10px] mt-0.5">Account</span>
      </Link>
    </nav>
  );
}
