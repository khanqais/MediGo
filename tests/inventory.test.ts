import { describe, it, expect } from "vitest";
import { getStock, getAvailableStock, getInventory } from "../src/lib/inventory";

describe("getStock", () => {
  it("reads stock_quantity from an object-shaped inventory relation", () => {
    expect(getStock({ inventory: { stock_quantity: 12, reserved_quantity: 2 } })).toBe(12);
  });

  it("reads stock_quantity from an array-shaped inventory relation", () => {
    expect(
      getStock({
        inventory: [{ stock_quantity: 7, reserved_quantity: 1 }, { stock_quantity: 99 }],
      })
    ).toBe(7);
  });

  it("returns 0 for missing, empty, or non-numeric inventory", () => {
    expect(getStock({ inventory: [] })).toBe(0);
    expect(getStock({ inventory: null })).toBe(0);
    expect(getStock({})).toBe(0);
    expect(getStock(null)).toBe(0);
    expect(getStock({ inventory: { stock_quantity: "nope" as unknown as number } })).toBe(0);
  });
});

describe("getInventory / getAvailableStock", () => {
  it("normalizes both shapes and subtracts reserved quantity", () => {
    expect(getInventory({ inventory: { stock_quantity: 10, reserved_quantity: 3 } })).toEqual({
      stock_quantity: 10,
      reserved_quantity: 3,
    });
    expect(getAvailableStock({ inventory: [{ stock_quantity: 10, reserved_quantity: 3 }] })).toBe(7);
  });
});
