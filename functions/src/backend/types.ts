export type Role = "admin" | "employee";

export interface MasterUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SettingsDoc {
  id: string;
  data: any;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: string;
  company: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PurchaseItem {
  id?: string;
  name: string;
  model?: string;
  supplier?: string;
  quantity: number;
  uom: string;
  currency: string;
  unitPrice: number;
  total: number;
  poNumber?: string;
}

export interface Purchase {
  id: string;
  clientId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  notes?: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  baseCurrency: string;
  poNumber: string;
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  purchaseIds?: string[];
  purchaseId?: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  status: InvoiceStatus;
  createdAt: number;
  dueDate: number;
  updatedAt: number;
}
