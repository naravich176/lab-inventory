import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Category, Item, ItemFilters } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import ItemForm from './ItemForm';

function getItemStatus(item: Item): string {
  if (item.current_stock <= 0) return 'หมด';
  if (item.current_stock <= item.min_stock) return 'ใกล้หมด';
  return 'ปกติ';
}

function getExpiryStatus(item: Item): 'expired' | 'soon' | null {
  if (!item.expiry_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiry_date + 'T00:00:00');
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= (item.expiry_alert_days || 30)) return 'soon';
  return null;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================================
// Confirm Delete Modal
// ============================================================
interface DeleteModalProps {
  item: Item;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ item, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบ</h3>
        <p className="text-sm text-slate-500 mb-1">
          คุณต้องการลบรายการ
        </p>
        <p className="font-bold text-slate-900 mb-1">"{item.name}"</p>
        <p className="text-xs text-slate-400">CAT: {item.cat_code}</p>
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
          ยกเลิก
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              กำลังลบ...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">delete</span>
              ลบรายการ
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

// ============================================================
// Toast
// ============================================================
const Toast: React.FC<{ message: string; type?: 'success' | 'error'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isSuccess = type === 'success';
  return (
    <div className="fixed top-6 right-6 z-[200] animate-in">
      <div className={`bg-white border ${isSuccess ? 'border-green-200' : 'border-red-200'} shadow-lg rounded-xl px-5 py-4 flex items-center gap-3 max-w-sm`}>
        <div className={`w-8 h-8 ${isSuccess ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className={`material-symbols-outlined ${isSuccess ? 'text-[#14b84b]' : 'text-red-500'} text-lg`}>
            {isSuccess ? 'check_circle' : 'error'}
          </span>
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
// Main: ItemManagement
// ============================================================
interface ItemManagementProps {
  onNavigateHome?: () => void;
}

const ItemManagement: React.FC<ItemManagementProps> = ({ onNavigateHome }) => {
  const { isAdmin, isStaff } = useAuth();
  const canEdit = isStaff || isAdmin;
  // View mode: 'list' | 'add' | 'edit'
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filterCategory, setFilterCategory] = useState<number>(0); // 0 = all
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // UI
  const [loading, setLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dropdown (more actions)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ============================================================
  // Fetch categories
  // ============================================================
  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      const allOption: Category = { id: 0, name: 'ทั้งหมด', icon: 'category', color: '#64748b', sort_order: 0, created_at: '', updated_at: '' };
      setCategories([allOption, ...data]);
    } catch (err) { console.error(err); }
  }, []);

  // ============================================================
  // Fetch items
  // ============================================================
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ItemFilters = {
        categoryId: filterCategory > 0 ? filterCategory : undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      };
      const data = await api.getItems(filters);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterCategory, debouncedSearch, page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [filterCategory]);

  // ============================================================
  // Delete
  // ============================================================
  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);

    try {
      await api.deleteItem(deleteItem.id);
      setToast({ message: `ลบรายการ "${deleteItem.name}" สำเร็จ`, type: 'success' });
      fetchItems();
    } catch (err: any) {
      setToast({ message: err.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setDeleteItem(null);
      setDeleteLoading(false);
    }
  };

  // ============================================================
  // Navigate to form
  // ============================================================
  const goAdd = () => { setEditingItem(null); setView('add'); };
  const goEdit = (item: Item) => { setEditingItem(item); setView('edit'); setOpenMenuId(null); };
  const goList = () => { setView('list'); setEditingItem(null); };

  const handleFormSave = () => {
    setToast({
      message: view === 'edit' ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มรายการสำเร็จ',
      type: 'success',
    });
    goList();
    fetchItems();
  };

  // Pagination range
  const getPageRange = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ============================================================
  // Render: Form view
  // ============================================================
  if (view === 'add' || view === 'edit') {
    return (
      <ItemForm
        editItem={editingItem}
        onSave={handleFormSave}
        onCancel={goList}
      />
    );
  }

  // ============================================================
  // Render: List view
  // ============================================================
  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete Modal */}
      {deleteItem && (
        <DeleteModal
          item={deleteItem}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleteLoading}
        />
      )}

      <div className="p-8 max-w-7xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <button onClick={onNavigateHome} className="hover:text-[#14b84b] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">home</span>
            <span>หน้าหลัก</span>
          </button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-[#14b84b] font-medium">จัดการวัสดุอุปกรณ์</span>
        </div>

        {/* Title + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการวัสดุอุปกรณ์</h2>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม แก้ไข และจัดการรายการวัสดุทั้งหมดในระบบ</p>
          </div>
          {canEdit && (
            <button
              onClick={goAdd}
              className="px-5 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              เพิ่มรายการใหม่
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">รายการทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">สถานะปกติ</p>
            <p className="text-2xl font-bold text-green-600">{items.filter(i => getItemStatus(i) === 'ปกติ').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">ใกล้หมด</p>
            <p className="text-2xl font-bold text-amber-600">{items.filter(i => getItemStatus(i) === 'ใกล้หมด').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">หมดแล้ว</p>
            <p className="text-2xl font-bold text-red-600">{items.filter(i => getItemStatus(i) === 'หมด').length}</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center gap-3">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterCategory === cat.id
                      ? 'bg-[#14b84b] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสวัสดุ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-16">ลำดับ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">รายการวัสดุ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">หมวดหมู่</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">สถานะ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 text-center">คงเหลือ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">อัปเดต</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 1 ? '60%' : '40%' }}></div></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inventory_2</span>
                      <p className="text-slate-400 text-sm mb-4">
                        {debouncedSearch ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการวัสดุ'}
                      </p>
                      {!debouncedSearch && (
                        <button onClick={goAdd} className="text-[#14b84b] text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
                          <span className="material-symbols-outlined text-lg">add</span> เพิ่มรายการแรก
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const status = getItemStatus(item);
                    const rowNum = (page - 1) * limit + index + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-400">
                          {String(rowNum).padStart(2, '0')}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                            <span className="text-xs text-slate-400">CAT: {item.cat_code}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {item.category_name && (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {item.category_name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${statusStyle[status]}`}>
                              {status}
                            </span>
                            {getExpiryStatus(item) === 'expired' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit bg-red-100 text-red-700">หมดอายุ</span>
                            )}
                            {getExpiryStatus(item) === 'soon' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit bg-amber-100 text-amber-700">ใกล้หมดอายุ</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-bold ${quantityColor[status]}`}>{item.current_stock}</span>
                          <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(item.updated_at)}</td>
                        <td className="px-5 py-3.5">
                          {canEdit && (
                          <div className="relative flex items-center justify-end gap-1" ref={openMenuId === item.id ? menuRef : undefined}>
                            <button
                              onClick={() => goEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="แก้ไข"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuId === item.id && (
                              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px] py-1">
                                <button
                                  onClick={() => { goEdit(item); }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span> แก้ไข
                                </button>
                                <button
                                  onClick={() => { setDeleteItem(item); setOpenMenuId(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span> ลบรายการ
                                </button>
                              </div>
                            )}
                          </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
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
    </div>
  );
};

export default ItemManagement;