import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Category } from '../api/client';
import { useAuth } from '../hooks/useAuth';

// ============================================================
// Available Icons (Material Symbols ที่เหมาะกับห้องแล็บ)
// ============================================================
const availableIcons = [
  // วิทยาศาสตร์ / แล็บ
  { name: 'science', label: 'ขวดทดลอง' },
  { name: 'biotech', label: 'ไบโอเทค' },
  { name: 'experiment', label: 'การทดลอง' },
  { name: 'labs', label: 'แล็บ' },
  { name: 'vaccines', label: 'วัคซีน' },
  { name: 'medication', label: 'ยา' },
  { name: 'clinical_notes', label: 'บันทึกทางการแพทย์' },
  { name: 'microbiology', label: 'จุลชีววิทยา' },
  { name: 'genetics', label: 'พันธุกรรม' },
  // อุปกรณ์
  { name: 'thermometer', label: 'เทอร์โมมิเตอร์' },
  { name: 'scale', label: 'ตาชั่ง' },
  { name: 'filter_alt', label: 'กรอง' },
  { name: 'water_drop', label: 'หยดน้ำ' },
  { name: 'local_fire_department', label: 'ไฟ' },
  { name: 'bolt', label: 'สายฟ้า' },
  // สำนักงาน
  { name: 'edit_note', label: 'บันทึก' },
  { name: 'description', label: 'เอกสาร' },
  { name: 'folder', label: 'โฟลเดอร์' },
  { name: 'print', label: 'พิมพ์' },
  { name: 'inventory_2', label: 'สินค้าคงคลัง' },
  { name: 'package_2', label: 'พัสดุ' },
  { name: 'deployed_code', label: 'กล่อง' },
  // งานบ้าน / ทำความสะอาด
  { name: 'cleaning_services', label: 'ทำความสะอาด' },
  { name: 'mop', label: 'ไม้ถูพื้น' },
  { name: 'soap', label: 'สบู่' },
  { name: 'wash', label: 'ล้าง' },
  { name: 'recycling', label: 'รีไซเคิล' },
  { name: 'delete_sweep', label: 'กวาด' },
  // ทั่วไป
  { name: 'category', label: 'หมวดหมู่' },
  { name: 'widgets', label: 'วิดเจ็ต' },
  { name: 'build', label: 'เครื่องมือ' },
  { name: 'construction', label: 'ก่อสร้าง' },
  { name: 'handyman', label: 'ช่าง' },
  { name: 'settings', label: 'ตั้งค่า' },
  { name: 'local_shipping', label: 'จัดส่ง' },
  { name: 'shopping_cart', label: 'ตะกร้า' },
  { name: 'medical_services', label: 'การแพทย์' },
  { name: 'health_and_safety', label: 'ความปลอดภัย' },
  { name: 'shield', label: 'โล่' },
  { name: 'eco', label: 'ธรรมชาติ' },
  { name: 'spa', label: 'ใบไม้' },
  { name: 'star', label: 'ดาว' },
  { name: 'favorite', label: 'หัวใจ' },
];

// ============================================================
// Available Colors
// ============================================================
const availableColors = [
  { value: '#EF4444', label: 'แดง' },
  { value: '#F97316', label: 'ส้ม' },
  { value: '#F59E0B', label: 'เหลือง' },
  { value: '#84CC16', label: 'เขียวอ่อน' },
  { value: '#22C55E', label: 'เขียว' },
  { value: '#14B8A6', label: 'เขียวมิ้นต์' },
  { value: '#06B6D4', label: 'ฟ้า' },
  { value: '#3B82F6', label: 'น้ำเงิน' },
  { value: '#6366F1', label: 'ม่วงน้ำเงิน' },
  { value: '#8B5CF6', label: 'ม่วง' },
  { value: '#A855F7', label: 'ม่วงอ่อน' },
  { value: '#EC4899', label: 'ชมพู' },
  { value: '#F43F5E', label: 'โรส' },
  { value: '#64748B', label: 'เทา' },
  { value: '#78716C', label: 'น้ำตาล' },
  { value: '#14b84b', label: 'เขียวหลัก' },
];

// ============================================================
// Icon Picker Component
// ============================================================
interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  color: string;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, color }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = availableIcons.filter(i =>
    i.name.includes(search.toLowerCase()) || i.label.includes(search)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:border-[#14b84b] transition-colors bg-white"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + '20' }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ color }}>
            {value || 'category'}
          </span>
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-slate-900">{value || 'เลือกไอคอน'}</p>
          <p className="text-xs text-slate-400">
            {availableIcons.find(i => i.name === value)?.label || 'คลิกเพื่อเลือก'}
          </p>
        </div>
        <span className="material-symbols-outlined text-slate-400">expand_more</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="ค้นหาไอคอน..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                autoFocus
              />
            </div>
          </div>

          {/* Icons Grid */}
          <div className="p-3 max-h-[200px] overflow-y-auto">
            <div className="grid grid-cols-6 gap-2">
              {filtered.map(icon => (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => { onChange(icon.name); setOpen(false); setSearch(''); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    value === icon.name
                      ? 'bg-green-50 ring-2 ring-[#14b84b]'
                      : 'hover:bg-slate-50'
                  }`}
                  title={icon.label}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ color: value === icon.name ? color : '#64748b' }}
                  >
                    {icon.name}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">{icon.label}</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">ไม่พบไอคอน</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Category Form Modal
// ============================================================
interface CategoryFormModalProps {
  editCategory?: Category | null;
  nextSortOrder: number;
  onSave: () => void;
  onClose: () => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ editCategory, nextSortOrder, onSave, onClose }) => {
  const isEdit = !!editCategory;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('category');
  const [color, setColor] = useState('#3B82F6');
  const [sortOrder, setSortOrder] = useState(nextSortOrder);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setIcon(editCategory.icon || 'category');
      setColor(editCategory.color || '#3B82F6');
      setSortOrder(editCategory.sort_order);
    }
  }, [editCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError('กรุณาระบุชื่อหมวดหมู่'); return; }
    setNameError('');
    setLoading(true);
    setError(null);

    const data = {
      name: name.trim(),
      icon,
      color,
      sort_order: sortOrder,
    };

    try {
      if (isEdit && editCategory) {
        await api.updateCategory(editCategory.id, data);
      } else {
        await api.createCategory(data);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">
                {isEdit ? 'edit' : 'create_new_folder'}
              </span>
              <h3 className="text-lg font-bold">{isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="px-6 pt-5 pb-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color + '20' }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color }}>
                {icon || 'category'}
              </span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg">{name || 'ชื่อหมวดหมู่'}</p>
              <p className="text-xs text-slate-400">ตัวอย่างหมวดหมู่</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อหมวดหมู่ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              placeholder="เช่น สารเคมี, วัสดุวิทยาศาสตร์"
              className={`w-full px-4 py-2.5 rounded-lg border ${nameError ? 'border-red-300' : 'border-slate-200'} focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] outline-none transition-all text-sm`}
              autoFocus
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ไอคอน</label>
            <IconPicker value={icon} onChange={setIcon} color={color} />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">สี</label>
            <div className="grid grid-cols-8 gap-2">
              {availableColors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-9 h-9 rounded-lg transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ลำดับการแสดง</label>
            <input
              type="number"
              min={1}
              value={sortOrder}
              onChange={e => setSortOrder(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] outline-none transition-all text-sm text-center"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#14b84b] text-white text-sm font-bold rounded-lg hover:bg-[#0ea53e] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Delete Modal
// ============================================================
interface DeleteModalProps {
  category: Category;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ category, onConfirm, onCancel, loading, error }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-500 text-3xl">folder_delete</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบหมวดหมู่</h3>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="material-symbols-outlined" style={{ color: category.color }}>{category.icon || 'category'}</span>
          <span className="font-bold text-slate-900">"{category.name}"</span>
        </div>
        <p className="text-xs text-red-500 mt-2">หมวดหมู่ที่มีวัสดุอยู่จะไม่สามารถลบได้</p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
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
          {loading ? 'กำลังลบ...' : (<><span className="material-symbols-outlined text-sm">delete</span> ลบหมวดหมู่</>)}
        </button>
      </div>
    </div>
  </div>
);

// ============================================================
// Toast
// ============================================================
const Toast: React.FC<{ message: string; type?: 'success' | 'error'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const ok = type === 'success';
  return (
    <div className="fixed top-6 right-6 z-[200] animate-in">
      <div className={`bg-white border ${ok ? 'border-green-200' : 'border-red-200'} shadow-lg rounded-xl px-5 py-4 flex items-center gap-3 max-w-sm`}>
        <div className={`w-8 h-8 ${ok ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${ok ? 'text-[#14b84b]' : 'text-red-500'} text-lg`}>{ok ? 'check_circle' : 'error'}</span>
        </div>
        <p className="text-sm text-slate-800 font-medium">{message}</p>
        <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-lg">close</span></button>
      </div>
    </div>
  );
};

// ============================================================
// Main: CategoryManagement
// ============================================================
interface CategoryManagementProps {
  onNavigateHome?: () => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onNavigateHome }) => {
  const { isAdmin, isStaff } = useAuth();
  const canEdit = isStaff || isAdmin;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ============================================================
  // Fetch
  // ============================================================
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ============================================================
  // Delete
  // ============================================================
  const handleDelete = async () => {
    if (!deletingCat) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await api.deleteCategory(deletingCat.id);
      setToast({ message: `ลบหมวดหมู่ "${deletingCat.name}" สำเร็จ`, type: 'success' });
      setDeletingCat(null);
      fetchCategories();
    } catch (err: any) {
      setDeleteError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ============================================================
  // Form handlers
  // ============================================================
  const openAdd = () => { setEditingCat(null); setShowForm(true); };
  const openEdit = (cat: Category) => { setEditingCat(cat); setShowForm(true); };

  const handleFormSave = () => {
    setToast({
      message: editingCat ? 'แก้ไขหมวดหมู่สำเร็จ' : 'เพิ่มหมวดหมู่สำเร็จ',
      type: 'success',
    });
    setShowForm(false);
    setEditingCat(null);
    fetchCategories();
  };

  const nextSortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1;

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showForm && (
        <CategoryFormModal
          editCategory={editingCat}
          nextSortOrder={nextSortOrder}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditingCat(null); }}
        />
      )}
      {deletingCat && (
        <DeleteModal
          category={deletingCat}
          onConfirm={handleDelete}
          onCancel={() => { setDeletingCat(null); setDeleteError(null); }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      <div className="p-8 max-w-5xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <button onClick={onNavigateHome} className="hover:text-[#14b84b] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">home</span>
            <span>หน้าหลัก</span>
          </button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-[#14b84b] font-medium">จัดการหมวดหมู่</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการหมวดหมู่พัสดุ</h2>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม แก้ไข และจัดการหมวดหมู่วัสดุอุปกรณ์</p>
          </div>
          {canEdit && (
            <button
              onClick={openAdd}
              className="px-5 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg">create_new_folder</span>
              เพิ่มหมวดหมู่
            </button>
          )}
        </div>

        {/* Category Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">folder_off</span>
            <p className="text-slate-400 text-sm mb-4">ยังไม่มีหมวดหมู่</p>
            <button onClick={openAdd} className="text-[#14b84b] text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
              <span className="material-symbols-outlined text-lg">add</span> เพิ่มหมวดหมู่แรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + '18' }}
                  >
                    <span className="material-symbols-outlined text-3xl" style={{ color: cat.color }}>
                      {cat.icon || 'category'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-lg">{cat.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="text-xs text-slate-400">{cat.color}</span>
                      </div>
                      <span className="text-xs text-slate-400">ลำดับ: {cat.sort_order}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-2 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => { setDeletingCat(cat); setDeleteError(null); }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">info</span>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">หมายเหตุ</p>
            <p className="text-blue-600 text-xs">หมวดหมู่ที่มีวัสดุอยู่จะไม่สามารถลบได้ ต้องย้ายหรือลบวัสดุทั้งหมดในหมวดก่อน ไอคอนที่เลือกจะแสดงในหน้าหลักและหน้าจัดการวัสดุ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;