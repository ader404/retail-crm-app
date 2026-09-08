'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/runtime-config';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Generic fetch function
async function fetchData<T>(endpoint: string): Promise<T> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}${endpoint}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
}

// Pagination response type
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Customers
export function useCustomers(page = 1, limit = 10, search = '') {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['customers', page, limit, search],
    queryFn: () =>
      fetchData<PaginatedResponse<any>>(`/customers?page=${page}&limit=${limit}&search=${search}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchData(`/customers/${id}`),
    enabled: !!id,
  });
}

// Suppliers
export function useSuppliers(page = 1, limit = 10, search = '') {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['suppliers', page, limit, search],
    queryFn: () =>
      fetchData<PaginatedResponse<any>>(`/suppliers?page=${page}&limit=${limit}&search=${search}`),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => fetchData(`/suppliers/${id}`),
    enabled: !!id,
  });
}

// Products
export function useProducts(page = 1, limit = 20, search = '') {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['products', page, limit, search],
    queryFn: () =>
      fetchData<PaginatedResponse<any>>(`/products?page=${page}&limit=${limit}&search=${search}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchData(`/products/${id}`),
    enabled: !!id,
  });
}

// Sales
export function useSales(page = 1, limit = 20, search = '') {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['sales', page, limit, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      return fetchData<PaginatedResponse<any>>(`/sales?${params}`);
    },
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => fetchData(`/sales/${id}`),
    enabled: !!id,
  });
}

// Dashboard
export function useDashboardStats() {
  return useQuery<any>({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchData<any>('/dashboard/stats'),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useDashboardChartData(period: string) {
  return useQuery<any[]>({
    queryKey: ['dashboard-chart', period],
    queryFn: () => fetchData<any[]>(`/dashboard/chart-data?period=${period}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useRecentSales(limit = 10, page = 1) {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['recent-sales', limit, page],
    queryFn: () => fetchData<PaginatedResponse<any>>(`/dashboard/recent-sales?limit=${limit}&page=${page}`),
    staleTime: 30 * 1000,
  });
}

export function useLowStock(limit = 10) {
  return useQuery<any[]>({
    queryKey: ['low-stock', limit],
    queryFn: () => fetchData<any[]>(`/dashboard/low-stock?limit=${limit}`),
    staleTime: 60 * 1000,
  });
}

// Mutations
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${getApiUrl()}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${getApiUrl()}/customers/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${getApiUrl()}/customers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
