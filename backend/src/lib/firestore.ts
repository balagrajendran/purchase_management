import admin from 'firebase-admin';

let initialized = false;

export async function initFirestore() {
  if (initialized) return;
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT must be set');
  }

  if (!admin.apps.length) {
    const saJson = process.env.SERVICE_ACCOUNT_JSON;
    if (saJson) {
      const creds = JSON.parse(saJson);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId: projectId
      });
    } else {
      // Use default credentials (Cloud Run/GCE) or GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({ projectId });
    }
  }

  const databaseId = process.env.FIRESTORE_DB_ID || '(default)';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (admin.firestore() as any).settings({ ignoreUndefinedProperties: true });
  console.log('Firestore initialized for project:', projectId, ' DB:', databaseId);
  initialized = true;
}

export const db = () => admin.firestore();
