// src/hooks/useDatabase.ts
// Custom hooks สำหรับเรียกใช้ electronAPI จาก React components

import { useState, useEffect, useCallback } from 'react';
import type {
  Category,
  Item,
  Staff,
  ItemFilters,
  StaffFilters,
  PaginatedResponse,
  DashboardStats,
  WithdrawInput,
  WithdrawResult,
} from '../types/database';

// ============================================================
// Helper: ตรวจสอบว่ารันใน Electron หรือไม่
// ============================================================
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

// ============================================================
// Hook: useCategories
// ============================================================
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!isElectron()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await window.electronAPI.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setError(res.error || 'Failed to fetch categories');
      }
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
    if (!isElectron()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await window.electronAPI.getItems(activeFilters);
      if (res.success && res.data) {
        const data = res.data as PaginatedResponse<Item>;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        setError(res.error || 'Failed to fetch items');
      }
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
    if (!isElectron()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await window.electronAPI.getStaff(filters);
      if (res.success && res.data) {
        setStaff(res.data);
      } else {
        setError(res.error || 'Failed to fetch staff');
      }
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

  const withdraw = async (data: WithdrawInput): Promise<WithdrawResult | null> => {
    if (!isElectron()) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.withdrawItem(data);
      if (res.success && res.data) {
        return res.data;
      } else {
        setError(res.error || 'เบิกใช้ไม่สำเร็จ');
        return null;
      }
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
    if (!isElectron()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statsRes, lowStockRes] = await Promise.all([
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getLowStockItems(),
      ]);
      if (statsRes.success) setStats(statsRes.data || null);
      if (lowStockRes.success) setLowStockItems(lowStockRes.data || []);
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
