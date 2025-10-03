// backend/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12h

type Role = "admin" | "employee";
type User = { id: string; email: string; password: string; role: Role; name: string };

// Hardcoded users as requested
const USERS: User[] = [
  {
    id: "u1",
    email: "admin@fedhubsoftware.com",
    password: "Admin@123", // keep simple per request
    role: "admin",
    name: "System Admin",
  },
  {
    id: "u2",
    email: "employee@fedhubsoftware.com",
    password: "Employee@123",
    role: "employee",
    name: "Employee User",
  },
];

function sign(user: User) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

function authRequired(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const user = USERS.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = sign(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});

// POST /api/auth/logout (no real blacklist; client should discard token)
router.post("/logout", (_req, res) => res.json({ ok: true }));

// GET /api/auth/me
router.get("/me", authRequired, (req: Request, res: Response) => {
  const u = (req as any).user as { sub: string; email: string; role: Role; name: string };
  res.json({ id: u.sub, email: u.email, role: u.role, name: u.name });
});

export default router;
