'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// KEYS para cache organizado
// ============================================================================
export const adminKeys = {
  all: ['admin'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  orders: () => [...adminKeys.all, 'orders'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

// ============================================================================
// HOOK: useAdminProducts - Produtos com cache persistente
// ============================================================================
export function useAdminProducts(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: [...adminKeys.products(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.category) searchParams.set('category', params.category);

      const response = await fetch(`/api/admin/products?${searchParams}`);
      if (!response.ok) throw new Error('Falha ao carregar produtos');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

// ============================================================================
// HOOK: useAdminOrders - Pedidos com cache curto (dados recentes)
// ============================================================================
export function useAdminOrders(status?: string) {
  return useQuery({
    queryKey: [...adminKeys.orders(), status],
    queryFn: async () => {
      const url = status ? `/api/admin/orders?status=${status}` : '/api/admin/orders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao carregar pedidos');
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // ✅ 2 minutos (reduzir chamadas)
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchInterval: false, // ✅ Desabilitar auto-refresh (usuário usa botão refresh se necessário)
    refetchOnWindowFocus: false, // ✅ Não recarregar ao voltar (melhora UX)
  });
}

// ============================================================================
// HOOK: useAdminUsers - Usuários com cache persistente
// ============================================================================
export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Falha ao carregar usuários');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

// ============================================================================
// HOOK: useAdminStats - Estatísticas do dashboard
// ============================================================================
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Falha ao carregar estatísticas');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
    refetchOnWindowFocus: true, // Revalidar quando voltar à janela
  });
}

// ============================================================================
// MUTATION: useDeleteProduct - Deletar produto e invalidar cache
// ============================================================================
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao deletar produto');
      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache de produtos para re-buscar
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

// ============================================================================
// MUTATION: useUpdateOrderStatus - Atualizar status do pedido
// ============================================================================
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Falha ao atualizar pedido');
      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache de pedidos e stats
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

// ============================================================================
// PREFETCH: Pré-carregar dados admin antes de navegar
// ============================================================================
export function usePrefetchAdminData() {
  const queryClient = useQueryClient();

  return {
    prefetchProducts: () => {
      queryClient.prefetchQuery({
        queryKey: adminKeys.products(),
        queryFn: async () => {
          const response = await fetch('/api/admin/products');
          return response.json();
        },
      });
    },
    prefetchOrders: () => {
      queryClient.prefetchQuery({
        queryKey: adminKeys.orders(),
        queryFn: async () => {
          const response = await fetch('/api/admin/orders');
          return response.json();
        },
      });
    },
    prefetchUsers: () => {
      queryClient.prefetchQuery({
        queryKey: adminKeys.users(),
        queryFn: async () => {
          const response = await fetch('/api/admin/users');
          return response.json();
        },
      });
    },
    prefetchStats: () => {
      queryClient.prefetchQuery({
        queryKey: adminKeys.stats(),
        queryFn: async () => {
          const response = await fetch('/api/admin/stats');
          return response.json();
        },
      });
    },
  };
}
