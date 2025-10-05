// backend/src/index.ts
import path from 'node:path';
import { config } from 'dotenv';

// Load local env once, *before* importing anything that reads process.env
config({ path: path.join(process.cwd(), '.env.local-only') });

const { app } = await import('./app.js');
const { initFirestore } = await import('./firestore.js');

await initFirestore();

const PORT = Number(process.env.PORT ?? 8080);
if (!process.env.FUNCTION_TARGET && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Local API listening on http://localhost:${PORT}`);
  });
}

export default app;
