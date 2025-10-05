// backend/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12h

type Role = "admin" | "employee";

export type User = {
  id: string;
  email: string;
  /** For simplicity this is plain text; switch to a hash in production */
  password: string;
  role: Role;
  name: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type MasterStore = {
  users: User[];
};

/* -----------------------------------------------------------------------------
   Tiny file-based “master table” store (no extra deps).
   File lives at: mock/data/master.json (created on first run).
----------------------------------------------------------------------------- */
const DATA_DIR = path.resolve(process.cwd(), "mock", "data");
const STORE_FILE = path.join(DATA_DIR, "master.json");

function readStore(): MasterStore {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const initial: MasterStore = { users: [] };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as MasterStore;
    // shape guard
    if (!parsed || !Array.isArray(parsed.users)) return { users: [] };
    return parsed;
  } catch {
    return { users: [] };
  }
}

function writeStore(store: MasterStore) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function upsertUser(user: User) {
  const store = readStore();
  const idx = store.users.findIndex(
    (u) => u.email.toLowerCase() === user.email.toLowerCase()
  );
  const now = new Date().toISOString();
  if (idx === -1) {
    store.users.push({
      ...user,
      createdAt: now,
      updatedAt: now,
      active: user.active ?? true,
    });
  } else {
    store.users[idx] = {
      ...store.users[idx],
      ...user,
      updatedAt: now,
    };
  }
  writeStore(store);
}

function seedUsersIfMissing() {
  const store = readStore();
  const hasAdmin = store.users.some((u) => u.role === "admin");
  const hasEmployee = store.users.some((u) => u.role === "employee");

  if (!hasAdmin) {
    upsertUser({
      id: crypto.randomUUID(),
      email: "admin@fedhubsoftware.com",
      password: "Admin@123",
      role: "admin",
      name: "System Admin",
      active: true,
    });
  }

  if (!hasEmployee) {
    upsertUser({
      id: crypto.randomUUID(),
      email: "employee@fedhubsoftware.com",
      password: "Employee@123",
      role: "employee",
      name: "Employee User",
      active: true,
    });
  }
}

// Ensure our “master table” has the two default users on boot
seedUsersIfMissing();

/* -----------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------- */
function signJWT(user: User) {
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

/* -----------------------------------------------------------------------------
   Routes
----------------------------------------------------------------------------- */

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const store = readStore();
  const user = store.users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.active === false) {
    return res.status(403).json({ error: "User is disabled" });
  }

  const token = signJWT(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => res.json({ ok: true }));

// GET /api/auth/me
router.get("/me", authRequired, (req: Request, res: Response) => {
  const u = (req as any).user as {
    sub: string;
    email: string;
    role: Role;
    name: string;
  };
  res.json({ id: u.sub, email: u.email, role: u.role, name: u.name });
});

/* -----------------------------------------------------------------------------
   (Optional) tiny admin endpoints to see/maintain master users
   NOTE: Keep them protected in real deployments.
----------------------------------------------------------------------------- */

// GET /api/auth/master/users
router.get("/master/users", (req, res) => {
  const store = readStore();
  res.json(store.users.map(({ password, ...u }) => u)); // hide password
});

// POST /api/auth/master/users  -> upsert (simple)
router.post("/master/users", (req, res) => {
  const body = req.body as Partial<User>;
  if (!body.email || !body.password || !body.role || !body.name) {
    return res.status(400).json({ error: "email, password, role, name required" });
  }
  upsertUser({
    id: body.id || crypto.randomUUID(),
    email: body.email,
    password: body.password,
    role: body.role as Role,
    name: body.name,
    active: body.active ?? true,
  });
  const store = readStore();
  const saved = store.users.find(
    (u) => u.email.toLowerCase() === body.email!.toLowerCase()
  )!;
  const { password, ...safe } = saved;
  res.json(safe);
});

export default router;
