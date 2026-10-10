import { Medicine } from "./medicine";
import { Address } from "./user";

export interface OrderItem {
  id: string;
  order_id?: string;
  medicine_id?: string;
  medicine?: Medicine;
  quantity: number;
  price: number;
  total?: number;
}

export type DbOrderStatus = 
  | 'PENDING'
  | 'PENDING_PRESCRIPTION_APPROVAL'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type DbPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type DbPaymentMethod = 'ONLINE' | 'COD';

export interface Order {
  id: string;
  user_id: string;
  address_snapshot: Record<string, any>;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  status: DbOrderStatus;
  payment_status: DbPaymentStatus;
  payment_method: DbPaymentMethod;
  prescription_id?: string | null;
  stock_restored?: boolean;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: DbOrderStatus;
  changed_by?: string | null;
  notes?: string | null;
  created_at: string;
}
