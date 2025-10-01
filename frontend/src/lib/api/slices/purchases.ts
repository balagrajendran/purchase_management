import { api } from '../api';
import type { Purchase, Paginated } from '../../../types';

export const purchasesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listPurchases: builder.query<Paginated<Purchase>, { limit?: number; pageToken?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.pageToken) params.set('pageToken', args.pageToken);
        return { url: `/purchases?${params.toString()}` };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: 'Purchase' as const, id })),
              { type: 'Purchase' as const, id: 'LIST' },
            ]
          : [{ type: 'Purchase' as const, id: 'LIST' }],
    }),
    getPurchase: builder.query<Purchase, string>({
      query: (id) => ({ url: `/purchases/${id}` }),
      providesTags: (_res, _err, id) => [{ type: 'Purchase', id }]
    }),
    createPurchase: builder.mutation<Purchase, Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (body) => ({ url: '/purchases', method: 'POST', body }),
      invalidatesTags: [{ type: 'Purchase', id: 'LIST' }],
    }),
    updatePurchase: builder.mutation<Purchase, { id: string; patch: Partial<Purchase> }>({
      query: ({ id, patch }) => ({ url: `/purchases/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Purchase', id }],
    }),
    deletePurchase: builder.mutation<void, string>({
      query: (id) => ({ url: `/purchases/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Purchase', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useDeletePurchaseMutation,
} = purchasesApi;
