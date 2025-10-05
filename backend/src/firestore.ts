// src/firestore.ts
import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';

let initialized = false;
let _db: FirebaseFirestore.Firestore | undefined;

function resolveProjectId(fromSa?: any): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    fromSa?.project_id
  );
}

export async function initFirestore() {
  if (initialized && _db) return;

  const databaseId = process.env.FIRESTORE_DB_ID || '(default)';

  if (!admin.apps.length) {
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const saJsonOrPath = process.env.SERVICE_ACCOUNT_JSON;

    let creds: Record<string, unknown> | undefined;
    let projectId: string | undefined;

    if (saJsonOrPath) {
      if (saJsonOrPath.trim().startsWith('{')) {
        creds = JSON.parse(saJsonOrPath);
      } else if (existsSync(saJsonOrPath)) {
        creds = JSON.parse(readFileSync(saJsonOrPath, 'utf8'));
      } else {
        throw new Error(
          'SERVICE_ACCOUNT_JSON must be a JSON string or a valid path to a JSON file'
        );
      }

      projectId = resolveProjectId(creds);

      admin.initializeApp({
        credential: admin.credential.cert(creds as admin.ServiceAccount),
        projectId,
      });
      console.log(`[firestore] using SERVICE_ACCOUNT_JSON. projectId=${projectId}`);
    } else if (saPath && existsSync(saPath)) {
      projectId = resolveProjectId();
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log(`[firestore] using GOOGLE_APPLICATION_CREDENTIALS. projectId=${projectId}`);
    } else {
      projectId = resolveProjectId();
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log(`[firestore] using ADC. projectId=${projectId}`);
    }
  }

  _db = getFirestore(admin.app(), (process.env.FIRESTORE_DB_ID || '(default)') as any);
  
  _db.settings({ ignoreUndefinedProperties: true });

  const effectiveProjectId =
    admin.app().options.projectId || resolveProjectId() || '(unknown)';
  console.log(
    `[firestore] initialized project=${effectiveProjectId} db=${process.env.FIRESTORE_DB_ID || '(default)'}`
  );

  initialized = true;
}

/**
 * Lazily return a Firestore instance. Safe to use anywhere.
 * Always `await getDb()` in routes/handlers instead of calling `db()`.
 */
export async function getDb(): Promise<FirebaseFirestore.Firestore> {
  if (!_db) await initFirestore();
  return _db!;
}

/** Synchronous accessor (deprecated). Only safe *after* initFirestore() was awaited. */
export const db = () => {
  if (!_db) throw new Error('Firestore not initialized. Call initFirestore() first.');
  return _db;
};
