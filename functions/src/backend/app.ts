import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import helmet from "helmet";

import authRouter from "./routes/auth";
import settingsRouter from "./routes/settings";
import clientsRouter from "./routes/clients";
import purchasesRouter from "./routes/purchases";
import invoicesRouter from "./routes/invoices";
import financeRouter from "./routes/finance";

export const app = express();

app.set("trust proxy", true);

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        /\.web\.app$/.test(origin) ||
        /\.firebaseapp\.com$/.test(origin) ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: false
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  morgan(process.env.NODE_ENV === "production" ? "tiny" : "dev", {
    skip: (req) => req.path === "/api/healthz" || req.path === "/healthz"
  })
);

app.get("/", (_req, res) =>
  res.json({ ok: true, service: "purchase-management-api" })
);
app.get("/healthz", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get("/api/healthz", (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);

app.use("/api/auth", authRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/finance", financeRouter);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const message = err?.message || (status === 500 ? "Internal Server Error" : "Request failed");
  if (process.env.NODE_ENV !== "production") console.error(err);
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && err?.stack ? { stack: err.stack } : {})
  });
});

export default app;
