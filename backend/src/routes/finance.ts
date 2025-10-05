// backend/src/routes/finance.ts
import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { db } from "../firestore.js";

const router = Router();
const COL = "finance"; // collection name

type Doc = {
  id: string;
  type: "invested" | "expense" | "tds";
  category: string;
  amount: number;
  description: string;
  date: string; // ISO
  paymentMethod: string;
  status: "completed" | "pending" | "failed";
  reference?: string;
  taxYear?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const toISO = (v: any): string =>
  v?.toDate?.()?.toISOString?.() ??
  (typeof v === "string" ? v : undefined) ??
  new Date().toISOString();

function toDoc(
  snap: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot
): Doc {
  const d: any = snap.data() || {};
  const createdAt = toISO(d.createdAt);
  const updatedAt = toISO(d.updatedAt) || createdAt;
  return {
    id: snap.id,
    type: d.type,
    category: d.category,
    amount: Number(d.amount || 0),
    description: d.description || "",
    date: toISO(d.date) || createdAt,
    paymentMethod: d.paymentMethod || "",
    status: d.status || "completed",
    reference: d.reference,
    taxYear: d.taxYear,
    createdAt,
    updatedAt,
  };
}

/** ---------- LIST ---------- */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      search,
      type,
      category,
      status,
      paymentMethod,
      order = "desc",
      limit: limitRaw,
      pageToken,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 100), 1), 500);

    let q: FirebaseFirestore.Query = db().collection(COL).orderBy(
      "createdAt",
      order === "asc" ? "asc" : "desc"
    );

    if (type) q = q.where("type", "==", type);
    if (category) q = q.where("category", "==", category);
    if (status) q = q.where("status", "==", status);
    if (paymentMethod) q = q.where("paymentMethod", "==", paymentMethod);

    q = q.limit(limit);

    if (pageToken) {
      const after = await db().collection(COL).doc(pageToken).get();
      if (after.exists) q = q.startAfter(after);
    }

    const snap = await q.get();
    let items = snap.docs.map(toDoc);

    // naive search filter (client-like)
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.description.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s) ||
          r.paymentMethod.toLowerCase().includes(s) ||
          (r.reference || "").toLowerCase().includes(s)
      );
    }

    const last = snap.docs[snap.docs.length - 1];
    res.json({
      items,
      nextPageToken: last?.id ?? undefined,
      total: items.length,
    });
  } catch (e: any) {
    console.error("GET /finance error", e);
    res.status(500).json({ error: e?.message || "Failed to list finance records" });
  }
});

/** ---------- STATS ---------- */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { search, type, category, status, paymentMethod } = req.query as Record<
      string,
      string | undefined
    >;

    let q: FirebaseFirestore.Query = db().collection(COL).orderBy("createdAt", "desc");

    if (type) q = q.where("type", "==", type);
    if (category) q = q.where("category", "==", category);
    if (status) q = q.where("status", "==", status);
    if (paymentMethod) q = q.where("paymentMethod", "==", paymentMethod);

    const snap = await q.get();
    let items = snap.docs.map(toDoc);

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.description.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s) ||
          r.paymentMethod.toLowerCase().includes(s) ||
          (r.reference || "").toLowerCase().includes(s)
      );
    }

    const sum = (arr: Doc[]) => arr.reduce((s, x) => s + (x.amount || 0), 0);
    const invested = items.filter((x) => x.type === "invested" && x.status === "completed");
    const expenses = items.filter((x) => x.type === "expense" && x.status === "completed");
    const tds = items.filter((x) => x.type === "tds" && x.status === "completed");

    const totalInvested = sum(invested);
    const totalExpenses = sum(expenses);
    const totalTDS = sum(tds);

    res.json({
      totalInvested,
      totalExpenses,
      totalTDS,
      profit: totalInvested - totalExpenses - totalTDS,
    });
  } catch (e: any) {
    console.error("GET /finance/stats error", e);
    res.status(500).json({ error: e?.message || "Failed to compute stats" });
  }
});

/** ---------- CREATE ---------- */
router.post("/", async (req: Request, res: Response) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const body = req.body ?? {};

    const ref = await db().collection(COL).add({
      ...body,
      amount: Number(body.amount || 0),
      date: body.date ? admin.firestore.Timestamp.fromDate(new Date(body.date)) : now,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await ref.get();
    res.status(201).json(toDoc(doc));
  } catch (e: any) {
    console.error("POST /finance error", e);
    res.status(500).json({ error: e?.message || "Failed to create record" });
  }
});

/** ---------- UPDATE ---------- */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const ref = db().collection(COL).doc(req.params.id);
    const exists = await ref.get();
    if (!exists.exists) return res.status(404).json({ error: "Not found" });

    const patch: any = { ...req.body, updatedAt: admin.firestore.Timestamp.now() };
    if (patch.amount != null) patch.amount = Number(patch.amount);
    if (patch.date) patch.date = admin.firestore.Timestamp.fromDate(new Date(patch.date));

    await ref.set(patch, { merge: true });
    const doc = await ref.get();
    res.json(toDoc(doc));
  } catch (e: any) {
    console.error("PATCH /finance/:id error", e);
    res.status(500).json({ error: e?.message || "Failed to update record" });
  }
});

/** ---------- DELETE ---------- */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ref = db().collection(COL).doc(req.params.id);
    const ex = await ref.get();
    if (!ex.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /finance/:id error", e);
    res.status(500).json({ error: e?.message || "Failed to delete record" });
  }
});

export default router;
