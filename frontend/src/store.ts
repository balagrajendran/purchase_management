// src/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { clientApi } from "./lib/api/slices/clients";
import { purchaseApi } from "./lib/api/slices/purchases";
import { invoiceApi } from "./lib/api/slices/invoices";
import { financeApi } from "./lib/api/slices/finance";
import { settingsApi } from "./lib/api/slices/settings";

export const store = configureStore({
  reducer: {
    [clientApi.reducerPath]: clientApi.reducer,
    [purchaseApi.reducerPath]: purchaseApi.reducer,
    [invoiceApi.reducerPath]: invoiceApi.reducer,
    [financeApi.reducerPath]: financeApi.reducer,
     [settingsApi.reducerPath]: settingsApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      clientApi.middleware,
      purchaseApi.middleware,
      invoiceApi.middleware,
      financeApi.middleware,
      settingsApi.middleware
    ),
});
