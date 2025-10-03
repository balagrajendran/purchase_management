import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { db } from "../lib/firestore.js";
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  PurchaseDoc,
} from "../schemas/purchase.js";

const router = Router();
const COL = "purchases";

// Utility: convert Firestore doc -> API model
function toPurchase(
  doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot
): PurchaseDoc {
  const d: any = doc.data() || {};
  const toISO = (v: any) =>
    v?.toDate?.()?.toISOString?.() ??
    (typeof v === "string" ? v : undefined) ??
    new Date().toISOString();

  const createdAt = toISO(d.createdAt);
  const updatedAt = toISO(d.updatedAt) || createdAt;

  return {
    id: doc.id,
    clientId: d.clientId,
    status: d.status,
    notes: d.notes ?? "",
    items: d.items ?? [],
    subtotal: d.subtotal,
    tax: d.tax,
    total: d.total,
    baseCurrency: d.baseCurrency,
    poNumber: d.poNumber,
    createdAt,
    updatedAt,
  };
}

/**
 * GET /api/purchases
 * Query params:
 *  - limit?: number (default 25, max 500)
 *  - pageToken?: string (doc id to startAfter)
 *  - cursor?: string (ISO createdAt; startAfter this)
 *  - status?: 'pending'|'approved'|'rejected'|'completed'
 *  - clientId?: string
 *  - order?: 'asc'|'desc' (default 'desc')
 *  - poPrefix?: string   (prefix search by poNumber)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const dbi = db();
    const {
      limit: limitRaw,
      pageToken,
      cursor,
      status,
      clientId,
      order = "desc",
      poPrefix,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 25), 1), 500);

    let q: FirebaseFirestore.Query = dbi.collection(COL);

    if (status) q = q.where("status", "==", status);
    if (clientId) q = q.where("clientId", "==", clientId);

    if (poPrefix && poPrefix.trim()) {
      const start = poPrefix;
      const end = poPrefix + "\uf8ff";
      q = q.where("poNumber", ">=", start).where("poNumber", "<=", end);
    }

    q = q.orderBy("createdAt", order === "asc" ? "asc" : "desc").limit(limit);

    // Paging: prefer pageToken (doc id), else cursor (date)
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
      last?.get("createdAt")?.toDate?.()?.toISOString?.() ?? undefined;
    const nextPageToken = last?.id ?? undefined;

    res.json({ items, nextCursor, nextPageToken });
  } catch (err: any) {
    console.error("GET /purchases error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to list purchases" });
  }
});

/**
 * GET /api/purchases/byClient/:clientId
 * Optional query: limit, pageToken, cursor, order
 */
router.get("/byClient/:clientId", async (req, res) => {
  try {
    const dbi = db();
    const { clientId } = req.params;
    const {
      limit: limitRaw,
      pageToken,
      cursor,
      order = "desc",
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 50), 1), 500);

    let q = dbi
      .collection(COL)
      .where("clientId", "==", clientId)
      .orderBy("createdAt", order === "asc" ? "asc" : "desc")
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
      last?.get("createdAt")?.toDate?.()?.toISOString?.() ?? undefined;
    const nextPageToken = last?.id ?? undefined;

    res.json({ items, nextCursor, nextPageToken });
  } catch (err: any) {
    console.error("GET /purchases/byClient error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to list by client" });
  }
});

/**
 * POST /api/purchases/byIds
 * body: { ids: string[] }
 */
router.post("/byIds", async (req, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json([]);

    const reads = ids.map((id) => db().collection(COL).doc(id).get());
    const snaps = await Promise.all(reads);
    const items = snaps.filter((s) => s.exists).map(toPurchase);
    res.json(items);
  } catch (err: any) {
    console.error("POST /purchases/byIds error", err);
    res.status(500).json({ error: err?.message || "Failed to fetch by ids" });
  }
});

/**
 * GET /api/purchases/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const doc = await db().collection(COL).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json(toPurchase(doc));
  } catch (err: any) {
    console.error("GET /purchases/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to fetch purchase" });
  }
});

/**
 * POST /api/purchases
 * body: PurchaseCreate
 */
router.post("/", async (req, res) => {
  try {
    const parsed = createPurchaseSchema.parse(req.body);

    // Normalize: ensure every item has an id
    const items = parsed.items.map((it, i) => ({
      ...it,
      id: it.id || `${Date.now()}-${i}`,
    }));

    const now = admin.firestore.Timestamp.now();

    const ref = await db().collection(COL).add({
      ...parsed,
      items,
      createdAt: now,
      updatedAt: now,
    });

    const freshly = await ref.get();
    res.status(201).json(toPurchase(freshly));
  } catch (err: any) {
    const zodIssues = err?.issues;
    if (zodIssues) {
      return res.status(400).json({
        error: "Validation failed",
        details: zodIssues,
      });
    }
    console.error("POST /purchases error", err);
    res.status(500).json({ error: err?.message || "Failed to create purchase" });
  }
});

/**
 * Merge update helper used by PATCH and PUT
 */
async function applyUpdateMerge(id: string, body: any, res: Response) {
  const parsed = updatePurchaseSchema.parse(body);

  const patch: Record<string, any> = { ...parsed };
  if (patch.items) {
    patch.items = patch.items.map((it: any, i: number) => ({
      ...it,
      id: it.id || `${Date.now()}-${i}`,
    }));
  }
  patch.updatedAt = admin.firestore.Timestamp.now();

  const ref = db().collection(COL).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: "Not found" });

  await ref.set(patch, { merge: true });

  const updated = await ref.get();
  return res.json(toPurchase(updated));
}

/**
 * PATCH /api/purchases/:id
 * body: PurchaseUpdate (partial merge)
 */
router.patch("/:id", async (req, res) => {
  try {
    await applyUpdateMerge(req.params.id, req.body, res);
  } catch (err: any) {
    const zodIssues = err?.issues;
    if (zodIssues) {
      return res.status(400).json({
        error: "Validation failed",
        details: zodIssues,
      });
    }
    console.error("PATCH /purchases/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to update purchase" });
  }
});

/**
 * PUT /api/purchases/:id
 * Treat as merge (same behavior as PATCH) to stay compatible with the frontend
 */
router.put("/:id", async (req, res) => {
  try {
    await applyUpdateMerge(req.params.id, req.body, res);
  } catch (err: any) {
    const zodIssues = err?.issues;
    if (zodIssues) {
      return res.status(400).json({
        error: "Validation failed",
        details: zodIssues,
      });
    }
    console.error("PUT /purchases/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to update purchase" });
  }
});

/**
 * DELETE /api/purchases/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const ref = db().collection(COL).doc(req.params.id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Not found" });

    await ref.delete();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /purchases/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to delete purchase" });
  }
});

export default router;
