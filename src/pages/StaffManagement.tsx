import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Staff } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================================
// Staff Form Modal
// ============================================================
interface StaffFormModalProps {
  editStaff?: Staff | null;
  onSave: () => void;
  onClose: () => void;
}

const StaffFormModal: React.FC<StaffFormModalProps> = ({ editStaff, onSave, onClose }) => {
  const isEdit = !!editStaff;

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const commonPositions = ['นักวิทยาศาสตร์', 'ผู้ช่วยนักวิทยาศาสตร์', 'เจ้าหน้าที่ห้องปฏิบัติการ', 'นักวิจัย', 'อาจารย์', 'นักศึกษา'];
  const commonDepartments = ['แล็บเคมี', 'แล็บชีววิทยา', 'แล็บฟิสิกส์', 'แล็บจุลชีววิทยา', 'ธุรการ', 'สำนักงาน'];

  useEffect(() => {
    if (editStaff) {
      setName(editStaff.name);
      setPosition(editStaff.position || '');
      setDepartment(editStaff.department || '');
      setPhone(editStaff.phone || '');
    }
  }, [editStaff]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'กรุณาระบุชื่อ-นามสกุล';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    const data = {
      name: name.trim(),
      position: position.trim(),
      department: department.trim(),
      phone: phone.trim(),
    };

    try {
      if (isEdit && editStaff) {
        await api.updateStaff(editStaff.id, data);
      } else {
        await api.createStaff(data);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200 focus:ring-green-200 focus:border-[#14b84b]'} bg-white focus:ring-2 outline-none transition-all text-sm`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">person_add</span>
              <h3 className="text-lg font-bold">{isEdit ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่ใหม่'}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
              placeholder="ระบุชื่อ-นามสกุล"
              className={inputClass(!!fieldErrors.name) + " text-slate-900"}
              autoFocus
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Position + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ตำแหน่ง</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="ระบุตำแหน่ง"
                className={inputClass() + " text-slate-900"}
                list="position-options"
              />
              <datalist id="position-options">
                {commonPositions.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">แผนก/หน่วยงาน</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="ระบุแผนก"
                className={inputClass() + " text-slate-900"}
                list="department-options"
              />
              <datalist id="department-options">
                {commonDepartments.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="เช่น 081-234-5678"
              className={inputClass() + " text-slate-900"}
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
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#14b84b] text-white text-sm font-bold rounded-lg hover:bg-[#0ea53e] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มเจ้าหน้าที่'}
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
// Delete Confirm Modal
// ============================================================
interface DeleteModalProps {
  staff: Staff;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ staff, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-500 text-3xl">person_remove</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบ</h3>
        <p className="text-sm text-slate-500 mb-1">คุณต้องการลบเจ้าหน้าที่</p>
        <p className="font-bold text-slate-900">"{staff.name}"</p>
        {staff.department && <p className="text-xs text-slate-400 mt-1">{staff.position} — {staff.department}</p>}
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
              ลบเจ้าหน้าที่
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
// Main: StaffManagement
// ============================================================
interface StaffManagementProps {
  onNavigateHome?: () => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ onNavigateHome }) => {
  const { isAdmin } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dropdown
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ============================================================
  // Fetch staff
  // ============================================================
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getStaff({
        search: debouncedSearch || undefined,
        status: 'active',
      });
      setStaffList(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [debouncedSearch]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ============================================================
  // Delete
  // ============================================================
  const handleDelete = async () => {
    if (!deletingStaff) return;
    setDeleteLoading(true);

    try {
      await api.deleteStaff(deletingStaff.id);
      setToast({ message: `ลบเจ้าหน้าที่ "${deletingStaff.name}" สำเร็จ`, type: 'success' });
      fetchStaff();
    } catch (err: any) {
      setToast({ message: err.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setDeletingStaff(null);
      setDeleteLoading(false);
    }
  };

  // ============================================================
  // Form handlers
  // ============================================================
  const openAdd = () => { setEditingStaff(null); setShowForm(true); };
  const openEdit = (staff: Staff) => { setEditingStaff(staff); setShowForm(true); setOpenMenuId(null); };

  const handleFormSave = () => {
    setToast({
      message: editingStaff ? 'แก้ไขข้อมูลเจ้าหน้าที่สำเร็จ' : 'เพิ่มเจ้าหน้าที่สำเร็จ',
      type: 'success',
    });
    setShowForm(false);
    setEditingStaff(null);
    fetchStaff();
  };

  // Group by department for summary
  const departments = [...new Set(staffList.map(s => s.department).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Form Modal */}
      {showForm && (
        <StaffFormModal
          editStaff={editingStaff}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditingStaff(null); }}
        />
      )}

      {/* Delete Modal */}
      {deletingStaff && (
        <DeleteModal
          staff={deletingStaff}
          onConfirm={handleDelete}
          onCancel={() => setDeletingStaff(null)}
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
          <span className="text-[#14b84b] font-medium">จัดการรายชื่อเจ้าหน้าที่</span>
        </div>

        {/* Title + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการรายชื่อเจ้าหน้าที่</h2>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม แก้ไข และจัดการรายชื่อเจ้าหน้าที่ในระบบ</p>
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="px-5 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              เพิ่มเจ้าหน้าที่
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">เจ้าหน้าที่ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">{staffList.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">แผนก/หน่วยงาน</p>
            <p className="text-2xl font-bold text-blue-600">{departments.length}</p>
          </div>
          {departments.slice(0, 2).map(dept => (
            <div key={dept} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-400 font-medium mb-1">{dept}</p>
              <p className="text-2xl font-bold text-slate-700">{staffList.filter(s => s.department === dept).length} <span className="text-sm font-normal text-slate-400">คน</span></p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Toolbar */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#14b84b]">group</span>
              รายชื่อเจ้าหน้าที่
            </h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อ ตำแหน่ง แผนก..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all w-72"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-16">ลำดับ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ชื่อ-นามสกุล</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ตำแหน่ง</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">แผนก/หน่วยงาน</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">เบอร์โทร</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">วันที่เพิ่ม</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 1 ? '60%' : '40%' }}></div></td>
                      ))}
                    </tr>
                  ))
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">group_off</span>
                      <p className="text-slate-400 text-sm mb-4">
                        {debouncedSearch ? 'ไม่พบเจ้าหน้าที่ที่ค้นหา' : 'ยังไม่มีรายชื่อเจ้าหน้าที่'}
                      </p>
                      {!debouncedSearch && (
                        <button onClick={openAdd} className="text-[#14b84b] text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
                          <span className="material-symbols-outlined text-lg">person_add</span> เพิ่มเจ้าหน้าที่คนแรก
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff, index) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#14b84b] font-bold text-sm">{staff.name.charAt(0)}</span>
                          </div>
                          <span className="font-bold text-slate-900 text-sm">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{staff.position || '-'}</td>
                      <td className="px-5 py-3.5">
                        {staff.department ? (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{staff.department}</span>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{staff.phone || '-'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(staff.created_at)}</td>
                      <td className="px-5 py-3.5">
                        {isAdmin && (
                        <div className="relative flex items-center justify-end gap-1" ref={openMenuId === staff.id ? menuRef : undefined}>
                          <button
                            onClick={() => openEdit(staff)}
                            className="p-1.5 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === staff.id ? null : staff.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>

                          {openMenuId === staff.id && (
                            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px] py-1">
                              <button
                                onClick={() => openEdit(staff)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span> แก้ไข
                              </button>
                              <button
                                onClick={() => { setDeletingStaff(staff); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span> ลบเจ้าหน้าที่
                              </button>
                            </div>
                          )}
                        </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">ทั้งหมด {staffList.length} คน</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StaffManagement;