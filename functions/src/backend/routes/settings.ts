import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { SettingsDoc } from "../types";

const router = Router();
const COL = db.collection("settings");

router.get("/", async (_req: Request, res: Response) => {
  const snap = await COL.orderBy("updatedAt", "desc").limit(1).get();
  if (snap.empty) return res.json(null);
  return res.json(snap.docs[0].data() as SettingsDoc);
});

router.post("/", async (req: Request, res: Response) => {
  const now = Date.now();
  const payload = req.body ?? {};
  const ref = COL.doc();
  const doc: SettingsDoc = {
    id: ref.id,
    data: payload,
    createdAt: now,
    updatedAt: now
  };
  await ref.set(doc);
  return res.status(201).json(doc);
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const ref = COL.doc(id);
  const exists = await ref.get();
  if (!exists.exists) return res.status(404).json({ error: "Not found" });
  const now = Date.now();
  const incoming = req.body ?? {};
  const merged = { ...(exists.data() || {}), data: incoming, updatedAt: now };
  await ref.set(merged, { merge: true });
  return res.json(merged);
});

router.get("/:id", async (req: Request, res: Response) => {
  const doc = await COL.doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Not found" });
  return res.json(doc.data());
});

export default router;
