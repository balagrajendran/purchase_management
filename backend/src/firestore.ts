// backend/src/lib/firestore.ts
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _inited = false;
let _db: FirebaseFirestore.Firestore | undefined;

export async function initFirestore() {
  if (_inited && _db) return;

  const app = getApps().length ? getApps()[0] : initializeApp();
  const dbId = process.env.FIRESTORE_DB_ID || '(default)';

  _db = getFirestore(app, dbId);
  _db.settings({ ignoreUndefinedProperties: true });

  // eslint-disable-next-line no-console
  console.log(`[firestore] db=${dbId}`);
  _inited = true;
}

export async function getDb(): Promise<FirebaseFirestore.Firestore> {
  if (!_db) await initFirestore();
  return _db!;
}

export const db = () => {
  if (!_db) throw new Error('Firestore not initialized. Call initFirestore() first.');
  return _db;
};
