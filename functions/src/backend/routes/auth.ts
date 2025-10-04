import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { MasterUser, Role } from "../types";
import { signJwt, authRequired } from "../utils/jwt";
import bcrypt from "bcryptjs";

const router = Router();
const USERS = db.collection("master_users");

async function ensureSeedUsers() {
  const snap = await USERS.limit(1).get();
  if (!snap.empty) return;

  const now = Date.now();
  const list: Omit<MasterUser, "id">[] = [
    {
      email: "admin@fedhubsoftware.com",
      name: "System Admin",
      role: "admin",
      passwordHash: bcrypt.hashSync("Admin@123", 10),
      createdAt: now,
      updatedAt: now
    },
    {
      email: "employee@fedhubsoftware.com",
      name: "Employee User",
      role: "employee",
      passwordHash: bcrypt.hashSync("Employee@123", 10),
      createdAt: now,
      updatedAt: now
    }
  ];

  for (const u of list) {
    const ref = USERS.doc();
    await ref.set({ ...u, id: ref.id, email: u.email.toLowerCase() });
  }
}
ensureSeedUsers().catch(console.error);

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const q = await USERS.where("email", "==", String(email).toLowerCase()).limit(1).get();
  if (q.empty) return res.status(401).json({ error: "Invalid email or password" });

  const user = q.docs[0].data() as MasterUser;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signJwt({ id: user.id, email: user.email, role: user.role, name: user.name });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

router.post("/logout", (_req, res) => res.json({ ok: true }));

router.get("/me", authRequired, (req: Request, res: Response) => {
  const u = (req as any).user as { sub: string; email: string; role: Role; name: string };
  res.json({ id: u.sub, email: u.email, role: u.role, name: u.name });
});

export default router;
