import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Provider } from 'react-redux';
import { store } from './store';
import { ApiProvider } from '@reduxjs/toolkit/query/react';
import { api } from './lib/api/api';

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
