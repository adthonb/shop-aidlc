export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
  soldOut: boolean;
  calories?: string;
}

export interface StoreConfig {
  storeName: string;
  tagline: string;
  isOpen: boolean;
  openHours?: string;
  openTime?: string; // ISO 8601 time without date (e.g., 06:00:00+07:00)
  closeTime?: string; // ISO 8601 time without date (e.g., 11:30:00+07:00)
  prepTimeMinutes?: number;
  phone: string;
  address: string;
  googleMapUrl?: string;
  lineOaId?: string;
  lineOaUrl?: string;
  promptPayId: string;
  promptPayName: string;
  bankName: string;
  bankAccountNumber?: string;
  bankAccountNo?: string;
  bankAccountName: string;
  pickupTimeSlots: string[];
  announcement?: string;
}

export interface StoreData {
  store: StoreConfig;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = "promptpay" | "counter";

export interface OrderRecord {
  id: string;
  queueNumber: string; // e.g., #A001
  dateKey: string; // YYYY-MM-DD in Asia/Bangkok
  createdAt: string; // ISO string
  customerName: string;
  customerPhone: string;
  customerContact: string; // LINE ID or Email (optional)
  pickupTime: string; // e.g., "รับทันที (15-20 นาที)" or "08:00 - 08:15"
  paymentMethod: PaymentMethod;
  slipUrl?: string; // e.g., "/api/slips/2026-11-03-A001.jpg"
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  lineSent: boolean;
  lineError?: string;
}
