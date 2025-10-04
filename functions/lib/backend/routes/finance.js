"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../firebase");
const router = (0, express_1.Router)();
const INVOICES = firebase_1.db.collection("invoices");
router.get("/kpi", async (_req, res) => {
    const snap = await INVOICES.get();
    const invoices = snap.docs.map((d) => d.data());
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
router.get("/", async (_req, res) => {
    const snap = await INVOICES.orderBy("createdAt", "desc").limit(25).get();
    const items = snap.docs.map((d) => d.data());
    res.json({ items, total: items.length });
});
exports.default = router;
