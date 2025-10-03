// backend/src/routes/settings.ts
import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { db } from "../lib/firestore.js";

const router = Router();

const COL = "settings";
const DOC_ID = "current";

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */
type Theme = "light" | "dark";

export type AppSettings = {
  // Appearance
  theme: Theme;
  sidebarCollapsed: boolean;

  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  invoiceReminders: boolean;

  // Company Info
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyGST: string;
  companyPAN: string;
  companyMSME: string;

  // Invoice Settings
  defaultTaxRate: number;      // %
  defaultPaymentTerms: number; // days
  invoicePrefix: string;

  // Security (optional)
  twoFactorAuth?: boolean;
  sessionTimeout?: number;     // minutes

  // Meta
  createdAt?: FirebaseFirestore.Timestamp | string;
  updatedAt?: FirebaseFirestore.Timestamp | string;
};

const DEFAULTS: AppSettings = {
  theme: "light",
  sidebarCollapsed: false,

  emailNotifications: true,
  pushNotifications: false,
  invoiceReminders: true,

  companyName: "FedHub Software Solutions",
  companyEmail: "info@fedhubsoftware.com",
  companyPhone: "+91 9003285428",
  companyAddress:
    "P No 69,70 Gokula Nandhana, Gokul Nagar, Hosur, Krishnagiri-DT, Tamilnadu, India-635109",
  companyGST: "33AACCF2123P1Z5",
  companyPAN: "AACCF2123P",
  companyMSME: "UDYAM-TN-06-0012345",

  defaultTaxRate: 18,
  defaultPaymentTerms: 30,
  invoicePrefix: "INV",

  twoFactorAuth: false,
  sessionTimeout: 60,
};

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
const toISO = (v: any): string | undefined =>
  v?.toDate?.()?.toISOString?.() ??
  (typeof v === "string" ? v : undefined);

const normalize = (
  snap: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot
): any => {
  const s: any = snap.data() || {};
  return {
    id: snap.id,
    theme: s.theme === "dark" ? "dark" : "light",
    sidebarCollapsed: !!s.sidebarCollapsed,

    emailNotifications: !!s.emailNotifications,
    pushNotifications: !!s.pushNotifications,
    invoiceReminders: !!s.invoiceReminders,

    companyName: s.companyName ?? "",
    companyEmail: s.companyEmail ?? "",
    companyPhone: s.companyPhone ?? "",
    companyAddress: s.companyAddress ?? "",
    companyGST: s.companyGST ?? "",
    companyPAN: s.companyPAN ?? "",
    companyMSME: s.companyMSME ?? "",

    defaultTaxRate: Number(s.defaultTaxRate ?? 18),
    defaultPaymentTerms: Number(s.defaultPaymentTerms ?? 30),
    invoicePrefix: s.invoicePrefix ?? "INV",

    twoFactorAuth: !!s.twoFactorAuth,
    sessionTimeout: Number(s.sessionTimeout ?? 60),

    createdAt: toISO(s.createdAt),
    updatedAt: toISO(s.updatedAt) || toISO(s.createdAt),
  };
};

function sanitizePatch(body: Partial<AppSettings>): Partial<AppSettings> {
  const out: Partial<AppSettings> = {};

  if (body.theme) out.theme = body.theme === "dark" ? "dark" : "light";
  if (typeof body.sidebarCollapsed === "boolean")
    out.sidebarCollapsed = body.sidebarCollapsed;

  if (typeof body.emailNotifications === "boolean")
    out.emailNotifications = body.emailNotifications;
  if (typeof body.pushNotifications === "boolean")
    out.pushNotifications = body.pushNotifications;
  if (typeof body.invoiceReminders === "boolean")
    out.invoiceReminders = body.invoiceReminders;

  if (typeof body.companyName === "string") out.companyName = body.companyName;
  if (typeof body.companyEmail === "string")
    out.companyEmail = body.companyEmail;
  if (typeof body.companyPhone === "string")
    out.companyPhone = body.companyPhone;
  if (typeof body.companyAddress === "string")
    out.companyAddress = body.companyAddress;
  if (typeof body.companyGST === "string")
    out.companyGST = body.companyGST.toUpperCase();
  if (typeof body.companyPAN === "string")
    out.companyPAN = body.companyPAN.toUpperCase();
  if (typeof body.companyMSME === "string")
    out.companyMSME = body.companyMSME.toUpperCase();

  if (body.defaultTaxRate !== undefined) {
    const v = Number(body.defaultTaxRate);
    out.defaultTaxRate = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 18;
  }
  if (body.defaultPaymentTerms !== undefined) {
    const v = Number(body.defaultPaymentTerms);
    out.defaultPaymentTerms = Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 30;
  }
  if (typeof body.invoicePrefix === "string")
    out.invoicePrefix = body.invoicePrefix;

  if (typeof body.twoFactorAuth === "boolean")
    out.twoFactorAuth = body.twoFactorAuth;
  if (body.sessionTimeout !== undefined) {
    const v = Number(body.sessionTimeout);
    out.sessionTimeout = Number.isFinite(v) ? Math.max(5, Math.floor(v)) : 60;
  }

  return out;
}

async function ensureCurrentDoc(): Promise<FirebaseFirestore.DocumentReference> {
  const ref = db().collection(COL).doc(DOC_ID);
  const snap = await ref.get();

  if (!snap.exists) {
    const now = admin.firestore.Timestamp.now();
    await ref.set(
      {
        ...DEFAULTS,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }
  return ref;
}

/* ----------------------------------------------------------------------------
 * Routes
 * ------------------------------------------------------------------------- */

/**
 * GET /api/settings
 * Returns the latest settings document.
 * Priority:
 *   1) Doc with id "current"
 *   2) Most recently updated doc in collection
 *   3) Creates defaults if collection empty
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Prefer the canonical "current" document
    const currentRef = db().collection(COL).doc(DOC_ID);
    const currSnap = await currentRef.get();

    if (currSnap.exists) {
      return res.json(normalize(currSnap));
    }

    // Fallback: query latest by updatedAt
    const q = await db()
      .collection(COL)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    if (!q.empty) {
      return res.json(normalize(q.docs[0]));
    }

    // If nothing exists, create defaults and return them
    const ref = await ensureCurrentDoc();
    const snap = await ref.get();
    return res.json(normalize(snap));
  } catch (err: any) {
    console.error("GET /settings error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to fetch settings" });
  }
});

/**
 * PATCH /api/settings
 * Merge updates into the current settings document.
 */
router.patch("/", async (req: Request, res: Response) => {
  try {
    const body: Partial<AppSettings> = req.body ?? {};
    const patch = sanitizePatch(body);
    const now = admin.firestore.Timestamp.now();

    const ref = await ensureCurrentDoc();

    // preserve createdAt if exists
    const existing = await ref.get();
    const createdAt =
      existing.exists && existing.get("createdAt")
        ? existing.get("createdAt")
        : now;

    await ref.set(
      {
        ...patch,
        createdAt,
        updatedAt: now,
      },
      { merge: true }
    );

    const updated = await ref.get();
    res.json(normalize(updated));
  } catch (err: any) {
    console.error("PATCH /settings error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to update settings" });
  }
});

/**
 * PUT /api/settings
 * Replace the settings document (keeps createdAt if present).
 */
router.put("/", async (req: Request, res: Response) => {
  try {
    const body: Partial<AppSettings> = req.body ?? {};
    const data = sanitizePatch(body);
    const now = admin.firestore.Timestamp.now();

    const ref = await ensureCurrentDoc();
    const existing = await ref.get();

    const createdAt =
      existing.exists && existing.get("createdAt")
        ? existing.get("createdAt")
        : now;

    await ref.set(
      {
        ...DEFAULTS,
        ...data,
        createdAt,
        updatedAt: now,
      },
      { merge: false }
    );

    const updated = await ref.get();
    res.json(normalize(updated));
  } catch (err: any) {
    console.error("PUT /settings error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to replace settings" });
  }
});

/**
 * (Optional) GET /api/settings/history?limit=10
 * Returns a few recent versions (if you ever write historical docs).
 * Not used by the UI, but handy for debugging.
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const snap = await db()
      .collection(COL)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    const items = snap.docs.map(normalize);
    res.json({ items });
  } catch (err: any) {
    console.error("GET /settings/history error", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to load settings history" });
  }
});

export default router;
