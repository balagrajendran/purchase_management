"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../firebase");
const router = (0, express_1.Router)();
const COL = firebase_1.db.collection("settings");
router.get("/", async (_req, res) => {
    const snap = await COL.orderBy("updatedAt", "desc").limit(1).get();
    if (snap.empty)
        return res.json(null);
    return res.json(snap.docs[0].data());
});
router.post("/", async (req, res) => {
    const now = Date.now();
    const payload = req.body ?? {};
    const ref = COL.doc();
    const doc = {
        id: ref.id,
        data: payload,
        createdAt: now,
        updatedAt: now
    };
    await ref.set(doc);
    return res.status(201).json(doc);
});
router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const ref = COL.doc(id);
    const exists = await ref.get();
    if (!exists.exists)
        return res.status(404).json({ error: "Not found" });
    const now = Date.now();
    const incoming = req.body ?? {};
    const merged = { ...(exists.data() || {}), data: incoming, updatedAt: now };
    await ref.set(merged, { merge: true });
    return res.json(merged);
});
router.get("/:id", async (req, res) => {
    const doc = await COL.doc(req.params.id).get();
    if (!doc.exists)
        return res.status(404).json({ error: "Not found" });
    return res.json(doc.data());
});
exports.default = router;
