import { z } from "zod";

// Shared
export const purchaseItemSchema = z.object({
  id: z.string().optional(), // server will set on save if missing
  name: z.string().min(1),
  model: z.string().min(1),
  supplier: z.string().optional().default(""),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  uom: z.string().min(1),
  currency: z.string().min(3).max(3),
  total: z.number().nonnegative(), // quantity * unitPrice (per currency)
});

export const purchaseBaseSchema = z.object({
  clientId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "completed"]),
  notes: z.string().optional().default(""),
  items: z.array(purchaseItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  baseCurrency: z.string().min(3).max(3), // e.g., "INR"
});

// Create
export const createPurchaseSchema = purchaseBaseSchema.extend({
  poNumber: z.string().min(1),
});

// Update (PATCH)
export const updatePurchaseSchema = purchaseBaseSchema
  .partial()
  .extend({
    poNumber: z.string().min(1).optional(),
  });

// Response model helper
export type PurchaseCreate = z.infer<typeof createPurchaseSchema>;
export type PurchaseUpdate = z.infer<typeof updatePurchaseSchema>;

export type PurchaseDoc = {
  id: string;
  clientId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  notes?: string;
  items: z.infer<typeof purchaseItemSchema>[];
  subtotal: number;
  tax: number;
  total: number;
  baseCurrency: string;
  poNumber: string;
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
};
