"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Users, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  ShoppingBag, 
  IndianRupee, 
  Phone, 
  Mail, 
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/types/user";
import { useAuthStore } from "@/store/authStore";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  ordersCount: number;
  totalSpent: number;
  created_at: string;
}

const ROLE_BADGES: Record<UserRole, { label: string; style: string }> = {
  customer: { label: "Customer", style: "bg-slate-100 text-slate-700 border-slate-200" },
  pharmacist: { label: "Pharmacist", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  delivery: { label: "Delivery Partner", style: "bg-sky-50 text-sky-700 border-sky-200" },
  admin: { label: "Administrator", style: "bg-purple-50 text-purple-700 border-purple-200" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const { profile: currentAuthProfile } = useAuthStore();

  // Role Promotion Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>("customer");
  const [roleUpdating, setRoleUpdating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      } else {
        toast.error(json.error || "Failed to load users");
      }
    } catch (err) {
      toast.error("Network error fetching users");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openRoleModal = (u: UserProfile) => {
    setSelectedUser(u);
    setTargetRole(u.role);
  };

  const handleRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (currentAuthProfile?.id === selectedUser.id && targetRole !== "admin") {
      toast.error("You cannot demote your own administrator account.");
      return;
    }

    try {
      setRoleUpdating(true);
      const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(json.error || "Failed to update role");
      }
    } catch (err) {
      toast.error("Error communicating with server");
    } finally {
      setRoleUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatches = u.full_name?.toLowerCase().includes(q);
    const emailMatches = u.email?.toLowerCase().includes(q);
    const phoneMatches = u.phone?.toLowerCase().includes(q);
    return nameMatches || emailMatches || phoneMatches;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Directory & Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Customer order activity and staff role promotions (Pharmacist / Delivery Partner).
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Role:</span>
          {["ALL", "customer", "pharmacist", "delivery", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition ${
                roleFilter === r
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r === "ALL" ? "All Users" : r}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">User Details</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Order Activity</th>
                <th className="py-3 px-4 font-semibold">Joined Date</th>
                <th className="py-3 px-4 font-semibold text-right">Access Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_BADGES[user.role] || ROLE_BADGES.customer;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {user.full_name || "Name not set"}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-800">{user.email}</div>
                        <div className="text-slate-400 mt-0.5">{user.phone || "No phone linked"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleConfig.style}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-slate-900">
                          {user.ordersCount} orders placed
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Total spent: ₹{user.totalSpent.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{users.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> users (Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>)
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={page >= totalPages || loading} 
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Role Promotion Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <ShieldCheck size={22} />
              <h3 className="font-bold text-slate-900 text-base">Modify User Role</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Update role permissions for <strong>{selectedUser.full_name || selectedUser.email}</strong>.
            </p>

            <form onSubmit={handleRoleUpdate} className="space-y-4">
              <div className="space-y-2">
                {[
                  {
                    role: "customer" as UserRole,
                    title: "Customer",
                    desc: "Standard e-commerce customer. Can place orders and upload prescriptions.",
                  },
                  {
                    role: "pharmacist" as UserRole,
                    title: "Licensed Pharmacist",
                    desc: "Authorized to verify prescriptions, inspect Schedule H orders, and edit medicines.",
                  },
                  {
                    role: "delivery" as UserRole,
                    title: "Delivery Partner",
                    desc: "Can view assigned delivery dispatch orders and verify delivery OTP.",
                  },
                  {
                    role: "admin" as UserRole,
                    title: "System Administrator",
                    desc: "Full unrestricted access across orders, catalog, audit logs, and user roles.",
                  },
                ].map((item) => (
                  <label
                    key={item.role}
                    className={`block p-3 rounded-2xl border cursor-pointer transition ${
                      targetRole === item.role
                        ? "border-emerald-600 bg-emerald-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{item.title}</span>
                      <input
                        type="radio"
                        name="userRoleRadio"
                        value={item.role}
                        checked={targetRole === item.role}
                        onChange={() => setTargetRole(item.role)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">{item.desc}</p>
                  </label>
                ))}
              </div>

              {currentAuthProfile?.id === selectedUser.id && targetRole !== "admin" && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>Self-demotion is restricted to prevent administrative lockout.</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleUpdating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {roleUpdating ? "Updating..." : "Save Role Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
