import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Medicine } from "@/types/medicine";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "@/config/site";

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  appliedCoupon: { code: string; discount: number } | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (medicine: Medicine, quantity?: number) => void;
  removeItem: (medicineId: string) => void;
  updateQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (coupon: { code: string; discount: number }) => void;
  clearCoupon: () => void;
  cartTotal: () => number;
  cartCount: () => number;
  subtotal: () => number;
  totalSavings: () => number;
  deliveryFee: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      appliedCoupon: null,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      addItem: (medicine, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => item.medicine.id === medicine.id);
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.medicine.id === medicine.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { medicine, quantity }] });
        }
      },
      removeItem: (medicineId) => {
        set({
          items: get().items.filter((item) => item.medicine.id !== medicineId),
        });
      },
      updateQuantity: (medicineId, quantity) => {
        set({
          items: get().items.map((item) =>
            item.medicine.id === medicineId ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [], appliedCoupon: null }),
      setCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),
      cartTotal: () => {
        return get().subtotal();
      },
      cartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
      subtotal: () => {
        return get().items.reduce((total, item) => total + item.medicine.price * item.quantity, 0);
      },
      totalSavings: () => {
        return get().items.reduce((savings, item) => savings + Math.max(0, item.medicine.mrp - item.medicine.price) * item.quantity, 0);
      },
      deliveryFee: () => {
        if (get().items.length === 0) return 0;
        if (get().appliedCoupon?.code === "FREEDEL") return 0;
        return get().subtotal() >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
      },
      total: () => {
        if (get().items.length === 0) return 0;
        const sub = get().subtotal();
        const couponDiscount = get().appliedCoupon?.discount || 0;
        const fee = get().deliveryFee();
        return Math.max(0, sub - couponDiscount + fee);
      },
      itemCount: () => {
        return get().cartCount();
      },
    }),
    {
      name: "medigo-cart",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage;
        }
        let mem: Record<string, string> = {};
        return {
          getItem: (key: string) => mem[key] || null,
          setItem: (key: string, value: string) => {
            mem[key] = value;
          },
          removeItem: (key: string) => {
            delete mem[key];
          },
        };
      }),
    }
  )
);
