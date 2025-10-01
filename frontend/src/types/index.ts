export interface Client {
  id: string;
  // Basic Information
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  
  // Business Information
  gstNumber: string;
  msmeNumber: string;
  panNumber: string;
  
  // Addresses
  billingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sameAsShipping?: boolean;
  
  // Banking Information
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  
  // Legacy fields for compatibility
  name: string; // Will be same as contactPerson
  address: string; // Will be billingAddress as string
  
  createdAt: Date;
}

export interface Purchase {
  id: string;
  poNumber: string; // Purchase Order Number
  clientId: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  notes?: string;
  baseCurrency: string; // Base currency for the purchase
}

export interface PurchaseItem {
  id: string;
  name: string;
  model: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  uom: string; // Unit of Measure
  currency: string;
  total: number;
}

export interface Invoice {
  id: string;
  purchaseIds: string[]; // Updated to support multiple purchase orders
  clientId: string;
  invoiceNumber: string;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: Date;
  paidAt?: Date;
  // Invoice financial details
  items: (PurchaseItem & { purchaseId: string; poNumber: string })[];
  subtotal: number;
  tax: number;
  total: number;
  // Additional invoice information
  notes?: string;
  paymentTerms: string; // in days
  // Legacy field for compatibility
  purchaseId: string; // Will be first purchaseId for backward compatibility
}