import { api } from '../api';
import type { Invoice, Paginated } from '../types';

export const invoicesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listInvoices: builder.query<Paginated<Invoice>, { limit?: number; pageToken?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.pageToken) params.set('pageToken', args.pageToken);
        return { url: `/invoices?${params.toString()}` };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: 'Invoice' as const, id })),
              { type: 'Invoice' as const, id: 'LIST' },
            ]
          : [{ type: 'Invoice' as const, id: 'LIST' }],
    }),
    getInvoice: builder.query<Invoice, string>({
      query: (id) => ({ url: `/invoices/${id}` }),
      providesTags: (_res, _err, id) => [{ type: 'Invoice', id }]
    }),
    createInvoice: builder.mutation<Invoice, Omit<Invoice, 'id' | 'createdAt' | 'paidAt'>>({
      query: (body) => ({ url: '/invoices', method: 'POST', body }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),
    updateInvoice: builder.mutation<Invoice, { id: string; patch: Partial<Invoice> }>({
      query: ({ id, patch }) => ({ url: `/invoices/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Invoice', id }],
    }),
    deleteInvoice: builder.mutation<void, string>({
      query: (id) => ({ url: `/invoices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} = invoicesApi;
