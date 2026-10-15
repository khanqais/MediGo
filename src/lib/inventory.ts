export type InventoryRow = {
  stock_quantity?: number | null;
  reserved_quantity?: number | null;
  reorder_level?: number | null;
};

export function getInventory(
  medicine: { inventory?: unknown } | null | undefined
): InventoryRow | null {
  if (!medicine) return null;
  const raw = medicine.inventory;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object") return first as InventoryRow;
    return null;
  }
  if (raw && typeof raw === "object") return raw as InventoryRow;
  return null;
}

export function getStock(
  medicine: { inventory?: unknown } | null | undefined
): number {
  const qty = getInventory(medicine)?.stock_quantity;
  const n = Number(qty);
  return Number.isFinite(n) ? n : 0;
}

export function getAvailableStock(
  medicine: { inventory?: unknown } | null | undefined
): number {
  const reserved = Number(getInventory(medicine)?.reserved_quantity);
  const reservedQty = Number.isFinite(reserved) ? reserved : 0;
  return Math.max(0, getStock(medicine) - reservedQty);
}
