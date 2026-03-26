import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import ItemManagement from './pages/ItemManagement';
import ReportSummary from './pages/ReportSummary';
import PrintInventory from './pages/PrintInventory';
import CategoryManagement from './pages/CategoryManagement';
import UserManagement from './pages/UserManagement';
import Procurement from './pages/Procurement';
import NotificationPanel from './components/NotificationPanel';

// ============================================================
// Simple page router ด้วย state
// ============================================================
type Page = 'home' | 'items' | 'report' | 'print' | 'categories' | 'users' | 'procurement';

const roleLabels: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'เจ้าหน้าที่ปฏิบัติการ',
  procurement: 'เจ้าหน้าที่พัสดุ',
};

const App: React.FC = () => {
  const { user, isLoggedIn, isLoading, isAdmin, isStaff, isProcurement, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(isProcurement ? 'procurement' : 'home');
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const canManageItems = isStaff || isAdmin;
  const canManageCategories = isStaff || isAdmin;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // กำลังตรวจ token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#14b84b] to-[#0ea53e] rounded-2xl shadow-lg shadow-green-500/30 mb-4">
            <span className="text-3xl">🧪</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="animate-spin h-5 w-5 text-[#14b84b]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">กำลังโหลด...</span>
          </div>
        </div>
      </div>
    );
  }

  // ยังไม่ login → แสดงหน้า Login
  if (!isLoggedIn) {
    return <Login />;
  }

  const navButton = (page: Page, label: string) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`text-sm font-medium pb-1 transition-colors ${
        currentPage === page
          ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
          : 'text-slate-500 hover:text-[#14b84b]'
      }`}
    >
      {label}
    </button>
  );

  // login แล้ว → แสดง app ปกติ
  return (
    <>
      {/* Shared Navbar */}
      <header className="flex items-center justify-between border-b border-green-100 bg-white px-10 py-3 sticky top-0 z-50" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-[#14b84b] cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className="material-symbols-outlined text-3xl">biotech</span>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">ระบบจัดการคลังแล็บ</h2>
          </div>
          <nav className="flex items-center gap-6">
            {navButton('home', 'หน้าหลัก')}
            {canManageItems && navButton('items', 'จัดการวัสดุอุปกรณ์')}
            {navButton('procurement', 'จัดซื้อ')}
            {!isProcurement && navButton('report', 'สรุปรายงาน')}
            {!isProcurement && navButton('print', 'ปริ้นรายการ')}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {!isProcurement && <NotificationPanel onNavigateItems={() => setCurrentPage('items')} onNavigateProcurement={() => setCurrentPage('procurement')} />}

          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${
                showSettings || currentPage === 'categories' || currentPage === 'users'
                  ? 'bg-green-100 text-[#14b84b]'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>

            {showSettings && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">ตั้งค่าระบบ</p>
                </div>
                {canManageCategories && (
                  <button
                    onClick={() => { setCurrentPage('categories'); setShowSettings(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentPage === 'categories' ? 'text-[#14b84b] font-medium' : 'text-slate-700'}`}
                  >
                    <span className="material-symbols-outlined text-lg">category</span>
                    จัดการหมวดหมู่
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setCurrentPage('users'); setShowSettings(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentPage === 'users' ? 'text-[#14b84b] font-medium' : 'text-slate-700'}`}
                  >
                    <span className="material-symbols-outlined text-lg">manage_accounts</span>
                    จัดการผู้ใช้
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-[#14b84b] font-bold text-sm">
                  {user?.display_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-900 leading-tight">{user?.display_name || 'ผู้ใช้'}</p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {roleLabels[user?.role || ''] || user?.role}
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{user?.display_name}</p>
                  <p className="text-xs text-slate-400">@{user?.username}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      {currentPage === 'home' && (
        <Home onNavigateItems={() => setCurrentPage('items')} />
      )}
      {currentPage === 'items' && (
        <ItemManagement onNavigateHome={() => setCurrentPage('home')} />
      )}
{currentPage === 'report' && (
        <ReportSummary onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'print' && (
        <PrintInventory onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'categories' && (
        <CategoryManagement onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'users' && (
        <UserManagement onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'procurement' && (
        <Procurement onNavigateHome={() => setCurrentPage('home')} />
      )}
    </>
  );
};

export default App;
