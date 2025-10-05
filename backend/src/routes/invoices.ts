// backend/src/routes/invoices.ts
import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { getDb } from "../firestore.js";

const router = Router();
const COL = "invoices";

/* --------- types / helpers ---------- */
type InvoiceDoc = {
  id: string;
  clientId: string;
  purchaseId?: string;
  purchaseIds?: string[];
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "overdue";
  createdAt: string;        // ISO
  updatedAt?: string;       // ISO
  dueDate: string;          // ISO
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
};

const toISO = (v: any) =>
  v?.toDate?.()?.toISOString?.() ??
  (typeof v === "string" ? v : undefined) ??
  new Date().toISOString();

function toInvoice(
  snap: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot
): InvoiceDoc {
  const d: any = snap.data() || {};
  const createdAt = toISO(d.createdAt);
  const updatedAt = toISO(d.updatedAt) || createdAt;

  return {
    id: snap.id,
    clientId: d.clientId,
    purchaseId: d.purchaseId,
    purchaseIds: d.purchaseIds || [],
    invoiceNumber: d.invoiceNumber,
    status: d.status || "draft",
    createdAt,
    updatedAt,
    dueDate: toISO(d.dueDate) || createdAt,
    items: d.items || [],
    subtotal: d.subtotal || 0,
    tax: d.tax || 0,
    total: d.total || 0,
    notes: d.notes || "",
    paymentTerms: d.paymentTerms || "30",
  };
}

/** Atomically get the next invoice number, scoped by year. */
async function nextInvoiceNumber(): Promise<string> {
  const dbi = await getDb();
  const countersRef = dbi.collection("meta").doc("counters");
  const year = String(new Date().getFullYear());

  const seq = await dbi.runTransaction(async (tx) => {
    const snap = await tx.get(countersRef);
    const byYear = (snap.exists && (snap.get("invoiceSeqByYear") as Record<string, number>)) || {};
    const curr = Number(byYear?.[year] ?? 0) + 1;

    // keep a global seq too for backwards-compat (optional)
    const globalCurr = Number((snap.exists && snap.get("invoiceSeq")) ?? 0) + 1;

    tx.set(
      countersRef,
      {
        invoiceSeq: globalCurr,
        invoiceSeqByYear: { [year]: curr },
      },
      { merge: true }
    );
    return curr;
  });

  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

/* ============== STATS (put BEFORE '/:id') ================= */

/**
 * GET /api/invoices/stats?dateFrom=ISO&dateTo=ISO&clientId=...
 * Returns KPI-style aggregates used by the dashboard.
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const dbi = await getDb();
    const { dateFrom, dateTo, clientId } = req.query as Record<string, string | undefined>;

    // Default: last 30 days
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromTs = admin.firestore.Timestamp.fromDate(from);
    const toTs = admin.firestore.Timestamp.fromDate(to);

    let q: FirebaseFirestore.Query = dbi
      .collection(COL)
      .where("createdAt", ">=", fromTs)
      .where("createdAt", "<=", toTs)
      .orderBy("createdAt", "desc");

    if (clientId) q = q.where("clientId", "==", clientId);

    const snap = await q.get();
    const invoices = snap.docs.map(toInvoice);

    const sum = (arr: InvoiceDoc[]) => arr.reduce((s, x) => s + (x.total || 0), 0);

    const paid = invoices.filter((i) => i.status === "paid");
    const pending = invoices.filter((i) => i.status === "sent" || i.status === "draft");
    const overdue = invoices.filter((i) => i.status === "overdue");

    res.json({
      totalInvoices: invoices.length,
      totalRevenue: sum(invoices),
      paidInvoices: paid.length,
      paidRevenue: sum(paid),
      pendingInvoices: pending.length,
      pendingRevenue: sum(pending),
      overdueInvoices: overdue.length,
      overdueRevenue: sum(overdue),
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (err: any) {
    console.error("GET /invoices/stats error", err);
    res.status(500).json({ error: err?.message || "Failed to compute invoice stats" });
  }
});

/* =================== LIST ======================= */
/**
 * GET /api/invoices?limit=&pageToken=&cursor=&status=&clientId=&order=desc
 */
router.get("/", async (req, res) => {
  try {
    const dbi = await getDb();
    const {
      limit: limitRaw,
      pageToken,
      cursor,
      status,
      clientId,
      order = "desc",
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Math.max(Number(limitRaw || 25), 1), 500);
    let q: FirebaseFirestore.Query = dbi.collection(COL);

    if (status) q = q.where("status", "==", status);
    if (clientId) q = q.where("clientId", "==", clientId);

    q = q.orderBy("createdAt", order === "asc" ? "asc" : "desc").limit(limit);

    if (pageToken) {
      const startSnap = await dbi.collection(COL).doc(pageToken).get();
      if (startSnap.exists) q = q.startAfter(startSnap);
    } else if (cursor) {
      const cDate = new Date(cursor);
      if (!isNaN(cDate.getTime())) {
        q = q.startAfter(admin.firestore.Timestamp.fromDate(cDate));
      }
    }

    const snap = await q.get();
    const items = snap.docs.map(toInvoice);
    const last = snap.docs[snap.docs.length - 1];

    res.json({
      items,
      nextPageToken: last?.id ?? undefined,
      nextCursor: last?.get("createdAt")?.toDate?.()?.toISOString?.() ?? undefined,
    });
  } catch (err: any) {
    console.error("GET /invoices error", err);
    res.status(500).json({ error: err?.message || "Failed to list invoices" });
  }
});

/* =================== CREATE ===================== */
/**
 * POST /api/invoices
 */
router.post("/", async (req, res) => {
  try {
    const dbi = await getDb();
    const now = admin.firestore.Timestamp.now();
    const payload = req.body ?? {};

    // Ensure items have ids & compute shape
    const items = Array.isArray(payload.items)
      ? payload.items.map((it: any, i: number) => ({ id: it?.id || `${Date.now()}-${i}`, ...it }))
      : [];

    // Parse dueDate
    const dueTs =
      payload.dueDate
        ? admin.firestore.Timestamp.fromDate(new Date(payload.dueDate))
        : now;

    // Generate invoice number if missing
    const invoiceNumber: string =
      typeof payload.invoiceNumber === "string" && payload.invoiceNumber.trim()
        ? payload.invoiceNumber.trim()
        : await nextInvoiceNumber();

    const ref = await dbi.collection(COL).add({
      ...payload,
      invoiceNumber,
      items,
      dueDate: dueTs,
      status: payload.status || "draft",
      createdAt: now,
      updatedAt: now,
    });

    const freshly = await ref.get();
    res.status(201).json(toInvoice(freshly));
  } catch (err: any) {
    console.error("POST /invoices error", err);
    res.status(500).json({ error: err?.message || "Failed to create invoice" });
  }
});

/* =================== READ ONE =================== */
router.get("/:id", async (req, res) => {
  try {
    const dbi = await getDb();
    const doc = await dbi.collection(COL).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json(toInvoice(doc));
  } catch (err: any) {
    console.error("GET /invoices/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to fetch invoice" });
  }
});

/* =================== UPDATE (PATCH/PUT) ========= */
async function mergeUpdate(id: string, body: any, res: Response) {
  const dbi = await getDb();

  const patch: Record<string, any> = { ...body };

  if (Array.isArray(patch.items)) {
    patch.items = patch.items.map((it: any, i: number) => ({
      id: it?.id || `${Date.now()}-${i}`,
      ...it,
    }));
  }

  if (patch.dueDate && typeof patch.dueDate === "string") {
    const d = new Date(patch.dueDate);
    if (!isNaN(d.getTime())) patch.dueDate = admin.firestore.Timestamp.fromDate(d);
  }

  // Never drop invoiceNumber. If missing (legacy), generate one now.
  if (!patch.invoiceNumber || !String(patch.invoiceNumber).trim()) {
    const existing = await dbi.collection(COL).doc(id).get();
    const hasNumber = existing.exists && existing.get("invoiceNumber");
    if (!hasNumber) {
      patch.invoiceNumber = await nextInvoiceNumber();
    }
  }

  patch.updatedAt = admin.firestore.Timestamp.now();

  const ref = dbi.collection(COL).doc(id);
  const exists = await ref.get();
  if (!exists.exists) return res.status(404).json({ error: "Not found" });

  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return res.json(toInvoice(updated));
}

router.patch("/:id", async (req, res) => {
  try {
    await mergeUpdate(req.params.id, req.body, res);
  } catch (err: any) {
    console.error("PATCH /invoices/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to update invoice" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await mergeUpdate(req.params.id, req.body, res);
  } catch (err: any) {
    console.error("PUT /invoices/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to update invoice" });
  }
});

/* =================== STATUS ONLY ===================== */
/** PATCH /api/invoices/:id/status { status } */
router.patch("/:id/status", async (req, res) => {
  try {
    const dbi = await getDb();
    const { status } = req.body as { status: InvoiceDoc["status"] };
    const ref = dbi.collection(COL).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });

    await ref.set(
      { status, updatedAt: admin.firestore.Timestamp.now() },
      { merge: true }
    );

    const updated = await ref.get();
    res.json(toInvoice(updated));
  } catch (err: any) {
    console.error("PATCH /invoices/:id/status error", err);
    res.status(500).json({ error: err?.message || "Failed to update status" });
  }
});

/* =================== DELETE ===================== */
router.delete("/:id", async (req, res) => {
  try {
    const dbi = await getDb();
    const ref = dbi.collection(COL).doc(req.params.id);
    const exists = await ref.get();
    if (!exists.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /invoices/:id error", err);
    res.status(500).json({ error: err?.message || "Failed to delete invoice" });
  }
});

export default router;
