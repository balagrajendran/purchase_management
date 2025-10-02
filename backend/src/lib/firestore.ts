// src/lib/firestore.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';

let initialized = false;
// Keep a singleton Firestore instance
let _db: FirebaseFirestore.Firestore;

export async function initFirestore() {
  if (initialized && _db) return;

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT must be set');
  }

  const databaseId = process.env.FIRESTORE_DB_ID || '(default)'; // e.g. "(default)" or "purchase-management-db"

  if (!admin.apps.length) {
    // Choose one of:
    // 1) GOOGLE_APPLICATION_CREDENTIALS=<path-to-json>
    // 2) SERVICE_ACCOUNT_JSON=<inline JSON string> or <path to JSON>
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const saJsonOrPath = process.env.SERVICE_ACCOUNT_JSON;

    if (saJsonOrPath) {
      let creds: Record<string, unknown>;
      if (saJsonOrPath.trim().startsWith('{')) {
        creds = JSON.parse(saJsonOrPath);
      } else if (existsSync(saJsonOrPath)) {
        creds = JSON.parse(readFileSync(saJsonOrPath, 'utf8'));
      } else {
        throw new Error('SERVICE_ACCOUNT_JSON must be a JSON string or a valid path to a JSON file');
      }
      admin.initializeApp({
        credential: admin.credential.cert(creds as admin.ServiceAccount),
        projectId,
      });
    } else if (saPath && existsSync(saPath)) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }
  }

  // 👉 IMPORTANT: bind to the named database (or "(default)")
  _db = getFirestore(admin.app(), databaseId);
  // @ts-expect-error admin typings
  _db.settings({ ignoreUndefinedProperties: true });

  console.log(
    'Firestore initialized for project:',
    projectId,
    ' DB:',
    databaseId,
    '\nResource:',
    `projects/${projectId}/databases/${databaseId}`
  );

  initialized = true;
}

export const db = () => {
  if (!_db) throw new Error('Firestore not initialized. Call initFirestore() first.');
  return _db;
};
