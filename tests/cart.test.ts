import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide mock localStorage for Node environment so zustand persist works seamlessly
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal("localStorage", storageMock);
vi.stubGlobal("window", { localStorage: storageMock });

import { useCartStore } from '../src/store/cartStore';
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from '../src/config/site';

describe('Cart Store (Real Code)', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.getState().clearCoupon();
  });

  it('should calculate subtotal, totalSavings, and delivery fee correctly', () => {
    // Empty cart: subtotal 0, delivery fee 0, total 0
    expect(useCartStore.getState().deliveryFee()).toBe(0);
    expect(useCartStore.getState().subtotal()).toBe(0);
    expect(useCartStore.getState().total()).toBe(0);

    // Add item below threshold
    useCartStore.getState().addItem({ id: '1', drugSchedule: 'OTC', prescriptionRequired: false, price: FREE_DELIVERY_THRESHOLD - 10, mrp: FREE_DELIVERY_THRESHOLD } as any, 1);
    expect(useCartStore.getState().subtotal()).toBe(FREE_DELIVERY_THRESHOLD - 10);
    expect(useCartStore.getState().deliveryFee()).toBe(STANDARD_DELIVERY_FEE);
    expect(useCartStore.getState().total()).toBe(FREE_DELIVERY_THRESHOLD - 10 + STANDARD_DELIVERY_FEE);

    // Add item above threshold
    useCartStore.getState().addItem({ id: '2', drugSchedule: 'OTC', prescriptionRequired: false, price: 20, mrp: 30 } as any, 1);
    expect(useCartStore.getState().subtotal()).toBe(FREE_DELIVERY_THRESHOLD + 10);
    expect(useCartStore.getState().deliveryFee()).toBe(0); // Free delivery unlocked
    expect(useCartStore.getState().total()).toBe(FREE_DELIVERY_THRESHOLD + 10);
    expect(useCartStore.getState().totalSavings()).toBe(10 + 10); // 10 on item 1, 10 on item 2
  });

  it('should calculate coupon discount correctly', () => {
    useCartStore.getState().addItem({ id: '1', drugSchedule: 'OTC', prescriptionRequired: false, price: 100, mrp: 120 } as any, 1);
    expect(useCartStore.getState().total()).toBe(100 + STANDARD_DELIVERY_FEE);

    useCartStore.getState().setCoupon({ code: 'SAVE10', discount: 10 });
    expect(useCartStore.getState().total()).toBe(90 + STANDARD_DELIVERY_FEE);

    useCartStore.getState().setCoupon({ code: 'FREEDEL', discount: 0 });
    // FREEDEL waives delivery fee
    expect(useCartStore.getState().deliveryFee()).toBe(0);
    expect(useCartStore.getState().total()).toBe(100);
  });
});

