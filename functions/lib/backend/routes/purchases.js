"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../firebase");
const router = (0, express_1.Router)();
const COL = firebase_1.db.collection("purchases");
router.get("/", async (req, res) => {
    let q = COL.orderBy("updatedAt", "desc");
    const status = String(req.query.status || "");
    const clientId = String(req.query.clientId || "");
    if (status)
        q = COL.where("status", "==", status);
    if (clientId)
        q = COL.where("clientId", "==", clientId);
    const snap = await q.get();
    const items = snap.docs.map((d) => d.data());
    res.json({ items, total: items.length });
});
router.get("/client/:clientId", async (req, res) => {
    const statuses = (String(req.query.statuses || "") || "approved,completed")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const snap = await COL.where("clientId", "==", req.params.clientId).get();
    let items = snap.docs.map((d) => d.data());
    if (statuses.length)
        items = items.filter((p) => statuses.includes(p.status));
    res.json({ items, total: items.length });
});
router.get("/by-ids", async (req, res) => {
    const ids = String(req.query.ids || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!ids.length)
        return res.json({ items: [], total: 0 });
    const reads = await Promise.all(ids.map((id) => COL.doc(id).get()));
    const items = reads.filter((d) => d.exists).map((d) => d.data());
    res.json({ items, total: items.length });
});
router.post("/", async (req, res) => {
    const now = Date.now();
    const ref = COL.doc();
    const purchase = {
        id: ref.id,
        clientId: req.body?.clientId,
        poNumber: req.body?.poNumber || `PO-${now}`,
        status: req.body?.status || "pending",
        items: Array.isArray(req.body?.items) ? req.body.items : [],
        createdAt: now,
        updatedAt: now
    };
    await ref.set(purchase);
    res.status(201).json(purchase);
});
exports.default = router;
