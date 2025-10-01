# Purchase Management Backend (GCP Firestore + Cloud Run)

Production-ready Express + TypeScript API for your React UI, with Firestore as database.

## Endpoints

- `GET /api/health`
- **Clients**
  - `GET /api/clients?limit=25&pageToken=...`
  - `GET /api/clients/:id`
  - `POST /api/clients` (body: Client)
  - `PUT /api/clients/:id` (partial body)
  - `DELETE /api/clients/:id`
- **Purchases**
  - `GET /api/purchases` (same pagination)
  - `GET /api/purchases/:id`
  - `POST /api/purchases`
  - `PUT /api/purchases/:id`
  - `DELETE /api/purchases/:id`
- **Invoices**
  - `GET /api/invoices`
  - `GET /api/invoices/:id`
  - `POST /api/invoices`
  - `PUT /api/invoices/:id`
  - `DELETE /api/invoices/:id`

Schemas match your UI's `src/types/index.ts`.

## Local Dev

```bash
cd backend
cp .env.example .env
npm i
npm run dev
```

## Google Cloud (recommended)

1. **Enable APIs**: Cloud Run, Firestore, IAM, Cloud Build
2. **Create Firestore (Native mode)** in your project
3. **Service Account**: create one with *Cloud Datastore User* role; download JSON
4. **Build & Deploy**

```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/purchase-api ./backend
gcloud run deploy purchase-api \\
  --image gcr.io/$PROJECT_ID/purchase-api \\
  --platform managed \\
  --region asia-south1 \\
  --allow-unauthenticated \\
  --set-env-vars=GCP_PROJECT_ID=$PROJECT_ID,FIRESTORE_DB_ID='(default)'
```

If using a Service Account JSON:
```
--set-env-vars=GCP_PROJECT_ID=$PROJECT_ID,SERVICE_ACCOUNT_JSON='$(cat service-account.json | tr -d "\n")'
```

## CORS
Update `CORS_ORIGINS` in `.env` or Cloud Run env to your frontend origin(s).

## RTK Query Integration
See `frontend_integration/` for a drop-in `api.ts` and domain slices.
