"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../firebase");
const jwt_1 = require("../utils/jwt");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
const USERS = firebase_1.db.collection("master_users");
async function ensureSeedUsers() {
    const snap = await USERS.limit(1).get();
    if (!snap.empty)
        return;
    const now = Date.now();
    const list = [
        {
            email: "admin@fedhubsoftware.com",
            name: "System Admin",
            role: "admin",
            passwordHash: bcryptjs_1.default.hashSync("Admin@123", 10),
            createdAt: now,
            updatedAt: now
        },
        {
            email: "employee@fedhubsoftware.com",
            name: "Employee User",
            role: "employee",
            passwordHash: bcryptjs_1.default.hashSync("Employee@123", 10),
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
router.post("/login", async (req, res) => {
    const { email, password } = (req.body || {});
    if (!email || !password)
        return res.status(400).json({ error: "Email and password are required" });
    const q = await USERS.where("email", "==", String(email).toLowerCase()).limit(1).get();
    if (q.empty)
        return res.status(401).json({ error: "Invalid email or password" });
    const user = q.docs[0].data();
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: "Invalid email or password" });
    const token = (0, jwt_1.signJwt)({ id: user.id, email: user.email, role: user.role, name: user.name });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});
router.post("/logout", (_req, res) => res.json({ ok: true }));
router.get("/me", jwt_1.authRequired, (req, res) => {
    const u = req.user;
    res.json({ id: u.sub, email: u.email, role: u.role, name: u.name });
});
exports.default = router;
