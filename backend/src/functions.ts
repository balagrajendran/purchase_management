import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import app from './app.js';

export const REGION =
  process.env.FUNCTION_REGION ||
  process.env.FUNCTIONS_REGION ||
  process.env.GCLOUD_REGION ||
  'asia-south1';

// make FIRESTORE_DB_ID available to process.env in prod
export const FIRESTORE_DB_ID = defineSecret('FIRESTORE_DB_ID');

export const api = onRequest(
  { region: REGION, cors: true, secrets: [FIRESTORE_DB_ID] },
  (req: any, res: any) => app(req, res)
);
