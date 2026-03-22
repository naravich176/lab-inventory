// src/api/client.ts
// API Client สำหรับเชื่อมต่อ Express.js Server แทน window.electronAPI
// Interface เดียวกันทุกประการ — frontend แทบไม่ต้องแก้

// ============================================================
// Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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
  status: string;
  expiry_date: string | null;
  expiry_alert_days: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
}

export interface PaginatedItems {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Transaction {
  id: number;
  item_id: number;
  user_id: number;
  quantity: number;
  type: 'withdraw' | 'add';
  note: string;
  date: string;
  created_at: string;
  item_name?: string;
  item_unit?: string;
  user_name?: string;
  user_department?: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WithdrawResult {
  transaction: Transaction;
  item: Item;
}

export interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  totalStaff: number;
  todayTransactions: number;
}

export interface MonthlySummary {
  item_name: string;
  unit: string;
  category_name: string;
  total_withdrawn: number;
  total_added: number;
  transaction_count: number;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'staff' | 'procurement';
  position: string;
  department: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

export interface ItemFilters {
  categoryId?: number;
  search?: string;
  status?: string;
  stockStatus?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface UserFilters {
  search?: string;
  status?: string;
}

export interface TransactionFilters {
  item_id?: number;
  user_id?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ProcurementRequest {
  id: number;
  item_id: number | null;
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
  requested_by: number;
  requested_by_name: string;
  status: 'requested' | 'ordering' | 'shipping' | 'delivered' | 'received';
  note: string;
  received_by: number | null;
  received_by_name: string | null;
  received_by_user: number | null;
  received_by_user_name: string | null;
  received_by_user_department: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedProcurement {
  requests: ProcurementRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Notification {
  id: number;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired';
  title: string;
  message: string;
  item_id: number | null;
  item_name?: string;
  cat_code?: string;
  is_read: number;
  created_at: string;
}

export interface ProcurementFilters {
  status?: string;
  requested_by?: number;
  page?: number;
  limit?: number;
}

// ============================================================
// API Client Class
// ============================================================

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    // ลำดับการหา server URL:
    // 1. parameter ที่ส่งเข้ามา
    // 2. localStorage (user เคยตั้งค่าไว้)
    // 3. environment variable (Vite)
    // 4. window.location.origin (production — server serve ทั้ง API + frontend)
    this.baseUrl = baseUrl
      || localStorage.getItem('api_base_url')
      || (import.meta as any).env?.VITE_API_URL
      || window.location.origin;

    // ลองดึง token จาก localStorage (ถ้ามี)
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  // ============================================================
  // Config
  // ============================================================

  setBaseUrl(url: string) {
    this.baseUrl = url;
    localStorage.setItem('api_base_url', url);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ============================================================
  // Token Management
  // ============================================================

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  // ============================================================
  // Core Fetch Wrapper
  // ============================================================

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data: ApiResponse<T> = await response.json();

      // ถ้า 401 → token หมดอายุ → clear แล้ว redirect ไปหน้า login
      if (response.status === 401) {
        this.clearToken();
        // Dispatch custom event เพื่อให้ App.tsx จัดการ redirect
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error(data.error || 'กรุณาเข้าสู่ระบบใหม่');
      }

      if (!data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      return data.data as T;
    } catch (err: any) {
      // Network error (server ไม่ตอบ)
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('ไม่สามารถเชื่อมต่อ Server ได้ — ตรวจสอบว่า Server กำลังทำงานอยู่');
      }
      throw err;
    }
  }

  // Helper สำหรับ build query string
  private buildQuery(params: Record<string, any>): string {
    const filtered = Object.entries(params).filter(
      ([_, v]) => v !== undefined && v !== null && v !== ''
    );
    if (filtered.length === 0) return '';
    return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  }

  // ============================================================
  // Auth
  // ============================================================

  async login(username: string, password: string): Promise<LoginResult> {
    const result = await this.request<LoginResult>(
      'POST',
      '/api/auth/login',
      { username, password },
      false // login ไม่ต้อง token
    );
    // เก็บ token อัตโนมัติ
    this.setToken(result.token);
    return result;
  }

  async getMe(): Promise<User> {
    return this.request<User>('GET', '/api/auth/me');
  }

  async changePassword(current_password: string, new_password: string): Promise<User> {
    return this.request<User>('PUT', '/api/auth/change-password', {
      current_password,
      new_password,
    });
  }

  logout() {
    this.clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // ============================================================
  // Categories
  // ============================================================

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('GET', '/api/categories');
  }

  async getCategoryById(id: number): Promise<Category> {
    return this.request<Category>('GET', `/api/categories/${id}`);
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.request<Category>('POST', '/api/categories', data);
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    return this.request<Category>('PUT', `/api/categories/${id}`, data);
  }

  async deleteCategory(id: number): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>('DELETE', `/api/categories/${id}`);
  }

  // ============================================================
  // Items
  // ============================================================

  async getItems(filters?: ItemFilters): Promise<PaginatedItems> {
    const query = this.buildQuery(filters || {});
    return this.request<PaginatedItems>('GET', `/api/items${query}`);
  }

  async getItemById(id: number): Promise<Item> {
    return this.request<Item>('GET', `/api/items/${id}`);
  }

  async createItem(data: Partial<Item>): Promise<Item> {
    return this.request<Item>('POST', '/api/items', data);
  }

  async updateItem(id: number, data: Partial<Item>): Promise<Item> {
    return this.request<Item>('PUT', `/api/items/${id}`, data);
  }

  async deleteItem(id: number): Promise<{ deleted?: boolean; softDeleted?: boolean }> {
    return this.request<{ deleted?: boolean; softDeleted?: boolean }>(
      'DELETE',
      `/api/items/${id}`
    );
  }

  // ============================================================
  // Transactions
  // ============================================================

  async withdrawItem(data: {
    item_id: number;
    user_id: number;
    quantity: number;
    note?: string;
  }): Promise<WithdrawResult> {
    return this.request<WithdrawResult>('POST', '/api/transactions/withdraw', data);
  }

  async addStock(data: {
    item_id: number;
    quantity: number;
    note?: string;
  }): Promise<Item> {
    return this.request<Item>('POST', '/api/transactions/add-stock', data);
  }

  async getTransactions(filters?: TransactionFilters): Promise<PaginatedTransactions> {
    const query = this.buildQuery(filters || {});
    return this.request<PaginatedTransactions>('GET', `/api/transactions${query}`);
  }

  // ============================================================
  // Reports / Dashboard
  // ============================================================

  async getLowStockItems(): Promise<Item[]> {
    return this.request<Item[]>('GET', '/api/reports/low-stock');
  }

  async getExpiringItems(): Promise<Item[]> {
    return this.request<Item[]>('GET', '/api/reports/expiring-items');
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary[]> {
    return this.request<MonthlySummary[]>(
      'GET',
      `/api/reports/monthly?year=${year}&month=${month}`
    );
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('GET', '/api/reports/dashboard');
  }

  // ============================================================
  // Users (admin)
  // ============================================================

  async getUsers(filters?: UserFilters): Promise<User[]> {
    const query = this.buildQuery(filters || {});
    return this.request<User[]>('GET', `/api/users${query}`);
  }

  async createUser(data: { username: string; password: string; display_name: string; role: string; position?: string; department?: string; phone?: string }): Promise<User> {
    return this.request<User>('POST', '/api/users', data);
  }

  async updateUser(id: number, data: { display_name?: string; role?: string; status?: string; position?: string; department?: string; phone?: string }): Promise<User> {
    return this.request<User>('PUT', `/api/users/${id}`, data);
  }

  async resetUserPassword(id: number, new_password: string): Promise<User> {
    return this.request<User>('PUT', `/api/users/${id}/reset-password`, { new_password });
  }

  // ============================================================
  // Procurement
  // ============================================================

  async getProcurementRequests(filters?: ProcurementFilters): Promise<PaginatedProcurement> {
    const query = this.buildQuery(filters || {});
    return this.request<PaginatedProcurement>('GET', `/api/procurement${query}`);
  }

  async getProcurementRequestById(id: number): Promise<ProcurementRequest> {
    return this.request<ProcurementRequest>('GET', `/api/procurement/${id}`);
  }

  async createProcurementRequest(data: {
    item_id?: number | null;
    item_name: string;
    quantity: number;
    unit?: string;
    reason?: string;
  }): Promise<ProcurementRequest> {
    return this.request<ProcurementRequest>('POST', '/api/procurement', data);
  }

  async updateProcurementStatus(id: number, data: { status: string; note?: string }): Promise<ProcurementRequest> {
    return this.request<ProcurementRequest>('PUT', `/api/procurement/${id}/status`, data);
  }

  async confirmProcurementReceived(id: number, receiverUserId?: number, newItem?: {
    name: string;
    cat_code: string;
    unit: string;
    min_stock?: number;
    category_id: number;
    description?: string;
    expiry_date?: string | null;
    expiry_alert_days?: number;
  }): Promise<ProcurementRequest> {
    return this.request<ProcurementRequest>('PUT', `/api/procurement/${id}/receive`, {
      new_item: newItem || undefined,
      receiver_user_id: receiverUserId || undefined,
    });
  }

  async deleteProcurementRequest(id: number): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>('DELETE', `/api/procurement/${id}`);
  }

  // ============================================================
  // Notifications
  // ============================================================

  async getNotifications(filters?: { is_read?: number; type?: string }): Promise<Notification[]> {
    const query = this.buildQuery(filters || {});
    return this.request<Notification[]>('GET', `/api/notifications${query}`);
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('GET', '/api/notifications/unread-count');
  }

  async generateNotifications(): Promise<{ generated: number }> {
    return this.request<{ generated: number }>('POST', '/api/notifications/generate');
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    return this.request<Notification>('PUT', `/api/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('PUT', '/api/notifications/read-all');
  }
}

// ============================================================
// Singleton Instance
// ============================================================

// Export instance เดียว ใช้ทั้ง app
export const api = new ApiClient();

// Export class ด้วย เผื่อต้องการสร้าง instance ใหม่
export default ApiClient;