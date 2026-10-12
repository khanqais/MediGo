"use client";

import { usePathname } from "next/navigation";
import TopBanner from "@/components/layout/TopBanner";
import Navbar from "@/components/layout/Navbar";
import SubNav from "@/components/layout/SubNav";
import MobileNav from "@/components/layout/MobileNav";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <div className="flex-1 min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <TopBanner />
      <Navbar />
      <SubNav />
      <CartDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}
