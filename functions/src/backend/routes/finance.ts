import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { Invoice } from "../types";

const router = Router();
const INVOICES = db.collection("invoices");

router.get("/kpi", async (_req: Request, res: Response) => {
  const snap = await INVOICES.get();
  const invoices = snap.docs.map((d) => d.data() as Invoice);

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalInvoices = invoices.length;
  const paid = invoices.filter((i) => i.status === "paid").length;
  const pending = invoices.filter((i) => i.status === "sent" || i.status === "draft").length;
  const overdue = invoices.filter((i) => i.status === "overdue").length;

  res.json({
    totalRevenue,
    totalInvoices,
    paidInvoices: paid,
    pendingInvoices: pending,
    overdueInvoices: overdue
  });
});

router.get("/", async (_req: Request, res: Response) => {
  const snap = await INVOICES.orderBy("createdAt", "desc").limit(25).get();
  const items = snap.docs.map((d) => d.data());
  res.json({ items, total: items.length });
});

export default router;
