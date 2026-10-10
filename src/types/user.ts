export type UserRole = 'customer' | 'admin' | 'pharmacist' | 'delivery';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface Address {
  id: string;
  type: "Home" | "Office" | "Other";
  name: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  flat: string;
  area: string;
  landmark?: string;
}
