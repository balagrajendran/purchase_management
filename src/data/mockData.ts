import { Client, Purchase, Invoice, PurchaseItem } from '../types';

export const mockClients: Client[] = [
  {
    id: '1',
    company: 'Acme Corporation',
    contactPerson: 'John Doe',
    email: 'john.doe@acmecorp.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    gstNumber: '29ABCDE1234F1Z5',
    msmeNumber: 'UDYAM-MH-12-0001234',
    panNumber: 'ABCDE1234F',
    billingAddress: {
      street: '123 Business St, Suite 100',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India'
    },
    shippingAddress: {
      street: '123 Business St, Suite 100',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India'
    },
    sameAsShipping: true,
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      accountHolderName: 'Acme Corporation'
    },
    name: 'John Doe', // Legacy field
    address: '123 Business St, Suite 100, Mumbai, Maharashtra 400001', // Legacy field
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    company: 'TechStart Solutions',
    contactPerson: 'Sarah Johnson',
    email: 'sarah.j@techstart.io',
    phone: '+1 (555) 987-6543',
    status: 'active',
    gstNumber: '07FGHIJ5678K2L9',
    msmeNumber: 'UDYAM-DL-11-0005678',
    panNumber: 'FGHIJ5678K',
    billingAddress: {
      street: '456 Innovation Ave, Tech Park',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India'
    },
    shippingAddress: {
      street: '789 Delivery Lane, Industrial Area',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560002',
      country: 'India'
    },
    sameAsShipping: false,
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '9876543210',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'TechStart Solutions Pvt Ltd'
    },
    name: 'Sarah Johnson', // Legacy field
    address: '456 Innovation Ave, Tech Park, Bangalore, Karnataka 560001', // Legacy field
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    company: 'Global Industries Inc.',
    contactPerson: 'Michael Chen',
    email: 'mchen@globalinc.com',
    phone: '+1 (555) 246-8135',
    status: 'inactive',
    gstNumber: '19KLMNO9012P3Q4',
    msmeNumber: 'UDYAM-TN-33-0003456',
    panNumber: 'KLMNO9012P',
    billingAddress: {
      street: '789 Enterprise Blvd, Business District',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India'
    },
    shippingAddress: {
      street: '789 Enterprise Blvd, Business District',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India'
    },
    sameAsShipping: true,
    name: 'Michael Chen', // Legacy field
    address: '789 Enterprise Blvd, Business District, Chennai, Tamil Nadu 600001', // Legacy field
    createdAt: new Date('2024-03-10'),
  },
];

const mockPurchaseItems: PurchaseItem[] = [
  {
    id: '1',
    name: 'Office Chairs',
    model: 'ErgoMax Pro 2024',
    supplier: 'Furniture Plus Ltd',
    quantity: 10,
    unitPrice: 299.99,
    uom: 'pcs',
    currency: 'INR',
    total: 2999.90,
  },
  {
    id: '2',
    name: 'Standing Desks',
    model: 'FlexiDesk Height Adjustable',
    supplier: 'WorkSpace Solutions',
    quantity: 5,
    unitPrice: 599.99,
    uom: 'pcs',
    currency: 'INR',
    total: 2999.95,
  },
  {
    id: '3',
    name: 'Laptop Computers',
    model: 'Dell Inspiron 15 3000',
    supplier: 'Tech Hardware Inc',
    quantity: 3,
    unitPrice: 45000,
    uom: 'pcs',
    currency: 'INR',
    total: 135000,
  },
  {
    id: '4',
    name: 'Monitor Displays',
    model: 'Samsung 24" LED Monitor',
    supplier: 'Display Solutions Ltd',
    quantity: 6,
    unitPrice: 12000,
    uom: 'pcs',
    currency: 'INR',
    total: 72000,
  },
  {
    id: '5',
    name: 'Office Supplies',
    model: 'Stationery Bundle',
    supplier: 'Office Mart',
    quantity: 50,
    unitPrice: 250,
    uom: 'sets',
    currency: 'INR',
    total: 12500,
  },
];

export const mockPurchases: Purchase[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    clientId: '1',
    items: [mockPurchaseItems[0]],
    subtotal: 2999.90,
    tax: 539.98,
    total: 3539.88,
    status: 'completed',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-15'),
    notes: 'Delivered to main office location',
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    clientId: '2',
    items: [mockPurchaseItems[1]],
    subtotal: 2999.95,
    tax: 539.99,
    total: 3539.94,
    status: 'pending',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-20'),
    notes: 'Waiting for approval from finance department',
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    clientId: '3',
    items: mockPurchaseItems,
    subtotal: 5999.85,
    tax: 1079.97,
    total: 7079.82,
    status: 'approved',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-25'),
  },
  {
    id: '4',
    poNumber: 'PO-2024-004',
    clientId: '1',
    items: [mockPurchaseItems[2]],
    subtotal: 135000,
    tax: 24300,
    total: 159300,
    status: 'approved',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-28'),
    notes: 'Laptops for new employees',
  },
  {
    id: '5',
    poNumber: 'PO-2024-005',
    clientId: '2',
    items: [mockPurchaseItems[3]],
    subtotal: 72000,
    tax: 12960,
    total: 84960,
    status: 'completed',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-29'),
    notes: 'Monitors for workstation setup',
  },
  {
    id: '6',
    poNumber: 'PO-2024-006',
    clientId: '3',
    items: [mockPurchaseItems[4]],
    subtotal: 12500,
    tax: 2250,
    total: 14750,
    status: 'approved',
    baseCurrency: 'INR',
    createdAt: new Date('2024-09-30'),
    notes: 'Office supplies for Q4',
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    purchaseId: '1',
    purchaseIds: ['1'],
    clientId: '1',
    invoiceNumber: 'INV-2024-001',
    dueDate: new Date('2024-10-15'),
    status: 'paid',
    createdAt: new Date('2024-09-16'),
    paidAt: new Date('2024-09-28'),
    items: [
      {
        ...mockPurchaseItems[0],
        purchaseId: '1',
        poNumber: 'PO-2024-001'
      }
    ],
    subtotal: 2999.90,
    tax: 539.98,
    total: 3539.88,
    notes: 'Payment received on time',
    paymentTerms: '30',
  },
  {
    id: '2',
    purchaseId: '3',
    purchaseIds: ['3'],
    clientId: '3',
    invoiceNumber: 'INV-2024-002',
    dueDate: new Date('2024-10-25'),
    status: 'sent',
    createdAt: new Date('2024-09-26'),
    items: mockPurchaseItems.map(item => ({
      ...item,
      purchaseId: '3',
      poNumber: 'PO-2024-003'
    })),
    subtotal: 5999.85,
    tax: 1079.97,
    total: 7079.82,
    notes: 'Multi-item purchase order invoice',
    paymentTerms: '30',
  },
];