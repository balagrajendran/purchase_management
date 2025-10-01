# Frontend wiring (RTK Query)

1) **Install deps** in your React app:
```bash
npm i @reduxjs/toolkit react-redux
```

2) **Create files** under `src/lib/api/`:
- `api.ts`  (from this folder's `api.ts`)
- `types.ts`
- `slices/clients.ts`
- `slices/purchases.ts`
- `slices/invoices.ts`

3) **Add store** (if you don't have one yet):
```ts
// src/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from './lib/api/api';

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

4) **Wrap your <App />**:
```tsx
// src/main.tsx
import { Provider } from 'react-redux';
import { store } from './store';
import { ApiProvider } from '@reduxjs/toolkit/query/react';
import { api } from './lib/api/api';

// Either Provider with store, or ApiProvider with api (choose one)
// Example with store:
<Provider store={store}>
  <App />
</Provider>
```

5) **Use hooks in pages** (examples):
```tsx
import { useListClientsQuery, useCreateClientMutation } from './lib/api/slices/clients';

const { data, isLoading } = useListClientsQuery({ limit: 50 });
const [createClient] = useCreateClientMutation();

await createClient({
  company: 'Acme', contactPerson: 'John', email: 'john@acme.com', phone: '...', status: 'active',
  gstNumber: '', msmeNumber: '', panNumber: '',
  billingAddress: { street:'', city:'', state:'', postalCode:'', country:'India' },
  shippingAddress: { street:'', city:'', state:'', postalCode:'', country:'India' },
  baseCurrency: 'INR'
});
```

6) **Configure API base URL**:
Create `.env` in React app:
```
VITE_API_BASE_URL=https://<your-cloud-run-url>/api
```
