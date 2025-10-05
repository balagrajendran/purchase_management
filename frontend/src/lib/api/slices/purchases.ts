import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Purchase } from "../../../types";
import { API_BASE } from './base';

export interface Paginated<T> {
  items: T[];
  nextPageToken?: string | null;
  total?: number;
}

// const API_BASE_URL =
//   (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8080/api";

// ---- helpers ----
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

const normalizePurchase = (p: any): Purchase => ({
  ...p,
  createdAt: toIso(p?.createdAt),
  updatedAt: toIso(p?.updatedAt ?? p?.createdAt),
});

// ---- API ----
export type CreatePurchaseRequest = Omit<
  Purchase,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdatePurchaseRequest = Partial<
  Omit<Purchase, "id" | "createdAt" | "updatedAt">
>;

export const purchaseApi = createApi({
  reducerPath: "purchaseApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ["Purchase"],
  endpoints: (builder) => ({
    // GET /purchases
    listPurchases: builder.query<
      Paginated<Purchase>,
      { limit?: number; pageToken?: string; order?: "asc" | "desc" } | void
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.limit) params.set("limit", String(args.limit));
        if (args?.pageToken) params.set("pageToken", args.pageToken);
        if (args?.order) params.set("order", args.order);
        return { url: `/purchases?${params.toString()}` };
      },
      transformResponse: (res: any): Paginated<Purchase> => {
        const itemsRaw = Array.isArray(res?.items) ? res.items : res ?? [];
        return {
          items: itemsRaw.map(normalizePurchase),
          nextPageToken: res?.nextPageToken ?? null,
          total: typeof res?.total === "number" ? res.total : undefined,
        };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Purchase" as const,
                id,
              })),
              { type: "Purchase" as const, id: "LIST" },
            ]
          : [{ type: "Purchase" as const, id: "LIST" }],
    }),

    // GET /purchases/:id
    getPurchase: builder.query<Purchase, string>({
      query: (id) => ({ url: `/purchases/${id}` }),
      transformResponse: (p: any) => normalizePurchase(p),
      providesTags: (_res, _err, id) => [{ type: "Purchase", id }],
    }),

    // POST /purchases
    createPurchase: builder.mutation<Purchase, CreatePurchaseRequest>({
      query: (body) => ({ url: "/purchases", method: "POST", body }),
      transformResponse: (p: any) => normalizePurchase(p),
      invalidatesTags: [{ type: "Purchase", id: "LIST" }],
    }),

    // PATCH /purchases/:id   (match your backend router.patch)
    updatePurchase: builder.mutation<
      Purchase,
      { id: string; patch: UpdatePurchaseRequest }
    >({
      query: ({ id, patch }) => ({
        url: `/purchases/${id}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (p: any) => normalizePurchase(p),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Purchase", id },
        { type: "Purchase", id: "LIST" },
      ],
    }),

    // DELETE /purchases/:id
    deletePurchase: builder.mutation<void, string>({
      query: (id) => ({ url: `/purchases/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Purchase", id: "LIST" }],
    }),

    /**
     * Composite helper used by the UI:
     * Fetch purchases for a client, optionally merging multiple statuses.
     * (Your backend supports `clientId` + single `status` filter. We call it
     * multiple times and merge client-side if an array is provided.)
     */
    getPurchasesByClient: builder.query<
      Purchase[],
      { clientId: string; statuses?: string[] }
    >({
      // use queryFn to perform multiple requests
      async queryFn(arg, _api, _extra, fetchWithBQ) {
        const { clientId, statuses } = arg;
        if (!clientId) return { data: [] as Purchase[] };

        const runOnce = async (status?: string) => {
          const params: Record<string, string> = {
            clientId,
            limit: "500",
            order: "desc",
          };
          if (status) params.status = status;
          const res = await fetchWithBQ({ url: "/purchases", params });
          if (res.error) return { error: res.error as any };
          const raw = (res.data as any)?.items ?? (res.data as any) ?? [];
          return { data: raw.map(normalizePurchase) as Purchase[] };
        };

        // single query
        if (!statuses || statuses.length === 0) {
          const one = await runOnce();
          // @ts-expect-error - union of success/error
          return one.error ? { error: one.error } : { data: one.data };
        }

        // merge multiple statuses
        const collected: Record<string, Purchase> = {};
        for (const s of statuses) {
          const r = await runOnce(s);
          // @ts-expect-error
          if (r.error) return { error: r.error };
          (r.data as Purchase[]).forEach((p) => (collected[p.id] = p));
        }
        return { data: Object.values(collected) };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: "Purchase" as const, id: p.id })),
              { type: "Purchase" as const, id: "LIST" },
            ]
          : [{ type: "Purchase", id: "LIST" }],
    }),

    /**
     * Helper used by the UI to resolve purchases for a set of IDs.
     * There’s no batch endpoint in the backend, so we fan out requests
     * to /purchases/:id and merge the results.
     */
    getPurchasesByIds: builder.query<
      Purchase[],
      { ids: string[] } | string[]
    >({
      async queryFn(arg, _api, _extra, fetchWithBQ) {
        const ids = Array.isArray(arg) ? arg : arg.ids;
        if (!ids?.length) return { data: [] as Purchase[] };

        const promises = ids.map((id) =>
          fetchWithBQ(`/purchases/${encodeURIComponent(id)}`)
        );
        const results = await Promise.all(promises);
        const firstErr = results.find((r) => r.error)?.error as any | undefined;
        if (firstErr) return { error: firstErr };

        const items = results
          .map((r) => normalizePurchase(r.data))
          .filter(Boolean) as Purchase[];

        return { data: items };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: "Purchase" as const, id: p.id })),
              { type: "Purchase" as const, id: "LIST" },
            ]
          : [{ type: "Purchase", id: "LIST" }],
    }),
  }),
});

export const {
  useListPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useDeletePurchaseMutation,
  useGetPurchasesByClientQuery,
  useLazyGetPurchasesByIdsQuery,
} = purchaseApi;
