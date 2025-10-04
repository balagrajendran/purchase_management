// functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import { logBackendInit } from './backend/firebase'


let app: any = null;

export const api = onRequest(
  { region: 'asia-south1', secrets: ['purchase-management-db'] },             // <<— force region
  async (req, res) => {
    if (!app) {
      const mod = await import('./backend/app.js'); // add .js if building to ESM
      app = mod.default;
    }
    return app(req, res);
  }
);

logBackendInit()
