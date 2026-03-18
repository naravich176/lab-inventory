// src/types/database.ts
// TypeScript types สำหรับระบบจัดการคลังแล็บ

// ============================================================
// Database Entities
// ============================================================

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  cat_code: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  category_id: number;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_color?: string;
}

export interface Staff {
  id: number;
  name: string;
  position: string;
  department: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  item_id: number;
  staff_id: number;
  quantity: number;
  type: 'withdraw' | 'add';
  note: string;
  date: string;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_unit?: string;
  staff_name?: string;
  staff_department?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Alias for transactions paginated response
export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Filter / Query Types
// ============================================================

export interface ItemFilters {
  categoryId?: number;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface StaffFilters {
  search?: string;
  status?: string;
}

export interface TransactionFilters {
  item_id?: number;
  staff_id?: number;
  type?: 'withdraw' | 'add';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// Form Input Types
// ============================================================

export interface WithdrawInput {
  item_id: number;
  staff_id: number;
  quantity: number;
  note?: string;
}

export interface AddStockInput {
  item_id: number;
  quantity: number;
  note?: string;
}

export interface ItemInput {
  name: string;
  cat_code: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  category_id: number;
  description?: string;
}

export interface StaffInput {
  name: string;
  position?: string;
  department?: string;
  phone?: string;
}

export interface CategoryInput {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  totalStaff: number;
  todayTransactions: number;
}

export interface MonthlySummaryRow {
  item_name: string;
  unit: string;
  category_name: string;
  total_withdrawn: number;
  total_added: number;
  transaction_count: number;
}

// ============================================================
// Withdraw Result
// ============================================================

export interface WithdrawResult {
  transaction: Transaction;
  item: Item;
}

// ============================================================
// Electron API (exposed via preload.js)
// ============================================================

export interface ElectronAPI {
  // Categories
  getCategories: () => Promise<ApiResponse<Category[]>>;
  getCategoryById: (id: number) => Promise<ApiResponse<Category>>;
  createCategory: (data: CategoryInput) => Promise<ApiResponse<Category>>;
  updateCategory: (id: number, data: CategoryInput) => Promise<ApiResponse<any>>;
  deleteCategory: (id: number) => Promise<ApiResponse<any>>;

  // Items
  getItems: (filters?: ItemFilters) => Promise<ApiResponse<PaginatedResponse<Item>>>;
  getItemById: (id: number) => Promise<ApiResponse<Item>>;
  createItem: (data: ItemInput) => Promise<ApiResponse<Item>>;
  updateItem: (id: number, data: ItemInput) => Promise<ApiResponse<Item>>;
  deleteItem: (id: number) => Promise<ApiResponse<any>>;

  // Staff
  getStaff: (filters?: StaffFilters) => Promise<ApiResponse<Staff[]>>;
  getStaffById: (id: number) => Promise<ApiResponse<Staff>>;
  createStaff: (data: StaffInput) => Promise<ApiResponse<Staff>>;
  updateStaff: (id: number, data: StaffInput) => Promise<ApiResponse<Staff>>;
  deleteStaff: (id: number) => Promise<ApiResponse<any>>;

  // Transactions
  withdrawItem: (data: WithdrawInput) => Promise<ApiResponse<WithdrawResult>>;
  addStock: (data: AddStockInput) => Promise<ApiResponse<Item>>;
  getTransactions: (filters?: TransactionFilters) => Promise<ApiResponse<PaginatedTransactions>>;

  // Dashboard / Reports
  getLowStockItems: () => Promise<ApiResponse<Item[]>>;
  getMonthlySummary: (year: number, month: number) => Promise<ApiResponse<MonthlySummaryRow[]>>;
  getDashboardStats: () => Promise<ApiResponse<DashboardStats>>;
}

// ============================================================
// Global Window augmentation
// ============================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
