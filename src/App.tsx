import React, { useState } from 'react';
import Home from './pages/Home';
import ItemManagement from './pages/ItemManagement';
import StaffManagement from './pages/StaffManagement';
import ReportSummary from './pages/ReportSummary';
import PrintInventory from './pages/PrintInventory';
import NotificationPanel from './components/NotificationPanel';

// ============================================================
// Simple page router ด้วย state
// ไม่ต้องพึ่ง react-router — เหมาะกับ Electron desktop app
// ============================================================
type Page = 'home' | 'items' | 'staff' | 'report' | 'print';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

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
            <button
              onClick={() => setCurrentPage('home')}
              className={`text-sm font-medium pb-1 transition-colors ${
                currentPage === 'home'
                  ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
                  : 'text-slate-500 hover:text-[#14b84b]'
              }`}
            >
              หน้าหลัก
            </button>
            <button
              onClick={() => setCurrentPage('items')}
              className={`text-sm font-medium pb-1 transition-colors ${
                currentPage === 'items'
                  ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
                  : 'text-slate-500 hover:text-[#14b84b]'
              }`}
            >
              จัดการวัสดุอุปกรณ์
            </button>
            <button
              onClick={() => setCurrentPage('staff')}
              className={`text-sm font-medium pb-1 transition-colors ${
                currentPage === 'staff'
                  ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
                  : 'text-slate-500 hover:text-[#14b84b]'
              }`}
            >
              จัดการรายชื่อเจ้าหน้าที่
            </button>
            <button
              onClick={() => setCurrentPage('report')}
              className={`text-sm font-medium pb-1 transition-colors ${
                currentPage === 'report'
                  ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
                  : 'text-slate-500 hover:text-[#14b84b]'
              }`}
            >
              สรุปรายงาน
            </button>
            <button
              onClick={() => setCurrentPage('print')}
              className={`text-sm font-medium pb-1 transition-colors ${
                currentPage === 'print'
                  ? 'text-[#14b84b] font-semibold border-b-2 border-[#14b84b]'
                  : 'text-slate-500 hover:text-[#14b84b]'
              }`}
            >
              ปริ้นรายการ
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NotificationPanel onNavigateItems={() => setCurrentPage('items')} />
          <div className="bg-green-100 rounded-full p-1 border border-green-200">
            <div className="w-8 h-8 rounded-full bg-[#14b84b] flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
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
      {currentPage === 'staff' && (
        <StaffManagement onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'report' && (
        <ReportSummary onNavigateHome={() => setCurrentPage('home')} />
      )}
      {currentPage === 'print' && (
        <PrintInventory onNavigateHome={() => setCurrentPage('home')} />
      )}
    </>
  );
};

export default App;