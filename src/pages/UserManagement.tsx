import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { User } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const roleLabels: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'เจ้าหน้าที่ปฏิบัติการ',
  procurement: 'เจ้าหน้าที่พัสดุ',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  staff: 'bg-blue-100 text-blue-800',
  procurement: 'bg-purple-100 text-purple-800',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================================
// User Form Modal (Create / Edit)
// ============================================================
interface UserFormModalProps {
  editUser?: User | null;
  onSave: () => void;
  onClose: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ editUser, onSave, onClose }) => {
  const isEdit = !!editUser;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('staff');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<string>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editUser) {
      setDisplayName(editUser.display_name);
      setRole(editUser.role);
      setPosition(editUser.position || '');
      setDepartment(editUser.department || '');
      setPhone(editUser.phone || '');
      setStatus(editUser.status);
    }
  }, [editUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && editUser) {
        await api.updateUser(editUser.id, {
          display_name: displayName.trim(),
          role,
          status,
          position: position.trim(),
          department: department.trim(),
          phone: phone.trim(),
        });
      } else {
        if (!username.trim() || !password || !displayName.trim()) {
          setError('กรุณากรอกข้อมูลให้ครบถ้วน');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
          setLoading(false);
          return;
        }
        await api.createUser({
          username: username.trim(),
          password,
          display_name: displayName.trim(),
          role,
          position: position.trim(),
          department: department.trim(),
          phone: phone.trim(),
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] bg-white outline-none transition-all text-sm text-slate-900';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">{isEdit ? 'manage_accounts' : 'person_add'}</span>
              <h3 className="text-lg font-bold">{isEdit ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ระบุชื่อผู้ใช้"
                className={inputClass}
                autoFocus
              />
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="อย่างน้อย 4 ตัวอักษร"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อแสดง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="ระบุชื่อแสดง"
              className={inputClass}
              autoFocus={isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">บทบาท</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className={inputClass}
            >
              <option value="staff">เจ้าหน้าที่ปฏิบัติการ</option>
              <option value="procurement">เจ้าหน้าที่พัสดุ</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ตำแหน่ง</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="เช่น นักวิทยาศาสตร์, ผู้ช่วยวิจัย"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">แผนก/หน่วยงาน</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="เช่น ห้องปฏิบัติการเคมี"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">เบอร์โทร</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="เช่น 081-234-5678"
              className={inputClass}
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">สถานะ</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ระงับ</option>
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

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
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
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
// Reset Password Modal
// ============================================================
interface ResetPasswordModalProps {
  user: User;
  onSave: () => void;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, onSave, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.resetUserPassword(user.id, newPassword);
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
              <h3 className="text-lg font-bold">รีเซ็ตรหัสผ่าน</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-sm text-slate-500">ผู้ใช้: <span className="font-bold text-slate-900">{user.display_name}</span></p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              รหัสผ่านใหม่ <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 4 ตัวอักษร"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] bg-white outline-none transition-all text-sm text-slate-900"
              autoFocus
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#14b84b] text-white text-sm font-bold rounded-lg hover:bg-[#0ea53e] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? 'กำลังบันทึก...' : (<><span className="material-symbols-outlined text-lg">save</span> รีเซ็ตรหัสผ่าน</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
// Main: UserManagement
// ============================================================
interface UserManagementProps {
  onNavigateHome?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onNavigateHome }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dropdown
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => { setEditingUser(null); setShowForm(true); };
  const openEdit = (user: User) => { setEditingUser(user); setShowForm(true); setOpenMenuId(null); };

  const handleFormSave = () => {
    setToast({
      message: editingUser ? 'แก้ไขข้อมูลผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ',
      type: 'success',
    });
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleResetSave = () => {
    setToast({ message: 'รีเซ็ตรหัสผ่านสำเร็จ', type: 'success' });
    setResetPasswordUser(null);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showForm && (
        <UserFormModal
          editUser={editingUser}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onSave={handleResetSave}
          onClose={() => setResetPasswordUser(null)}
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
          <span className="text-[#14b84b] font-medium">จัดการผู้ใช้</span>
        </div>

        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการผู้ใช้</h2>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม แก้ไข และจัดการบัญชีผู้ใช้ในระบบ</p>
          </div>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            เพิ่มผู้ใช้
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">ผู้ใช้ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">ผู้ดูแลระบบ</p>
            <p className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">เจ้าหน้าที่ปฏิบัติการ</p>
            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'staff').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">เจ้าหน้าที่พัสดุ</p>
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'procurement').length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#14b84b]">group</span>
              รายชื่อผู้ใช้
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-16">ลำดับ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ชื่อแสดง</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">Username</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ตำแหน่ง/แผนก</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">บทบาท</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">สถานะ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 1 ? '60%' : '40%' }}></div></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">group_off</span>
                      <p className="text-slate-400 text-sm">ยังไม่มีผู้ใช้ในระบบ</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u, index) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#14b84b] font-bold text-sm">{u.display_name.charAt(0)}</span>
                          </div>
                          <span className="font-bold text-slate-900 text-sm">{u.display_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">@{u.username}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          {u.position && <p className="text-sm text-slate-900">{u.position}</p>}
                          {u.department && <p className="text-xs text-slate-400">{u.department}</p>}
                          {!u.position && !u.department && <span className="text-xs text-slate-300">-</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-slate-100 text-slate-800'}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                          {u.status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative flex items-center justify-end gap-1" ref={openMenuId === u.id ? menuRef : undefined}>
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>

                          {openMenuId === u.id && (
                            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1">
                              <button
                                onClick={() => { openEdit(u); }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span> แก้ไข
                              </button>
                              <button
                                onClick={() => { setResetPasswordUser(u); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">lock_reset</span> รีเซ็ตรหัสผ่าน
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">ทั้งหมด {users.length} คน</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
