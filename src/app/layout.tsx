import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/providers";
import StoreLayout from "@/components/layout/StoreLayout";
import Footer from "@/components/layout/Footer";

const bricolage = localFont({
  src: "../fonts/bricolage-grotesque.woff2",
  variable: "--font-heading",
  display: "swap",
  weight: "400 800",
  fallback: ["system-ui", "sans-serif"],
  preload: true,
});

const atkinson = localFont({
  src: [
    {
      path: "../fonts/atkinson-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/atkinson-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true,
});

const notoDevanagari = localFont({
  src: "../fonts/noto-sans-devanagari.woff2",
  variable: "--font-noto-devanagari",
  display: "swap",
  weight: "400 700",
  fallback: ["sans-serif"],
  preload: false,
});

export const metadata: Metadata = {
  title: "MediGo / MediQuick — Generic Pharmacy India",
  description: "Order authentic WHO-GMP certified generic medicines online with transparent pricing. Express delivery across India with licensed pharmacist verification.",
  keywords: ["online pharmacy", "generic medicines", "buy medicine online", "discount pharmacy India", "MediQuick", "MediGo"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${atkinson.variable} ${notoDevanagari.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://dfnaesnbumckoiibmbil.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dfnaesnbumckoiibmbil.supabase.co" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-accent selection:text-foreground">
        <Providers>
          <StoreLayout footer={<Footer />}>{children}</StoreLayout>
        </Providers>
      </body>
    </html>
  );
}
