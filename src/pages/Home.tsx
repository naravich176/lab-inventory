import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Category,
  Item,
  Staff,
  ItemFilters,
} from '../types/database';
import './Home.css'; // แยก CSS สำหรับ Home page
// ============================================================
// Helper: ตรวจสอบว่ารันใน Electron หรือไม่
// ============================================================
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

// ============================================================
// Mock Data — ใช้ตอน dev ใน browser (ไม่มี Electron)
// ============================================================
const mockCategories: Category[] = [
  { id: 1, name: 'สารเคมี', icon: 'science', color: '#EF4444', sort_order: 1, created_at: '', updated_at: '' },
  { id: 2, name: 'วัสดุวิทยาศาสตร์', icon: 'experiment', color: '#3B82F6', sort_order: 2, created_at: '', updated_at: '' },
  { id: 3, name: 'วัสดุสำนักงาน', icon: 'edit_note', color: '#F59E0B', sort_order: 3, created_at: '', updated_at: '' },
  { id: 4, name: 'วัสดุงานบ้าน', icon: 'cleaning_services', color: '#10B981', sort_order: 4, created_at: '', updated_at: '' },
];

const mockItems: Item[] = [
  { id: 1, name: 'Ethanol 95% (AR Grade)', cat_code: 'CH-00125', unit: 'ขวด', min_stock: 5, current_stock: 25, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-24', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 2, name: 'Hydrochloric Acid 37%', cat_code: 'CH-00128', unit: 'ขวด', min_stock: 5, current_stock: 3, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-22', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 3, name: 'Sodium Chloride', cat_code: 'CH-00210', unit: 'กก.', min_stock: 5, current_stock: 12, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-18', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 4, name: 'Sulfuric Acid 98%', cat_code: 'CH-00135', unit: 'ขวด', min_stock: 5, current_stock: 0, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-15', category_name: 'สารเคมี', category_color: '#EF4444' },
];

const mockStaff: Staff[] = [
  { id: 1, name: 'สมชาย ใจดี', position: 'นักวิทยาศาสตร์', department: 'แล็บเคมี', phone: '', status: 'active', created_at: '', updated_at: '' },
  { id: 2, name: 'สมหญิง รักงาน', position: 'ผู้ช่วยนักวิทยาศาสตร์', department: 'แล็บเคมี', phone: '', status: 'active', created_at: '', updated_at: '' },
];

// ============================================================
// Icon mapping — ชื่อ icon จาก DB → Material Symbols
// ============================================================
const iconMap: Record<string, string> = {
  flask: 'science',
  science: 'science',
  microscope: 'experiment',
  experiment: 'experiment',
  briefcase: 'edit_note',
  edit_note: 'edit_note',
  home: 'cleaning_services',
  cleaning_services: 'cleaning_services',
};

// ============================================================
// Status helpers
// ============================================================
function getItemStatus(item: Item): string {
  if (item.current_stock <= 0) return 'หมด';
  if (item.current_stock <= item.min_stock) return 'ใกล้หมด';
  return 'ปกติ';
}

const statusStyle: Record<string, string> = {
  ปกติ: 'bg-green-100 text-green-800',
  ใกล้หมด: 'bg-amber-100 text-amber-800',
  หมด: 'bg-red-100 text-red-800',
};

const quantityColor: Record<string, string> = {
  ปกติ: 'text-slate-900',
  ใกล้หมด: 'text-amber-600',
  หมด: 'text-red-600',
};

// ============================================================
// Format date helper
// ============================================================
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ============================================================
// Withdraw Modal Component
// ============================================================
interface WithdrawModalProps {
  item: Item;
  staffList: Staff[];
  onClose: () => void;
  onSubmit: (data: { item_id: number; staff_id: number; quantity: number; note: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ item, staffList, onClose, onSubmit, loading, error }) => {
  const [staffId, setStaffId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const status = getItemStatus(item);
  const maxQty = item.current_stock;

  const selectedStaff = staffList.find(s => s.id === staffId);

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStaffDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = async () => {
    if (!staffId || quantity < 1 || quantity > maxQty) return;
    await onSubmit({ item_id: item.id, staff_id: staffId, quantity, note });
  };

  const canSubmit = staffId > 0 && quantity >= 1 && quantity <= maxQty && !loading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">outbox</span>
              <h3 className="text-lg font-bold">เบิกใช้วัสดุ</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Item Info */}
        <div className="px-6 pt-5 pb-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">CAT: {item.cat_code}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[status]}`}>
                {status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-slate-500">คงเหลือ:</span>
              <span className={`font-bold text-lg ${quantityColor[status]}`}>{item.current_stock}</span>
              <span className="text-slate-400">{item.unit}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Staff Select */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              เจ้าหน้าที่ผู้เบิก <span className="text-red-500">*</span>
            </label>
            <div
              className="w-full border border-slate-200 rounded-lg cursor-pointer hover:border-[#14b84b] transition-colors"
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
            >
              {selectedStaff ? (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{selectedStaff.name}</span>
                    {selectedStaff.department && (
                      <span className="text-xs text-slate-400 ml-2">({selectedStaff.department})</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                </div>
              ) : (
                <div className="px-4 py-2.5 flex items-center justify-between text-slate-400">
                  <span className="text-sm">เลือกเจ้าหน้าที่...</span>
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                </div>
              )}
            </div>

            {/* Dropdown */}
            {showStaffDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    type="text"
                    placeholder="ค้นหาเจ้าหน้าที่..."
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white text-slate-400 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#14b84b]"
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-36">
                  {filteredStaff.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400 text-center">ไม่พบเจ้าหน้าที่</p>
                  ) : (
                    filteredStaff.map(s => (
                      <button
                        key={s.id}
                        className={`w-full px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm ${staffId === s.id ? 'bg-green-50 text-[#14b84b]' : 'text-slate-700'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStaffId(s.id);
                          setShowStaffDropdown(false);
                          setStaffSearch('');
                        }}
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.department && <span className="text-xs text-slate-400 ml-2">({s.department})</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              จำนวนที่เบิก <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <span className="material-symbols-outlined text-slate-400 text-lg">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(maxQty, Math.max(1, val)));
                }}
                className="w-24 text-center bg-white border border-slate-200 rounded-lg py-2 text-slate-400 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
              />
              <button
                className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <span className="material-symbols-outlined text-slate-400 text-lg">add</span>
              </button>
              <span className="text-sm text-slate-500 ml-2">{item.unit} (สูงสุด {maxQty})</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ระบุหมายเหตุ (ไม่บังคับ)..."
              rows={2}
              className="w-full border bg-white border-slate-200 rounded-lg px-4 py-2.5 text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2.5 bg-[#14b84b] text-white text-sm font-bold rounded-lg hover:bg-[#0ea53e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check</span>
                ยืนยันเบิกใช้
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Success Toast Component
// ============================================================
interface ToastProps {
  message: string;
  onClose: () => void;
}

const SuccessToast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[200] animate-in">
      <div className="bg-white border border-green-200 shadow-lg rounded-xl px-5 py-4 flex items-center gap-3 max-w-sm">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#14b84b] text-lg">check_circle</span>
        </div>
        <p className="text-sm text-slate-800 font-medium">{message}</p>
        <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 flex-shrink-0">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Home Page Component
// ============================================================
interface HomeProps {
  onNavigateItems?: () => void;
}

const Home: React.FC<HomeProps> = ({ onNavigateItems }) => {
  // State — data
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // State — UI
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  // State — Modal
  const [withdrawItem, setWithdrawItem] = useState<Item | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // State — Toast
  const [toast, setToast] = useState<string | null>(null);

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset page on new search
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ============================================================
  // Fetch Categories
  // ============================================================
  const fetchCategories = useCallback(async () => {
    if (!isElectron()) {
      setCategories(mockCategories);
      setActiveCategory(mockCategories[0]?.id || 0);
      return;
    }
    try {
      const res = await window.electronAPI.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
        if (res.data.length > 0 && activeCategory === 0) {
          setActiveCategory(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
      setCategories(mockCategories);
      setActiveCategory(mockCategories[0]?.id || 0);
    }
  }, []);

  // ============================================================
  // Fetch Items
  // ============================================================
  const fetchItems = useCallback(async () => {
    if (activeCategory === 0) return;

    if (!isElectron()) {
      // Mock: filter by category and search
      let filtered = mockItems.filter(i => i.category_id === activeCategory);
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(i =>
          i.name.toLowerCase().includes(q) || i.cat_code.toLowerCase().includes(q)
        );
      }
      setItems(filtered);
      setTotal(filtered.length);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const filters: ItemFilters = {
        categoryId: activeCategory,
        search: debouncedSearch || undefined,
        status: 'active',
        page,
        limit,
      };
      const res = await window.electronAPI.getItems(filters);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch, page]);

  // ============================================================
  // Fetch Staff (สำหรับ Modal)
  // ============================================================
  const fetchStaff = useCallback(async () => {
    if (!isElectron()) {
      setStaffList(mockStaff);
      return;
    }
    try {
      const res = await window.electronAPI.getStaff({ status: 'active' });
      if (res.success && res.data) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  }, []);

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    fetchCategories();
    fetchStaff();
  }, [fetchCategories, fetchStaff]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  // ============================================================
  // Handle Withdraw
  // ============================================================
  const handleWithdraw = async (data: { item_id: number; staff_id: number; quantity: number; note: string }) => {
    setWithdrawLoading(true);
    setWithdrawError(null);

    if (!isElectron()) {
      // Mock withdraw
      await new Promise(r => setTimeout(r, 500));
      setItems(prev =>
        prev.map(i =>
          i.id === data.item_id
            ? { ...i, current_stock: Math.max(0, i.current_stock - data.quantity) }
            : i
        )
      );
      setWithdrawItem(null);
      setWithdrawLoading(false);
      setToast(`เบิกใช้สำเร็จ — ${data.quantity} ${items.find(i => i.id === data.item_id)?.unit || 'ชิ้น'}`);
      return;
    }

    try {
      const res = await window.electronAPI.withdrawItem({
        item_id: data.item_id,
        staff_id: data.staff_id,
        quantity: data.quantity,
        note: data.note,
      });
      if (res.success && res.data) {
        setWithdrawItem(null);
        setToast(`เบิกใช้สำเร็จ — ${data.quantity} ${res.data.item.unit}`);
        fetchItems(); // refresh table
      } else {
        setWithdrawError(res.error || 'เบิกใช้ไม่สำเร็จ');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // ============================================================
  // Render helpers
  // ============================================================
  const today = new Date().toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const activeCat = categories.find(c => c.id === activeCategory);

  // Pagination
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Pagination range (show max 5 pages around current)
  const getPageRange = (): number[] => {
    if (totalPages <= 5) return pageNumbers;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>

      {/* Toast */}
      {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}

      {/* Withdraw Modal */}
      {withdrawItem && (
        <WithdrawModal
          item={withdrawItem}
          staffList={staffList}
          onClose={() => {
            setWithdrawItem(null);
            setWithdrawError(null);
          }}
          onSubmit={handleWithdraw}
          loading={withdrawLoading}
          error={withdrawError}
        />
      )}

      {/* Navbar ถูกย้ายไป App.tsx แล้ว */}

      {/* Main */}
      <main className="flex-1 px-10 py-8 max-w-7xl mx-auto w-full">
        <div className="flex gap-8">

          {/* Sidebar */}
          <aside className="w-64 flex flex-col gap-2 flex-shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-3">หมวดหมู่พัสดุ</h2>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                  activeCategory === cat.id
                    ? 'bg-[#14b84b] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {iconMap[cat.icon] || cat.icon || 'category'}
                </span>
                {cat.name}
              </button>
            ))}
          </aside>

          {/* Table */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">

            {/* Table Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  รายการวัสดุคงคลัง: {activeCat?.name || '—'}
                </h3>
                <p className="text-sm text-slate-500">แสดงผลล่าสุดวันที่ {today}</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="ค้นหารายการวัสดุ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all w-64"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm font-medium hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">filter_list</span> กรอง
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b border-slate-200">ลำดับที่</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">รายการวัสดุ</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">สถานะ</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200 text-center">คงเหลือ</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">วันที่แก้ไข</th>
                    <th className="px-6 py-4 border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={`skeleton-${i}`}>
                        <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-7 w-20 bg-slate-200 rounded animate-pulse ml-auto"></div></td>
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inventory_2</span>
                        <p className="text-slate-400 text-sm">
                          {debouncedSearch ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการวัสดุในหมวดนี้'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const status = getItemStatus(item);
                      const rowNum = (page - 1) * limit + index + 1;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {String(rowNum).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{item.name}</span>
                              <span className="text-xs text-slate-400">CAT: {item.cat_code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[status]}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${quantityColor[status]}`}>{item.current_stock}</span>
                            <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatDate(item.updated_at)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  if (item.current_stock <= 0) return;
                                  setWithdrawError(null);
                                  setWithdrawItem(item);
                                }}
                                disabled={item.current_stock <= 0}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-[#14b84b] hover:bg-[#14b84b] hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50 disabled:hover:text-[#14b84b]"
                              >
                                <span className="material-symbols-outlined text-sm">outbox</span> เบิกใช้
                              </button>
                              <button className="p-1 text-slate-400 hover:text-[#14b84b] transition-colors">
                                <span className="material-symbols-outlined">more_vert</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {total > 0
                  ? `แสดง ${(page - 1) * limit + 1} ถึง ${Math.min(page * limit, total)} จากทั้งหมด ${total} รายการ`
                  : 'ไม่มีรายการ'
                }
              </span>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <button
                    className="p-2 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {getPageRange().map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        p === page
                          ? 'bg-[#14b84b] text-white'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="p-2 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

    </div>
  );
};

export default Home;