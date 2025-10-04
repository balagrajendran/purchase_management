import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { Invoice, InvoiceStatus } from "../types";

const router = Router();
const COL = db.collection("invoices");

async function nextInvoiceNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const start = new Date(`${y}-01-01`).getTime();
  const snap = await COL.where("createdAt", ">=", start).get();
  const seq = snap.size + 1;
  return `INV-${y}-${String(seq).padStart(4, "0")}`;
}

router.get("/", async (req: Request, res: Response) => {
  let q = COL.orderBy("createdAt", "desc");

  const status = String(req.query.status || "");
  const clientId = String(req.query.clientId || "");

  if (status) q = COL.where("status", "==", status);
  if (clientId) q = COL.where("clientId", "==", clientId);

  const snap = await q.get();
  const items = snap.docs.map((d) => d.data() as Invoice);
  res.json({ items, total: items.length });
});

router.get("/stats", async (req: Request, res: Response) => {
  let items: Invoice[] = [];
  const clientId = String(req.query.clientId || "");
  const dateFrom = Number(req.query.dateFrom || 0);
  const dateTo = Number(req.query.dateTo || 0);

  const snap = await COL.get();
  items = snap.docs.map((d) => d.data() as Invoice);

  if (clientId) items = items.filter((i) => i.clientId === clientId);
  if (dateFrom) items = items.filter((i) => i.createdAt >= dateFrom);
  if (dateTo) items = items.filter((i) => i.createdAt <= dateTo);

  const totalInvoices = items.length;
  const totalRevenue = items.reduce((s, i) => s + (i.total || 0), 0);
  const paid = items.filter((i) => i.status === "paid");
  const sent = items.filter((i) => i.status === "sent");
  const draft = items.filter((i) => i.status === "draft");
  const overdue = items.filter((i) => i.status === "overdue");

  res.json({
    totalInvoices,
    totalRevenue,
    paidInvoices: paid.length,
    paidRevenue: paid.reduce((s, i) => s + (i.total || 0), 0),
    pendingInvoices: sent.length + draft.length,
    pendingRevenue: [...sent, ...draft].reduce((s, i) => s + (i.total || 0), 0),
    overdueInvoices: overdue.length,
    overdueRevenue: overdue.reduce((s, i) => s + (i.total || 0), 0)
  });
});

router.post("/", async (req: Request, res: Response) => {
  const body = req.body || {};
  if (!body.clientId || !body.dueDate || !Array.isArray(body.items) || !body.items.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const now = Date.now();
  const invoiceNumber = await nextInvoiceNumber();

  const docRef = COL.doc();
  const invoice: Invoice = {
    id: docRef.id,
    invoiceNumber,
    clientId: body.clientId,
    purchaseIds: Array.isArray(body.purchaseIds) ? body.purchaseIds : (body.purchaseId ? [body.purchaseId] : []),
    items: body.items,
    subtotal: Number(body.subtotal || 0),
    tax: Number(body.tax || 0),
    total: Number(body.total || 0),
    notes: body.notes || "",
    paymentTerms: body.paymentTerms || "30",
    status: (body.status as InvoiceStatus) || "draft",
    createdAt: now,
    dueDate: new Date(body.dueDate).getTime(),
    updatedAt: now
  };

  await docRef.set(invoice);
  res.status(201).json({ invoice });
});

router.patch("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const ref = COL.doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Not found" });

  const current = snap.data() as Invoice;
  const patch = req.body || {};
  let subtotal = Number(patch.subtotal ?? current.subtotal);
  let tax = Number(patch.tax ?? current.tax);
  let total = Number(patch.total ?? current.total);

  if (Array.isArray(patch.items)) {
    subtotal = patch.items.reduce((s: number, it: any) => s + Number(it.total || 0), 0);
    tax = Number(patch.tax ?? subtotal * 0.18);
    total = Number(patch.total ?? subtotal + tax);
  }

  const merged: Invoice = {
    ...current,
    ...patch,
    subtotal,
    tax,
    total,
    updatedAt: Date.now(),
    dueDate: patch.dueDate ? new Date(patch.dueDate).getTime() : current.dueDate
  };

  await ref.set(merged, { merge: true });
  res.json({ invoice: merged });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await COL.doc(req.params.id).delete();
  res.json({ ok: true });
});

export default router;
