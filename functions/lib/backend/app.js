"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const settings_1 = __importDefault(require("./routes/settings"));
const clients_1 = __importDefault(require("./routes/clients"));
const purchases_1 = __importDefault(require("./routes/purchases"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const finance_1 = __importDefault(require("./routes/finance"));
exports.app = (0, express_1.default)();
exports.app.set("trust proxy", true);
const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:") ||
            /\.web\.app$/.test(origin) ||
            /\.firebaseapp\.com$/.test(origin) ||
            allowedOrigins.includes(origin)) {
            return cb(null, true);
        }
        return cb(null, false);
    },
    credentials: false
}));
exports.app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
exports.app.use((0, compression_1.default)());
exports.app.use(express_1.default.json({ limit: "10mb" }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
exports.app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "tiny" : "dev", {
    skip: (req) => req.path === "/api/healthz" || req.path === "/healthz"
}));
exports.app.get("/", (_req, res) => res.json({ ok: true, service: "purchase-management-api" }));
exports.app.get("/healthz", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
exports.app.get("/api/healthz", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
exports.app.use("/api/auth", auth_1.default);
exports.app.use("/api/settings", settings_1.default);
exports.app.use("/api/clients", clients_1.default);
exports.app.use("/api/purchases", purchases_1.default);
exports.app.use("/api/invoices", invoices_1.default);
exports.app.use("/api/finance", finance_1.default);
exports.app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.app.use((err, _req, res, _next) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const message = err?.message || (status === 500 ? "Internal Server Error" : "Request failed");
    if (process.env.NODE_ENV !== "production")
        console.error(err);
    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV !== "production" && err?.stack ? { stack: err.stack } : {})
    });
});
exports.default = exports.app;
