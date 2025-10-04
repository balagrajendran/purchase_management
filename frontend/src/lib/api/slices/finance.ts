import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE } from './base';

/* -------- Types -------- */
export type FinType = "invested" | "expense" | "tds";
export type FinStatus = "completed" | "pending" | "failed";

export type FinanceRecord = {
  id: string;
  type: FinType;
  category: string;
  amount: number;
  description: string;
  date: string;        // ISO for transport
  paymentMethod: string;
  status: FinStatus;
  reference?: string;
  taxYear?: string;
  createdAt?: string;  // ISO
  updatedAt?: string;  // ISO
};

export type KPI = {
  totalInvested: number;
  totalExpenses: number;
  totalTDS: number;
  profit: number;
};

export interface Paginated<T> {
  items: T[];
  nextPageToken?: string | null;
  total?: number;
}

/* -------- Helpers -------- */
// const API_BASE_URL =
//   (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8080/api";

/* -------- API -------- */
export type ListFinanceArgs = {
  search?: string;
  type?: FinType | "all";
  category?: string | "all";
  status?: FinStatus | "all";
  paymentMethod?: string | "all";
  order?: "asc" | "desc";
  limit?: number;
  pageToken?: string;
};

export type CreateFinanceRequest = Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">;
export type UpdateFinanceRequest = Partial<Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">>;

export const financeApi = createApi({
  reducerPath: "financeApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ["Finance"],
  endpoints: (builder) => ({
    listFinance: builder.query<Paginated<FinanceRecord>, ListFinanceArgs | void>({
      query: (args) => {
        const p = new URLSearchParams();
        if (args?.search) p.set("search", args.search);
        if (args?.type && args.type !== "all") p.set("type", args.type);
        if (args?.category && args.category !== "all") p.set("category", args.category);
        if (args?.status && args.status !== "all") p.set("status", args.status);
        if (args?.paymentMethod && args.paymentMethod !== "all")
          p.set("paymentMethod", args.paymentMethod);
        p.set("order", args?.order ?? "desc");
        if (args?.limit) p.set("limit", String(args.limit));
        if (args?.pageToken) p.set("pageToken", args.pageToken);
        return { url: `/finance?${p.toString()}` };
      },
      transformResponse: (res: any): Paginated<FinanceRecord> => {
        const itemsRaw = Array.isArray(res?.items) ? res.items : res ?? [];
        return {
          items: itemsRaw.map((x: any) => ({
            ...x,
            date: toIso(x?.date ?? x?.createdAt),
            createdAt: toIso(x?.createdAt),
            updatedAt: toIso(x?.updatedAt ?? x?.createdAt),
          })),
          nextPageToken: res?.nextPageToken ?? null,
          total: typeof res?.total === "number" ? res.total : undefined,
        };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: "Finance" as const, id })),
              { type: "Finance" as const, id: "LIST" },
            ]
          : [{ type: "Finance" as const, id: "LIST" }],
    }),

    getFinanceStats: builder.query<KPI, Omit<ListFinanceArgs, "order" | "limit" | "pageToken"> | void>({
      query: (args) => {
        const p = new URLSearchParams();
        if (args?.search) p.set("search", args.search);
        if (args?.type && args.type !== "all") p.set("type", args.type);
        if (args?.category && args.category !== "all") p.set("category", args.category);
        if (args?.status && args.status !== "all") p.set("status", args.status);
        if (args?.paymentMethod && args.paymentMethod !== "all")
          p.set("paymentMethod", args.paymentMethod);
        return { url: `/finance/stats?${p.toString()}` };
      },
    }),

    createFinance: builder.mutation<FinanceRecord, CreateFinanceRequest>({
      query: (body) => ({ url: "/finance", method: "POST", body }),
      transformResponse: (x: any) => ({
        ...x,
        date: toIso(x?.date ?? x?.createdAt),
        createdAt: toIso(x?.createdAt),
        updatedAt: toIso(x?.updatedAt ?? x?.createdAt),
      }),
      invalidatesTags: [{ type: "Finance", id: "LIST" }],
    }),

    updateFinance: builder.mutation<FinanceRecord, { id: string; data: UpdateFinanceRequest }>({
      query: ({ id, data }) => ({ url: `/finance/${id}`, method: "PATCH", body: data }),
      transformResponse: (x: any) => ({
        ...x,
        date: toIso(x?.date ?? x?.createdAt),
        createdAt: toIso(x?.createdAt),
        updatedAt: toIso(x?.updatedAt ?? x?.createdAt),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Finance", id },
        { type: "Finance", id: "LIST" },
      ],
    }),

    deleteFinance: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({ url: `/finance/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Finance", id: "LIST" }],
    }),
  }),
});

const toIso = (v: any): string | undefined => {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  const ts = v?.toDate?.();
  if (ts?.toISOString) return ts.toISOString();
  if (v instanceof Date) return v.toISOString();
  try {
    return new Date(v).toISOString();
  } catch {
    return undefined;
  }
};

export const {
  useListFinanceQuery,
  useGetFinanceStatsQuery,
  useCreateFinanceMutation,
  useUpdateFinanceMutation,
  useDeleteFinanceMutation,
} = financeApi;
