"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../firebase");
const router = (0, express_1.Router)();
const COL = firebase_1.db.collection("clients");
router.get("/", async (_req, res) => {
    const snap = await COL.orderBy("updatedAt", "desc").get();
    const items = snap.docs.map((d) => d.data());
    res.json({ items, total: items.length });
});
router.post("/", async (req, res) => {
    const now = Date.now();
    const ref = COL.doc();
    const client = {
        id: ref.id,
        company: req.body?.company || "Unnamed",
        contactPerson: req.body?.contactPerson || "",
        email: req.body?.email || "",
        phone: req.body?.phone || "",
        billingAddress: req.body?.billingAddress || {},
        gstNumber: req.body?.gstNumber || "",
        createdAt: now,
        updatedAt: now
    };
    await ref.set(client);
    res.status(201).json(client);
});
router.put("/:id", async (req, res) => {
    const ref = COL.doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
        return res.status(404).json({ error: "Not found" });
    const now = Date.now();
    const merged = { ...(snap.data() || {}), ...req.body, updatedAt: now };
    await ref.set(merged, { merge: true });
    res.json(merged);
});
router.delete("/:id", async (req, res) => {
    await COL.doc(req.params.id).delete();
    res.json({ ok: true });
});
exports.default = router;
