import { Router } from 'express';
import { db } from '../firestore.js';
import { z } from 'zod';
import { parseListParams, paginate, sendZodError } from '../common.js';
import type { Client } from '../types.js';

export const clientsRouter = Router();

const clientSchema = z.object({
  company: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3),
  status: z.enum(['active', 'inactive']),
  gstNumber: z.string().optional().default(''),
  msmeNumber: z.string().optional().default(''),
  panNumber: z.string().optional().default(''),
  billingAddress: z.object({
    street: z.string(), city: z.string(), state: z.string(), postalCode: z.string(), country: z.string()
  }),
  shippingAddress: z.object({
    street: z.string(), city: z.string(), state: z.string(), postalCode: z.string(), country: z.string()
  }),
  notes: z.string().optional().default(''),
  baseCurrency: z.string().min(1)
});

clientsRouter.get('/', async (req, res) => {
  const { limit, pageToken } = parseListParams(req);
  const snap = await db().collection('clients').orderBy('createdAt', 'desc').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Client[];
  const { items, nextPageToken } = paginate(docs, limit, pageToken);
  res.json({ items, nextPageToken });
});

clientsRouter.get('/:id', async (req, res) => {
  const doc = await db().collection('clients').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Not found' });
  res.json({ id: doc.id, ...(doc.data() as any) });
});

clientsRouter.post('/', async (req, res) => {
  try {
    const parsed = clientSchema.parse(req.body);
    const now = new Date().toISOString();
    const ref = await db().collection('clients').add({ ...parsed, createdAt: now, updatedAt: now });
    const doc = await ref.get();
    res.status(201).json({ id: doc.id, ...(doc.data() as any) });
  } catch (e: any) {
    if (e?.issues) return sendZodError(res, e);
    res.status(400).json({ error: String(e?.message || e) });
  }
});

clientsRouter.put('/:id', async (req, res) => {
  try {
    const parsed = clientSchema.partial().parse(req.body);
    const now = new Date().toISOString();
    await db().collection('clients').doc(req.params.id).set({ ...parsed, updatedAt: now }, { merge: true });
    const doc = await db().collection('clients').doc(req.params.id).get();
    res.json({ id: doc.id, ...(doc.data() as any) });
  } catch (e: any) {
    if (e?.issues) return sendZodError(res, e);
    res.status(400).json({ error: String(e?.message || e) });
  }
});

clientsRouter.delete('/:id', async (req, res) => {
  await db().collection('clients').doc(req.params.id).delete();
  res.status(204).send();
});
