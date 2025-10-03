// src/lib/api/slices/invoices.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Invoice } from "../../../types";

export interface Paginated<T> {
  items: T[];
  nextPageToken?: string | null;
  total?: number;
}

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/** ---- helpers ---- */
const toIso = (v: any): string => {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  const ts = v?.toDate?.(); // Firestore Timestamp
  if (ts?.toISOString) return ts.toISOString();
  if (v instanceof Date) return v.toISOString();
  try {
    return new Date(v).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/**
 * Ensure every invoice has a display-ready invoiceNumber.
 * If the server didn't provide one, we create a stable fallback:
 *   INV-<year>-<last 6 of id>
 */
const ensureInvoiceNumber = (inv: any): string => {
  const provided = inv?.invoiceNumber;
  if (typeof provided === "string" && provided.trim() !== "") return provided;

  const iso = toIso(inv?.createdAt);
  const year = new Date(iso).getFullYear();
  const idTail =
    (inv?.id || inv?._id || inv?.docId || "")
      .toString()
      .slice(-6)
      .toUpperCase() || Math.random().toString(36).slice(-6).toUpperCase();

  return `INV-${year}-${idTail}`;
};

const normalizeInvoice = (inv: any): Invoice => ({
  ...inv,
  invoiceNumber: ensureInvoiceNumber(inv),
  createdAt: toIso(inv?.createdAt),
  updatedAt: toIso(inv?.updatedAt ?? inv?.createdAt),
  dueDate: toIso(inv?.dueDate),
});

/** ---- API ---- */
export type CreateInvoiceRequest = Omit<
  Invoice,
  "id" | "createdAt" | "updatedAt" | "invoiceNumber"
> & { purchaseIds?: string[] };

export type UpdateInvoiceRequest = Partial<
  Omit<Invoice, "id" | "createdAt" | "updatedAt" | "invoiceNumber">
> & { purchaseIds?: string[] };

export const invoiceApi = createApi({
  reducerPath: "invoiceApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ["Invoice"],
  endpoints: (builder) => ({
    /** LIST: GET /invoices (supports filters) */
    listInvoices: builder.query<
      Paginated<Invoice>,
      | void
      | {
          search?: string;
          status?: string;
          clientId?: string;
          dateFrom?: string; // ISO
          dateTo?: string; // ISO
          order?: "asc" | "desc";
          limit?: number;
          pageToken?: string;
        }
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.search) params.set("search", args.search);
        if (args?.status) params.set("status", args.status);
        if (args?.clientId) params.set("clientId", args.clientId);
        if (args?.dateFrom) params.set("dateFrom", args.dateFrom);
        if (args?.dateTo) params.set("dateTo", args.dateTo);
        params.set("order", args?.order ?? "desc");
        if (args?.limit) params.set("limit", String(args.limit));
        if (args?.pageToken) params.set("pageToken", args.pageToken);
        return { url: `/invoices?${params.toString()}` };
      },
      transformResponse: (res: any): Paginated<Invoice> => {
        const itemsRaw = Array.isArray(res?.items) ? res.items : res ?? [];
        return {
          items: itemsRaw.map(normalizeInvoice),
          nextPageToken: res?.nextPageToken ?? null,
          total: typeof res?.total === "number" ? res.total : undefined,
        };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Invoice" as const,
                id,
              })),
              { type: "Invoice" as const, id: "LIST" },
            ]
          : [{ type: "Invoice" as const, id: "LIST" }],
    }),

    /** GET ONE: /invoices/:id */
    getInvoice: builder.query<Invoice, string>({
      query: (id) => ({ url: `/invoices/${id}` }),
      transformResponse: (inv: any) => normalizeInvoice(inv),
      providesTags: (_res, _err, id) => [{ type: "Invoice", id }],
    }),

    /** CREATE: POST /invoices */
    createInvoice: builder.mutation<Invoice, CreateInvoiceRequest>({
      query: (body) => ({ url: "/invoices", method: "POST", body }),
      transformResponse: (inv: any) => normalizeInvoice(inv?.invoice ?? inv),
      invalidatesTags: [{ type: "Invoice", id: "LIST" }],
    }),

    /** UPDATE: PATCH /invoices/:id (matches backend) */
    updateInvoice: builder.mutation<
      Invoice,
      { id: string; data: UpdateInvoiceRequest }
    >({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (inv: any) => normalizeInvoice(inv?.invoice ?? inv),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
      ],
    }),

    /** STATUS: PATCH /invoices/:id/status {status} */
    updateInvoiceStatus: builder.mutation<
      Invoice,
      { id: string; status: Invoice["status"] }
    >({
      query: ({ id, status }) => ({
        url: `/invoices/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (inv: any) => normalizeInvoice(inv?.invoice ?? inv),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
      ],
    }),

    /** DELETE: /invoices/:id */
    deleteInvoice: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({ url: `/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Invoice", id: "LIST" }],
    }),

    /** STATS: GET /invoices/stats?... */
    getInvoiceStats: builder.query<
      {
        totalInvoices: number;
        totalRevenue: number;
        paidInvoices: number;
        paidRevenue: number;
        pendingInvoices: number;
        pendingRevenue: number;
        overdueInvoices: number;
        overdueRevenue: number;
      },
      | void
      | {
          status?: string;
          clientId?: string;
          dateFrom?: string;
          dateTo?: string;
        }
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.status) params.set("status", args.status);
        if (args?.clientId) params.set("clientId", args.clientId);
        if (args?.dateFrom) params.set("dateFrom", args.dateFrom);
        if (args?.dateTo) params.set("dateTo", args.dateTo);
        return { url: `/invoices/stats?${params.toString()}` };
      },
    }),
  }),
});

export const {
  useListInvoicesQuery,           // list
  useGetInvoiceQuery,            // single
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useGetInvoiceStatsQuery,
} = invoiceApi;
