import { configureStore } from '@reduxjs/toolkit';
//import { api } from './lib/api/api';
import { clientApi } from './lib/api/slices/clients';


export const store = configureStore({
  reducer: {
    [clientApi.reducerPath]: clientApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(clientApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;