"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwt = signJwt;
exports.authRequired = authRequired;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const TOKEN_TTL_SECONDS = 60 * 60 * 12;
function signJwt(user) {
    return jsonwebtoken_1.default.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}
function authRequired(req, res, next) {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
    if (!token)
        return res.status(401).json({ error: "Missing token" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
