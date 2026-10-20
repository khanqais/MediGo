import { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin-access";

export const metadata: Metadata = {
  title: "Admin & Pharmacist Portal | MediQuick",
  description: "Pharmacy order management, prescription scrutiny, and catalog control.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const emailAllowed = isAdminEmail(user.email);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Auto-promote allow-listed users so RLS policies (which read profiles.role)
  // pass for all DB queries. Uses a SECURITY DEFINER RPC — no service key needed.
  if (emailAllowed && profile?.role !== "admin" && profile?.role !== "pharmacist") {
    try {
      await supabase.rpc("promote_self_to_admin", { target_user_id: user.id });
    } catch {
      // RPC not yet deployed — portal still works via ADMIN_EMAILS gate but
      // some table reads may be blocked by RLS until the migration is applied.
    }
  }

  const effectiveRole = emailAllowed ? "admin" : profile?.role;

  if (effectiveRole !== "admin" && effectiveRole !== "pharmacist") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      <AdminSidebar effectiveRole={effectiveRole} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
