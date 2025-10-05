import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import { db } from '../firestore.js';
import type { Purchase, PurchaseItem } from '../types.js';

const router = Router();
const COL = 'purchases';

/** Normalize a Firestore Timestamp/string/Date into ISO string */
function toISO(v: any): string {
  // Firestore Timestamp
  const tsISO = v?.toDate?.()?.toISOString?.();
  if (tsISO) return tsISO;

  // string that already looks like a date
  if (typeof v === 'string') return v;

  // Date
  if (v instanceof Date) return v.toISOString();

  // fallback
  return new Date().toISOString();
}

/** Firestore doc -> API model (Purchase) */
function toPurchase(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot
): Purchase {
  const d: any = doc.data() || {};

  const createdAt = toISO(d.createdAt);
  const updatedAt = toISO(d.updatedAt || createdAt);

  // Some datasets may not have a separate "date"; default to createdAt.
  const date = d.date ? toISO(d.date) : createdAt;

  const items: PurchaseItem[] = Array.isArray(d.items)
    ? d.items.map((it: any, i: number) => ({
        id: typeof it?.id === 'string' && it.id.trim() ? it.id : `${doc.id}-${i}`,
        name: String(it?.name ?? ''),
        model: String(it?.model ?? ''),
        supplier: String(it?.supplier ?? ''),
        quantity: Number(it?.quantity ?? 0),
        unitPrice: Number(it?.unitPrice ?? 0),
        uom: String(it?.uom ?? ''),
        currency: String(it?.currency ?? d.baseCurrency ?? 'INR'),
        total: Number(it?.total ?? (Number(it?.quantity ?? 0) * Number(it?.unitPrice ?? 0))),
      }))
    : [];

  return {
    id: doc.id,
    clientId: String(d.clientId ?? ''),
    poNumber: String(d.poNumber ?? ''),
    date,
    status: d.status ?? 'pending',
    items,
    subtotal: Number(d.subtotal ?? 0),
    tax: Number(d.tax ?? 0),
    total: Number(d.total ?? 0),
    createdAt,
    updatedAt,
    baseCurrency: String(d.baseCurrency ?? 'INR'),
    notes: typeof d.notes === 'string' ? d.notes : '',
  };
}

/**
 * GET /api/purchases
 * Query params:
 *  - limit?: number (default 25, max 500)
 *  - pageToken?: string (doc id to startAfter)
 *  - cursor?: string (ISO createdAt; startAfter this)
 *  - status?: 'pending'|'approved'|'rejected'|'completed'|'draft'
 *  - clientId?: string
 *  - order?: 'asc'|'desc' (default 'desc')
 *  - poPrefix?: string (prefix search on poNumber)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbi = db();
    const {
      limit: limitRaw,
      pageToken,
      cursor,
      status,
      clientId,
      order = 'desc',
      poPrefix,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 25), 1), 500);
    let q: FirebaseFirestore.Query = dbi.collection(COL);

    if (status) q = q.where('status', '==', status);
    if (clientId) q = q.where('clientId', '==', clientId);

    if (poPrefix && poPrefix.trim()) {
      const start = poPrefix;
      const end = `${poPrefix}\uf8ff`;
      q = q.where('poNumber', '>=', start).where('poNumber', '<=', end);
    }

    q = q.orderBy('createdAt', order === 'asc' ? 'asc' : 'desc').limit(limit);

    if (pageToken) {
      const startSnap = await dbi.collection(COL).doc(pageToken).get();
      if (startSnap.exists) q = q.startAfter(startSnap);
    } else if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) q = q.startAfter(cursorDate);
    }

    const snap = await q.get();
    const items = snap.docs.map(toPurchase);

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor =
      last?.get('createdAt')?.toDate?.()?.toISOString?.() ?? undefined;
    const nextPageToken = last?.id ?? undefined;

    res.json({ items, nextCursor, nextPageToken });
  } catch (err: any) {
    console.error('GET /purchases error', err);
    res.status(500).json({ error: err?.message || 'Failed to list purchases' });
  }
});

/**
 * GET /api/purchases/byClient/:clientId
 * Optional query: limit, pageToken, cursor, order
 */
router.get('/byClient/:clientId', async (req, res) => {
  try {
    const dbi = db();
    const { clientId } = req.params;
    const {
      limit: limitRaw,
      pageToken,
      cursor,
      order = 'desc',
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 50), 1), 500);

    let q = dbi
      .collection(COL)
      .where('clientId', '==', clientId)
      .orderBy('createdAt', order === 'asc' ? 'asc' : 'desc')
      .limit(limit);

    if (pageToken) {
      const startSnap = await dbi.collection(COL).doc(pageToken).get();
      if (startSnap.exists) q = q.startAfter(startSnap);
    } else if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) q = q.startAfter(cursorDate);
    }

    const snap = await q.get();
    const items = snap.docs.map(toPurchase);

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor =
      last?.get('createdAt')?.toDate?.()?.toISOString?.() ?? undefined;
    const nextPageToken = last?.id ?? undefined;

    res.json({ items, nextCursor, nextPageToken });
  } catch (err: any) {
    console.error('GET /purchases/byClient error', err);
    res.status(500).json({ error: err?.message || 'Failed to list by client' });
  }
});

/**
 * POST /api/purchases/byIds
 * body: { ids: string[] }
 */
router.post('/byIds', async (req, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json([]);

    const reads = ids.map((id) => db().collection(COL).doc(id).get());
    const snaps = await Promise.all(reads);
    const items = snaps.filter((s: any) => s.exists).map(toPurchase);
    res.json(items);
  } catch (err: any) {
    console.error('POST /purchases/byIds error', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch by ids' });
  }
});

/**
 * GET /api/purchases/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const doc = await db().collection(COL).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json(toPurchase(doc));
  } catch (err: any) {
    console.error('GET /purchases/:id error', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch purchase' });
  }
});

/**
 * POST /api/purchases
 * body: Partial<Purchase> (typed; normalized here)
 */
router.post('/', async (req, res) => {
  try {
    const input: Partial<Purchase> = req.body ?? {};

    const nowTs = admin.firestore.Timestamp.now();
    const nowISO = new Date().toISOString();

    const items: PurchaseItem[] = Array.isArray(input.items)
      ? input.items.map((it: any, i: any) => ({
          id: it.id && it.id.trim() ? it.id : `${Date.now()}-${i}`,
          name: it.name ?? '',
          model: it.model ?? '',
          supplier: it.supplier ?? '',
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          uom: it.uom ?? '',
          currency: it.currency ?? input.baseCurrency ?? 'INR',
          total:
            typeof it.total === 'number'
              ? it.total
              : Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0),
        }))
      : [];

    const payload = {
      clientId: String(input.clientId ?? ''),
      poNumber: String(input.poNumber ?? ''),
      date: input.date ? new Date(input.date) : new Date(nowISO),
      status: input.status ?? 'pending',
      items,
      subtotal: Number(input.subtotal ?? 0),
      tax: Number(input.tax ?? 0),
      total: Number(input.total ?? 0),
      createdAt: nowTs,
      updatedAt: nowTs,
      baseCurrency: String(input.baseCurrency ?? 'INR'),
      notes: typeof input.notes === 'string' ? input.notes : '',
    };

    const ref = await db().collection(COL).add(payload);
    const freshly = await ref.get();
    res.status(201).json(toPurchase(freshly));
  } catch (err: any) {
    console.error('POST /purchases error', err);
    res.status(500).json({ error: err?.message || 'Failed to create purchase' });
  }
});

/** Shared merge-updater for PATCH/PUT */
async function applyUpdateMerge(id: string, body: Partial<Purchase>, res: Response) {
  const patch: Record<string, any> = { ...body };

  if (patch.items) {
    patch.items = (Array.isArray(patch.items) ? patch.items : []).map(
      (it: any, i: number) => ({
        ...it,
        id: typeof it?.id === 'string' && it.id.trim() ? it.id : `${Date.now()}-${i}`,
        quantity: Number(it?.quantity ?? 0),
        unitPrice: Number(it?.unitPrice ?? 0),
        total:
          typeof it?.total === 'number'
            ? it.total
            : Number(it?.quantity ?? 0) * Number(it?.unitPrice ?? 0),
      })
    );
  }

  if (patch.date && typeof patch.date === 'string') {
    const d = new Date(patch.date);
    if (!isNaN(d.getTime())) patch.date = d; // Firestore can store Date
  }

  patch.updatedAt = admin.firestore.Timestamp.now();

  const ref = db().collection(COL).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: 'Not found' });

  await ref.set(patch, { merge: true });

  const updated = await ref.get();
  return res.json(toPurchase(updated));
}

/**
 * PATCH /api/purchases/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    await applyUpdateMerge(req.params.id, req.body ?? {}, res);
  } catch (err: any) {
    console.error('PATCH /purchases/:id error', err);
    res.status(500).json({ error: err?.message || 'Failed to update purchase' });
  }
});

/**
 * PUT /api/purchases/:id
 * (same as PATCH; merge behavior)
 */
router.put('/:id', async (req, res) => {
  try {
    await applyUpdateMerge(req.params.id, req.body ?? {}, res);
  } catch (err: any) {
    console.error('PUT /purchases/:id error', err);
    res.status(500).json({ error: err?.message || 'Failed to update purchase' });
  }
});

/**
 * DELETE /api/purchases/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const ref = db().collection(COL).doc(req.params.id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Not found' });

    await ref.delete();
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /purchases/:id error', err);
    res.status(500).json({ error: err?.message || 'Failed to delete purchase' });
  }
});

export default router;
