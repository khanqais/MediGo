export type DrugSchedule = 'OTC' | 'H' | 'H1' | 'X';

export interface Medicine {
  id: string;
  name: string;
  brand: string;
  slug: string;
  composition: string; // e.g., "Paracetamol 500mg"
  mrp: number;
  price: number;
  discountPercentage: number;
  prescriptionRequired: boolean;
  drugSchedule?: DrugSchedule;
  category: string;
  imageUrl: string;
  stock: number;
  rating?: number | null;
  reviewsCount?: number;
  description: string;
  directions: string;
  sideEffects: string;
  genericName: string;
  images: string[];
  packSize: string;
  dosage: string;
  manufacturer: string;
  faqs: { question: string; answer: string }[];
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // URL to icon
}
