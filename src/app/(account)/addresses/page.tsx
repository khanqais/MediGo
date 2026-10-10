"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// All Indian States and Union Territories
const INDIAN_STATES = [
  // States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Zod schema matching the DB addresses table
const addressSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200, "Name is too long"),
  phone: z.string().min(1, "Phone number is required").max(20, "Phone number is too long"),
  address_line_1: z.string().min(1, "Address is required").max(500, "Address is too long"),
  address_line_2: z.string().max(500).optional().default(""),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postal_code: z.string().min(1, "Postal code is required").max(20),
  landmark: z.string().max(200).optional().default(""),
  is_default: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Address extends AddressFormData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const emptyForm: AddressFormData = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  landmark: "",
  is_default: false,
};

export default function AddressesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchAddresses = useCallback(async (uid: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Unable to load addresses.");
        return;
      }
      setAddresses(data || []);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchAddresses(user.id);
      } else {
        setIsLoading(false);
      }
    }
    initUser();
  }, [fetchAddresses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setFieldErrors({});

    // Validate with Zod
    const result = addressSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // If set as default, remove default flag from other addresses
      if (result.data.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", userId);
      }

      if (editingId) {
        // Update existing address — restricted to logged-in user's row
        const { error } = await supabase
          .from("addresses")
          .update(result.data)
          .eq("id", editingId)
          .eq("user_id", userId);

        if (error) {
          toast.error("Unable to update address. Please try again.");
          return;
        }
        toast.success("Address updated successfully");
      } else {
        // Create new address — restricted to logged-in user's row
        const { error } = await supabase
          .from("addresses")
          .insert({ ...result.data, user_id: userId });

        if (error) {
          toast.error("Unable to save address. Please try again.");
          return;
        }
        toast.success("Address added successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
      await fetchAddresses(userId);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setFormData({
      full_name: addr.full_name,
      phone: addr.phone,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || "",
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      landmark: addr.landmark || "",
      is_default: addr.is_default,
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        toast.error("Unable to delete address. Please try again.");
        return;
      }

      toast.success("Address deleted");
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Network error. Please check your connection.");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
    setFieldErrors({});
  };

  const updateField = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Saved Addresses</h2>
        <button 
          onClick={() => { 
            setEditingId(null); 
            setFormData({ ...emptyForm }); 
            setFieldErrors({}); 
            setShowForm(true); 
          }} 
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add New Address
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-slate-200 rounded-xl bg-slate-50 relative animate-in fade-in zoom-in-95">
          <button type="button" onClick={handleCancel} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
          <h3 className="font-bold text-sm mb-4">{editingId ? "Edit address" : "Add a new address"}</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <input 
                required 
                placeholder="Full Name" 
                value={formData.full_name} 
                onChange={(e) => updateField("full_name", e.target.value)} 
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary ${fieldErrors.full_name ? 'border-red-400' : 'border-slate-300'}`} 
              />
              {fieldErrors.full_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</p>}
            </div>
            <div>
              <input 
                required 
                placeholder="Phone Number" 
                value={formData.phone} 
                onChange={(e) => updateField("phone", e.target.value)} 
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary ${fieldErrors.phone ? 'border-red-400' : 'border-slate-300'}`} 
              />
              {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <input 
                required 
                placeholder="Address Line 1" 
                value={formData.address_line_1} 
                onChange={(e) => updateField("address_line_1", e.target.value)} 
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary ${fieldErrors.address_line_1 ? 'border-red-400' : 'border-slate-300'}`} 
              />
              {fieldErrors.address_line_1 && <p className="text-red-500 text-xs mt-1">{fieldErrors.address_line_1}</p>}
            </div>
            <div className="sm:col-span-2">
              <input 
                placeholder="Address Line 2 (Optional)" 
                value={formData.address_line_2} 
                onChange={(e) => updateField("address_line_2", e.target.value)} 
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-primary" 
              />
            </div>
            <div>
              <input 
                required 
                placeholder="City" 
                value={formData.city} 
                onChange={(e) => updateField("city", e.target.value)} 
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary ${fieldErrors.city ? 'border-red-400' : 'border-slate-300'}`} 
              />
              {fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
            </div>
            <div>
              <select
                required
                value={formData.state}
                onChange={(e) => updateField("state", e.target.value)}
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary appearance-none cursor-pointer ${fieldErrors.state ? 'border-red-400' : 'border-slate-300'} ${!formData.state ? 'text-slate-400' : 'text-slate-900'}`}
              >
                <option value="" disabled>State / UT</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {fieldErrors.state && <p className="text-red-500 text-xs mt-1">{fieldErrors.state}</p>}
            </div>
            <div>
              <input 
                required 
                placeholder="Postal Code" 
                value={formData.postal_code} 
                onChange={(e) => updateField("postal_code", e.target.value)} 
                className={`w-full px-3 py-2 bg-white text-slate-900 border rounded-lg outline-none focus:border-primary ${fieldErrors.postal_code ? 'border-red-400' : 'border-slate-300'}`} 
              />
              {fieldErrors.postal_code && <p className="text-red-500 text-xs mt-1">{fieldErrors.postal_code}</p>}
            </div>
            <div>
              <input 
                placeholder="Landmark (Optional)" 
                value={formData.landmark} 
                onChange={(e) => updateField("landmark", e.target.value)} 
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-primary" 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="is_default" 
              checked={formData.is_default} 
              onChange={(e) => updateField("is_default", e.target.checked)} 
              className="focus:ring-primary h-4 w-4 text-primary border-slate-300 rounded" 
            />
            <label htmlFor="is_default" className="text-sm text-slate-700">Set as default address</label>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="mt-4 bg-primary text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : (editingId ? "Update Address" : "Save Address")}
          </button>
        </form>
      )}
      
      <div className="grid md:grid-cols-2 gap-4">
        {addresses.length === 0 ? (
          <p className="text-sm text-slate-500 col-span-2 py-4">No addresses saved yet.</p>
        ) : addresses.map((addr) => (
          <div 
            key={addr.id} 
            className={`border-2 rounded-xl p-5 hover:border-primary/50 transition-colors relative ${addr.is_default ? 'border-primary/30 bg-primary/5' : 'border-slate-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-slate-900">{addr.full_name}</span>
              {addr.is_default && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">Default</span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">{addr.address_line_1}</p>
            {addr.address_line_2 && <p className="text-sm text-slate-600 mb-1">{addr.address_line_2}</p>}
            <p className="text-sm text-slate-600 font-medium mb-1">{addr.city}, {addr.state} {addr.postal_code}</p>
            {addr.landmark && <p className="text-sm text-slate-500 mb-1">Near: {addr.landmark}</p>}
            <p className="text-sm text-slate-600">📞 {addr.phone}</p>
            
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => handleEdit(addr)} 
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-md transition-colors"
                title="Edit address"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(addr.id)} 
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Delete address"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
