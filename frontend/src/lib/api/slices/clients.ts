import { api } from '../api';
import type { Client, Paginated } from '../types';

export const clientsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listClients: builder.query<Paginated<Client>, { limit?: number; pageToken?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.pageToken) params.set('pageToken', args.pageToken);
        return { url: `/clients?${params.toString()}` };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: 'Client' as const, id })),
              { type: 'Client' as const, id: 'LIST' },
            ]
          : [{ type: 'Client' as const, id: 'LIST' }],
    }),
    getClient: builder.query<Client, string>({
      query: (id) => ({ url: `/clients/${id}` }),
      providesTags: (_res, _err, id) => [{ type: 'Client', id }]
    }),
    createClient: builder.mutation<Client, Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (body) => ({ url: '/clients', method: 'POST', body }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),
    updateClient: builder.mutation<Client, { id: string; patch: Partial<Client> }>({
      query: ({ id, patch }) => ({ url: `/clients/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Client', id }],
    }),
    deleteClient: builder.mutation<void, string>({
      query: (id) => ({ url: `/clients/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListClientsQuery,
  useGetClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientsApi;
