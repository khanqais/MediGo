"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Package, FileText, MapPin, LogOut, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, profile, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Profile", icon: User, path: "/profile" },
    { name: "My Orders", icon: Package, path: "/orders" },
    { name: "Prescriptions", icon: FileText, path: "/prescriptions" },
    { name: "Addresses", icon: MapPin, path: "/addresses" },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-slate-50 min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-slate-50 min-h-[80vh]">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={32} />
              </div>
              <h3 className="font-bold text-slate-900">{profile?.full_name || "User"}</h3>
              <p className="text-sm text-slate-500">{profile?.email || ""}</p>
            </div>
            
            <nav className="p-2">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <item.icon size={18} className={isActive ? "text-primary" : "text-slate-400"} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
