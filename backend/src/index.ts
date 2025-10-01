import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json as bodyParserJson } from 'express';
import { healthRouter } from './routes/health.js';
import { clientsRouter } from './routes/clients.js';
import { purchasesRouter } from './routes/purchases.js';
import { invoicesRouter } from './routes/invoices.js';
import { initFirestore } from './lib/firestore.js';

dotenv.config();

// Initialize Firestore (throws if misconfigured)
await initFirestore();

const app = express();

// CORS
const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all for simplicity; tighten in production
  credentials: true
}));

// Parsers
app.use(bodyParserJson({ limit: '5mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/invoices', invoicesRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: String(err?.message || err) });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
