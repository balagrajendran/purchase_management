# Firebase Functions for Purchase Management (Express API)

Deployed as a single HTTPS Function named `api`.

## Scripts
- `npm run build` - compile TypeScript to `lib/`
- `npm run deploy` - build and deploy functions
- `npm run serve` - build and run Firebase emulators (functions + hosting)

## Env
- `JWT_SECRET` (secret): `firebase functions:secrets:set JWT_SECRET`
- `FRONTEND_URL` (optional, comma-separated origins for CORS)
- Credentials: functions will use default credentials in Firebase. Locally, set GOOGLE_APPLICATION_CREDENTIALS to your service account.

## Endpoints (mounted under /api)
- `/api/auth` - login/logout/me (master_users collection)
- `/api/settings` - versioned settings
- `/api/clients` - CRUD
- `/api/purchases` - list / client filter / by-ids
- `/api/invoices` - CRUD + stats
- `/api/finance` - KPI
