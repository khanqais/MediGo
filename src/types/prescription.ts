export type PrescriptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Prescription {
  id: string;
  user_id: string;
  order_id?: string | null;
  file_path: string;
  status: PrescriptionStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  url?: string | null;
  user?: {
    id?: string;
    full_name?: string | null;
    email: string;
    phone?: string | null;
  };
  order?: {
    id: string;
    total_amount: number;
    status: string;
    payment_method: string;
    payment_status: string;
    created_at: string;
  } | null;
}
