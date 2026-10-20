"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload, Sparkles } from "lucide-react";

const subLinks = [
  { label: "All medicines", href: "/medicines" },
  { label: "Generic medicines", href: "/medicines?filter=generics" },
  { label: "Diabetes care", href: "/medicines?category=diabetes" },
  { label: "Cardiac care", href: "/medicines?category=heart" },
  { label: "Dermatology", href: "/medicines?category=skin-care" },
  { label: "Pediatric care", href: "/medicines?category=baby-care" },
  { label: "Ayurveda", href: "/medicines?category=ayurveda" },
  { label: "Today's deals", href: "/offers", isDeal: true },
  { label: "Upload prescription", href: "/prescriptions", isUpload: true },
];

export default function SubNav() {
  const pathname = usePathname();

  return (
    <div className="bg-muted/40 border-b border-border hidden md:block">
      <div className="container mx-auto px-4">
        <ul className="flex items-center gap-1.5 overflow-x-auto py-2 text-xs font-semibold whitespace-nowrap">
          {subLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.label} className="shrink-0">
                <Link
                  href={item.href}
                  className={`px-3 py-1.5 rounded-sm inline-flex items-center gap-1.5 transition-colors ${
                    item.isUpload
                      ? "bg-accent text-accent-foreground hover:bg-accent-hover font-bold border border-foreground/20 shadow-xs ml-auto"
                      : item.isDeal
                      ? "bg-card text-foreground hover:bg-card/80 border border-border font-bold"
                      : isActive
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-foreground/80 hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                  }`}
                >
                  {item.isUpload && <Upload size={13} className="text-foreground" />}
                  {item.isDeal && <Sparkles size={13} className="text-primary" />}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
