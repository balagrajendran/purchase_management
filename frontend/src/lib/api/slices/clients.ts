import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Client } from '../../../types';
import { API_BASE } from './base';

export interface Paginated<T> {
  items: T[];
  nextPageToken?: string | null;
}

// const API_BASE_URL =
//   (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api';

export type CreateClientRequest = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateClientRequest = Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>;

export const clientApi = createApi({
  reducerPath: 'clientApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Client'],
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
      providesTags: (_res, _err, id) => [{ type: 'Client', id }],
    }),

    createClient: builder.mutation<Client, CreateClientRequest>({
      query: (body) => ({ url: '/clients', method: 'POST', body }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),

    updateClient: builder.mutation<Client, { id: string; patch: UpdateClientRequest }>({
      query: ({ id, patch }) => ({ url: `/clients/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Client', id },
        { type: 'Client', id: 'LIST' },
      ],
    }),

    deleteClient: builder.mutation<void, string>({
      query: (id) => ({ url: `/clients/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),
  }),
});

export const {
  useListClientsQuery,
  useGetClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientApi;
