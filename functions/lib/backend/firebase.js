"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.db = exports.adminApp = exports.USING_EMULATORS = exports.REGION = void 0;
exports.logBackendInit = logBackendInit;
// functions/src/firebase.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
/**
 * Region you want to run your HTTPS functions in.
 * Keep this in one place so your onRequest handlers can do:
 *   export const api = onRequest({ region: REGION }, handler)
 *
 * If you already set region elsewhere, feel free to remove this export.
 */
exports.REGION = process.env.FUNCTION_REGION ||
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
const FIRESTORE_DB_ID = process.env.FIRESTORE_DB_ID ||
    process.env.app_firestore_db_id || // if you mapped functions:config:set app.firestore_db_id
    '(default)'; // <-- change to 'pm-db' if you prefer a hard default
/**
 * Detect if emulators are being used. The Admin SDK automatically honors
 * FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST when set.
 */
exports.USING_EMULATORS = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
/** Singleton Admin app */
const app = (0, app_1.getApps)().length ? (0, app_1.getApps)()[0] : (0, app_1.initializeApp)();
/** Export initialized Admin services */
exports.adminApp = app;
exports.db = (0, firestore_1.getFirestore)(app, FIRESTORE_DB_ID);
exports.adminAuth = (0, auth_1.getAuth)(app);
/**
 * Optional: tiny helper to log what DB we’re writing to.
 * Call this once at cold start from index.ts if you want:
 *   import { logBackendInit } from './firebase'
 *   logBackendInit()
 */
function logBackendInit() {
    // Avoid noisy logs in tests
    if (process.env.NODE_ENV === 'test')
        return;
    // eslint-disable-next-line no-console
    console.log(`[backend] region=${exports.REGION} db=${FIRESTORE_DB_ID} emulators=${exports.USING_EMULATORS}`);
}
