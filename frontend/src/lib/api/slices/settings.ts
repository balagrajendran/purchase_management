// src/api/slices/settings.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/* -----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */
export interface AppSettings {
  // Appearance
  theme: "light" | "dark";
  sidebarCollapsed: boolean;

  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  invoiceReminders: boolean;

  // Company Info
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyGST: string;
  companyPAN: string;
  companyMSME: string;

  // Invoice Settings
  defaultTaxRate: number;        // %
  defaultPaymentTerms: number;   // days
  invoicePrefix: string;

  // Security (optional, for parity with UI)
  twoFactorAuth?: boolean;
  sessionTimeout?: number;       // minutes

  // Metadata (optional; returned by backend)
  id?: string;
  createdAt?: string;            // ISO
  updatedAt?: string;            // ISO
}

export type UpdateSettingsRequest = Partial<AppSettings>;

/* -----------------------------------------------------------------------------
 * Config
 * -------------------------------------------------------------------------- */
const API_BASE_URL =
  // vite
  (import.meta as any).env?.VITE_API_BASE_URL ||
  // fallback for local dev
  "http://localhost:8080/api";

/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */
const toIso = (v: any): string | undefined => {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  const ts = v?.toDate?.(); // Firestore Timestamp
  if (ts?.toISOString) return ts.toISOString();
  if (v instanceof Date) return v.toISOString();
  try {
    return new Date(v).toISOString();
  } catch {
    return undefined;
  }
};

const normalize = (raw: any): AppSettings => {
  // Allow server to return either a single document or {settings} wrapper
  const s = raw?.settings ?? raw ?? {};

  return {
    theme: s.theme === "dark" ? "dark" : "light",
    sidebarCollapsed: !!s.sidebarCollapsed,

    emailNotifications: s.emailNotifications ?? true,
    pushNotifications: s.pushNotifications ?? false,
    invoiceReminders: s.invoiceReminders ?? true,

    companyName: s.companyName ?? "",
    companyEmail: s.companyEmail ?? "",
    companyPhone: s.companyPhone ?? "",
    companyAddress: s.companyAddress ?? "",
    companyGST: s.companyGST ?? "",
    companyPAN: s.companyPAN ?? "",
    companyMSME: s.companyMSME ?? "",

    defaultTaxRate: Number.isFinite(Number(s.defaultTaxRate))
      ? Number(s.defaultTaxRate)
      : 18,
    defaultPaymentTerms: Number.isFinite(Number(s.defaultPaymentTerms))
      ? Number(s.defaultPaymentTerms)
      : 30,
    invoicePrefix: s.invoicePrefix ?? "INV",

    twoFactorAuth: !!s.twoFactorAuth,
    sessionTimeout: Number.isFinite(Number(s.sessionTimeout))
      ? Number(s.sessionTimeout)
      : 60,

    id: s.id,
    createdAt: toIso(s.createdAt),
    updatedAt: toIso(s.updatedAt ?? s.createdAt),
  };
};

/* -----------------------------------------------------------------------------
 * RTK Query API
 *
 * Backend routes expected (create these in backend/src/routes/settings.ts):
 *  - GET    /api/settings              -> returns the latest settings document
 *  - PATCH  /api/settings              -> merges/updates settings and returns saved doc
 *  (Optional)
 *  - PUT    /api/settings              -> replaces settings and returns saved doc
 * -------------------------------------------------------------------------- */
export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Settings"],
  endpoints: (builder) => ({
    /** Load the latest settings */
    getSettings: builder.query<AppSettings, void>({
      query: () => ({ url: "/settings", method: "GET" }),
      transformResponse: (res: any) => {
        // Some backends may return {items:[...]} — pick latest
        if (Array.isArray(res?.items)) {
          const latest =
            res.items[0] ??
            res.items.sort?.(
              (a: any, b: any) =>
                new Date(b?.updatedAt || b?.createdAt || 0).getTime() -
                new Date(a?.updatedAt || a?.createdAt || 0).getTime()
            )[0];
          return normalize(latest || {});
        }
        return normalize(res);
      },
      providesTags: [{ type: "Settings", id: "CURRENT" }],
    }),

    /** Update (merge) settings */
    updateSettings: builder.mutation<AppSettings, UpdateSettingsRequest>({
      query: (body) => ({
        url: "/settings",
        method: "PATCH",
        body,
      }),
      transformResponse: (res: any) => normalize(res),
      invalidatesTags: [{ type: "Settings", id: "CURRENT" }],
    }),

    /** Optional: replace whole doc */
    replaceSettings: builder.mutation<AppSettings, AppSettings>({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      transformResponse: (res: any) => normalize(res),
      invalidatesTags: [{ type: "Settings", id: "CURRENT" }],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useReplaceSettingsMutation,
} = settingsApi;
