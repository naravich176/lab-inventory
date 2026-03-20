// src/hooks/useDatabase.ts
// Custom hooks สำหรับเรียกใช้ API Client จาก React components

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Category, Item, Staff, DashboardStats, ItemFilters, StaffFilters } from '../api/client';

// Re-export types for convenience
export type { Category, Item, Staff, DashboardStats, ItemFilters, StaffFilters };

// ============================================================
// Hook: useCategories
// ============================================================
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

// ============================================================
// Hook: useItems
// ============================================================
export function useItems(initialFilters?: ItemFilters) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ItemFilters>(initialFilters || { page: 1, limit: 20 });

  const fetchItems = useCallback(async (newFilters?: ItemFilters) => {
    const activeFilters = newFilters || filters;
    setLoading(true);
    try {
      const data = await api.getItems(activeFilters);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const updateFilters = (newFilters: Partial<ItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    items,
    total,
    totalPages,
    loading,
    error,
    filters,
    updateFilters,
    refetch: () => fetchItems(filters),
  };
}

// ============================================================
// Hook: useStaff
// ============================================================
export function useStaff(initialFilters?: StaffFilters) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async (filters?: StaffFilters) => {
    setLoading(true);
    try {
      const data = await api.getStaff(filters);
      setStaff(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff(initialFilters);
  }, []);

  return { staff, loading, error, refetch: fetchStaff };
}

// ============================================================
// Hook: useWithdraw
// ============================================================
export function useWithdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async (data: {
    item_id: number;
    staff_id: number;
    quantity: number;
    note?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.withdrawItem(data);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error, clearError: () => setError(null) };
}

// ============================================================
// Hook: useDashboard
// ============================================================
export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, lowStockData] = await Promise.all([
        api.getDashboardStats(),
        api.getLowStockItems(),
      ]);
      setStats(statsData);
      setLowStockItems(lowStockData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { stats, lowStockItems, loading, refetch: fetchDashboard };
}
