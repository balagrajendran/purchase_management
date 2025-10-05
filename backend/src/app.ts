// backend/src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import helmet from "helmet";

// Import your route modules (adjust paths if your folders differ)
import authRouter from "./routes/auth.js";
import settingsRouter from "./routes/settings.js";
import {clientsRouter} from "./routes/clients.js";
import purchasesRouter from "./routes/purchases.js";
import invoicesRouter from "./routes/invoices.js";
import financeRouter from "./routes/finance.js";
import { initFirestore } from "./firestore.js";

export const app = express();

/**
 * When deployed behind Firebase Hosting/Functions, requests come through a proxy.
 * This keeps correct req.ip, req.protocol, etc.
 */
app.set("trust proxy", true);

// Initialize Firestore (throws if misconfigured)
await initFirestore();
/**
 * CORS
 * - Allow localhost during dev
 * - Allow your deployed frontend origin(s) via env var FRONTEND_URL (comma-separated allowed)
 * - Fallback: reflect origin for simple setups (safe enough with credentials=false)
 */
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      // Permit Firebase Hosting preview/site domains by default if desired:
      if (/\.web\.app$/.test(origin) || /\.firebaseapp\.com$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: false,
  })
);

// Security headers (relaxed CSP to avoid blocking dev tools)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Useful middleware
app.use(compression());
app.use(express.json({ limit: "10mb" })); // supports bulk upload payloads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging (tiny in prod, dev-style locally)
app.use(
  morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev", {
    skip: (req: any) => req.path === "/api/healthz" || req.path === "/healthz",
  })
);

// --- Health & meta routes ---
app.get("/", (_req, res) =>
  res.json({ ok: true, service: "purchase-management-api" })
);
app.get("/healthz", (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);
app.get("/api/healthz", (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);

// --- Mount API routes ---
app.use("/api/auth", authRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/finance", financeRouter);

// 404 handler (API-first)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const message =
    err?.message || (status === 500 ? "Internal Server Error" : "Request failed");
  if (process.env.NODE_ENV !== "production") {
    // Log stack in non-prod for easier debugging
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && err?.stack
      ? { stack: err.stack }
      : {}),
  });
});

export default app;
