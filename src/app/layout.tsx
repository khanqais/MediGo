import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/providers";
import StoreLayout from "@/components/layout/StoreLayout";
import Footer from "@/components/layout/Footer";

const inter = localFont({
  src: "../fonts/inter.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: true,
});

export const metadata: Metadata = {
  title: "MediQuick — India's Best Generic Medicine Delivery",
  description: "Order 100% authentic WHO-GMP certified generic medicines online with up to 80% savings. Express delivery in 2 hours across India.",
  keywords: ["online pharmacy", "generic medicines", "buy medicine online", "discount pharmacy India", "MediQuick"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://dfnaesnbumckoiibmbil.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dfnaesnbumckoiibmbil.supabase.co" />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-primary/20 selection:text-primary-dark`}>
        <Providers>
          <StoreLayout footer={<Footer />}>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
