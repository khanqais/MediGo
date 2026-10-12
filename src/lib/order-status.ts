import { DbOrderStatus } from "@/types/order";

export { type DbOrderStatus };

export const VALID_TRANSITIONS: Record<DbOrderStatus, DbOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  PENDING_PRESCRIPTION_APPROVAL: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PACKED", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
};
