// functions/src/firebase.ts
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { Auth, getAuth } from 'firebase-admin/auth';

/**
 * Region you want to run your HTTPS functions in.
 * Keep this in one place so your onRequest handlers can do:
 *   export const api = onRequest({ region: REGION }, handler)
 *
 * If you already set region elsewhere, feel free to remove this export.
 */
export const REGION =
  process.env.FUNCTION_REGION ||
  process.env.FUNCTIONS_REGION ||
  process.env.GCLOUD_REGION ||
  'asia-south1';

/**
 * Firestore database id to use.
 * Set in your environment (recommended):
 *   firebase functions:secrets:set FIRESTORE_DB_ID --data="pm-db"
 * or
 *   firebase functions:config:set app.firestore_db_id="pm-db"
 *
 * Fallback to '(default)' if nothing is set (you can change this to 'pm-db'
 * if you always want to force the named DB).
 */
const FIRESTORE_DB_ID: string =
  process.env.FIRESTORE_DB_ID ||
  (process.env.app_firestore_db_id as string) || // if you mapped functions:config:set app.firestore_db_id
  '(default)'; // <-- change to 'pm-db' if you prefer a hard default

/**
 * Detect if emulators are being used. The Admin SDK automatically honors
 * FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST when set.
 */
export const USING_EMULATORS = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
);

/** Singleton Admin app */
const app: App = getApps().length ? getApps()[0] : initializeApp();

/** Export initialized Admin services */
export const adminApp = app;
export const db: Firestore = getFirestore(app, FIRESTORE_DB_ID);
export const adminAuth: Auth = getAuth(app);

/**
 * Optional: tiny helper to log what DB we’re writing to.
 * Call this once at cold start from index.ts if you want:
 *   import { logBackendInit } from './firebase'
 *   logBackendInit()
 */
export function logBackendInit() {
  // Avoid noisy logs in tests
  if (process.env.NODE_ENV === 'test') return;

  // eslint-disable-next-line no-console
  console.log(
    `[backend] region=${REGION} db=${FIRESTORE_DB_ID} emulators=${USING_EMULATORS}`
  );
}
