import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { Client } from "../types";

const router = Router();
const COL = db.collection("clients");

router.get("/", async (_req: Request, res: Response) => {
  const snap = await COL.orderBy("updatedAt", "desc").get();
  const items = snap.docs.map((d) => d.data() as Client);
  res.json({ items, total: items.length });
});

router.post("/", async (req: Request, res: Response) => {
  const now = Date.now();
  const ref = COL.doc();
  const client: Client = {
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

router.put("/:id", async (req: Request, res: Response) => {
  const ref = COL.doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Not found" });
  const now = Date.now();
  const merged = { ...(snap.data() || {}), ...req.body, updatedAt: now };
  await ref.set(merged, { merge: true });
  res.json(merged);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await COL.doc(req.params.id).delete();
  res.json({ ok: true });
});

export default router;
