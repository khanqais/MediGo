"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingBag, 
  Pill, 
  Users, 
  ExternalLink, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  Package
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin", "pharmacist"],
  },
  {
    name: "Prescriptions",
    href: "/admin/prescriptions",
    icon: FileText,
    roles: ["admin", "pharmacist"],
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    roles: ["admin", "pharmacist"],
  },
  {
    name: "Medicines",
    href: "/admin/medicines",
    icon: Pill,
    roles: ["admin", "pharmacist"],
  },
  {
    name: "Users & Staff",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentRole = mounted && profile?.role ? profile.role : "pharmacist";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(currentRole)
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-xs">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">MediQuick</span>
            <span className="ml-1.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase">
              Portal
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                MediQuick
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Pharmacist & Staff Portal</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            {mounted && profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {mounted && profile?.full_name ? profile.full_name : "Staff Member"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 capitalize font-medium">
                {mounted ? currentRole : "pharmacist"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            href="/"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-3">
              <ExternalLink size={18} className="text-slate-400" />
              <span>Back to Store</span>
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
