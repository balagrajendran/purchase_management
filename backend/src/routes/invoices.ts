import { Router } from 'express';
import { db } from '../lib/firestore.js';
import { z } from 'zod';
import { parseListParams, paginate, sendZodError } from '../lib/common.js';
import type { Invoice } from '../types.js';

export const invoicesRouter = Router();

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  model: z.string(),
  supplier: z.string(),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
  uom: z.string(),
  currency: z.string(),
  total: z.number().nonnegative(),
  purchaseId: z.string(),
  poNumber: z.string()
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  clientId: z.string().min(1),
  purchaseId: z.string().min(1),
  poNumber: z.string().min(1),
  date: z.string(),
  dueDate: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  items: z.array(itemSchema),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  paymentTerms: z.string(),
  baseCurrency: z.string().min(1),
  notes: z.string().optional().default('')
});

invoicesRouter.get('/', async (req, res) => {
  const { limit, pageToken } = parseListParams(req);
  const snap = await db().collection('invoices').orderBy('createdAt', 'desc').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Invoice[];
  const { items, nextPageToken } = paginate(docs, limit, pageToken);
  res.json({ items, nextPageToken });
});

invoicesRouter.get('/:id', async (req, res) => {
  const doc = await db().collection('invoices').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  res.json({ id: doc.id, ...(doc.data() as any) });
});

invoicesRouter.post('/', async (req, res) => {
  try {
    const parsed = invoiceSchema.parse(req.body);
    const now = new Date().toISOString();
    const ref = await db().collection('invoices').add({ ...parsed, createdAt: now, updatedAt: now });
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...(doc.data() as any) });
  } catch (e: any) {
    if (e?.issues) return sendZodError(res, e);
    res.status(400).json({ error: String(e?.message || e) });
  }
});

invoicesRouter.put('/:id', async (req, res) => {
  try {
    const parsed = invoiceSchema.partial().parse(req.body);
    const now = new Date().toISOString();
    await db().collection('invoices').doc(req.params.id).set({ ...parsed, updatedAt: now }, { merge: true });
    const doc = await db().collection('invoices').doc(req.params.id).get();
    res.json({ id: doc.id, ...(doc.data() as any) });
  } catch (e: any) {
    if (e?.issues) return sendZodError(res, e);
    res.status(400).json({ error: String(e?.message || e) });
  }
});

invoicesRouter.delete('/:id', async (req, res) => {
  await db().collection('invoices').doc(req.params.id).delete();
  res.status(204).send();
});
