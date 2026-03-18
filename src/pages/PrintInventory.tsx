import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Category, Item, ItemFilters } from '../types/database';

// ============================================================
// Helper
// ============================================================
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

function getItemStatus(item: Item): string {
  if (item.current_stock <= 0) return 'หมด';
  if (item.current_stock <= item.min_stock) return 'ใกล้หมด';
  return 'ปกติ';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

const mockCategories: Category[] = [
  { id: 1, name: 'สารเคมี', icon: 'flask', color: '#EF4444', sort_order: 1, created_at: '', updated_at: '' },
  { id: 2, name: 'วัสดุวิทยาศาสตร์', icon: 'microscope', color: '#3B82F6', sort_order: 2, created_at: '', updated_at: '' },
  { id: 3, name: 'วัสดุสำนักงาน', icon: 'briefcase', color: '#F59E0B', sort_order: 3, created_at: '', updated_at: '' },
  { id: 4, name: 'วัสดุงานบ้าน', icon: 'home', color: '#10B981', sort_order: 4, created_at: '', updated_at: '' },
];

const mockItems: Item[] = [
  { id: 1, name: 'Ethanol 95% (AR Grade)', cat_code: 'CH-00125', unit: 'ขวด', min_stock: 5, current_stock: 25, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-24', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 2, name: 'Hydrochloric Acid 37%', cat_code: 'CH-00128', unit: 'ขวด', min_stock: 5, current_stock: 3, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-22', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 3, name: 'Sodium Chloride', cat_code: 'CH-00210', unit: 'กก.', min_stock: 5, current_stock: 12, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-18', category_name: 'สารเคมี', category_color: '#EF4444' },
  { id: 4, name: 'Sulfuric Acid 98%', cat_code: 'CH-00135', unit: 'ขวด', min_stock: 5, current_stock: 0, category_id: 1, description: '', status: 'active', created_at: '', updated_at: '2023-10-15', category_name: 'สารเคมี', category_color: '#EF4444' },
];

// ============================================================
// Column config
// ============================================================
interface ColumnConfig {
  key: string;
  label: string;
  default: boolean;
}

const allColumns: ColumnConfig[] = [
  { key: 'index', label: 'ลำดับ', default: true },
  { key: 'name', label: 'ชื่อวัสดุ', default: true },
  { key: 'cat_code', label: 'รหัสวัสดุ', default: true },
  { key: 'category', label: 'หมวดหมู่', default: true },
  { key: 'status', label: 'สถานะ', default: true },
  { key: 'current_stock', label: 'คงเหลือ', default: true },
  { key: 'min_stock', label: 'ขั้นต่ำ', default: false },
  { key: 'unit', label: 'หน่วย', default: true },
  { key: 'updated_at', label: 'วันที่อัปเดต', default: true },
  { key: 'description', label: 'คำอธิบาย', default: false },
];

// ============================================================
// Main: PrintInventory
// ============================================================
interface PrintInventoryProps {
  onNavigateHome?: () => void;
}

const PrintInventory: React.FC<PrintInventoryProps> = ({ onNavigateHome }) => {
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<number>(0); // 0 = all
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, normal, low, out
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    allColumns.filter(c => c.default).map(c => c.key)
  );

  // Print
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Title / subtitle for print
  const [title, setTitle] = useState('รายการวัสดุอุปกรณ์คงคลัง');
  const [subtitle, setSubtitle] = useState('ห้องปฏิบัติการ');

  // ============================================================
  // Fetch
  // ============================================================
  const fetchCategories = useCallback(async () => {
    if (!isElectron()) { setCategories(mockCategories); return; }
    try {
      const res = await window.electronAPI.getCategories();
      if (res.success && res.data) setCategories(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchItems = useCallback(async () => {
    if (!isElectron()) {
      let filtered = [...mockItems];
      if (selectedCategory > 0) filtered = filtered.filter(i => i.category_id === selectedCategory);
      setItems(filtered);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const filters: ItemFilters = {
        categoryId: selectedCategory > 0 ? selectedCategory : undefined,
        status: 'active',
        page: 1,
        limit: 9999, // get all for print
      };
      const res = await window.electronAPI.getItems(filters);
      if (res.success && res.data) {
        setItems(res.data.items);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedCategory]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ============================================================
  // Filter items by status
  // ============================================================
  const filteredItems = items.filter(item => {
    if (statusFilter === 'all') return true;
    const status = getItemStatus(item);
    if (statusFilter === 'normal') return status === 'ปกติ';
    if (statusFilter === 'low') return status === 'ใกล้หมด';
    if (statusFilter === 'out') return status === 'หมด';
    return true;
  });

  // ============================================================
  // Column toggle
  // ============================================================
  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // ============================================================
  // Print handler
  // ============================================================
  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // ============================================================
  // Get today
  // ============================================================
  const today = new Date().toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const activeCatName = selectedCategory === 0
    ? 'ทุกหมวดหมู่'
    : categories.find(c => c.id === selectedCategory)?.name || '';

  // ============================================================
  // Render cell value
  // ============================================================
  const renderCell = (item: Item, colKey: string, index: number) => {
    const status = getItemStatus(item);
    switch (colKey) {
      case 'index':
        return String(index + 1).padStart(3, '0');
      case 'name':
        return item.name;
      case 'cat_code':
        return item.cat_code;
      case 'category':
        return item.category_name || '-';
      case 'status':
        return status;
      case 'current_stock':
        return item.current_stock;
      case 'min_stock':
        return item.min_stock;
      case 'unit':
        return item.unit;
      case 'updated_at':
        return formatDate(item.updated_at);
      case 'description':
        return item.description || '-';
      default:
        return '-';
    }
  };

  const statusPrintClass = (item: Item) => {
    const s = getItemStatus(item);
    if (s === 'หมด') return 'text-red-600 font-bold';
    if (s === 'ใกล้หมด') return 'text-amber-600 font-bold';
    if (s === 'ปกติ') return 'text-green-600 font-bold';
    return 'text-slate-700';
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <>
      {/* ============ Print Stylesheet ============ */}
        <style>{`
            @media print {
                body * { visibility: hidden; }
                #print-area, #print-area * { visibility: visible; }
                #print-area {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 20px;
                }
                .no-print { display: none !important; }
                header { display: none !important; }
                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }
            }
        `}</style>

      {/* ============ Settings Panel (no-print) ============ */}
      <div className="no-print min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
        <div className="p-8 max-w-7xl mx-auto w-full">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <button onClick={onNavigateHome} className="hover:text-[#14b84b] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-base">home</span>
              <span>หน้าหลัก</span>
            </button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-[#14b84b] font-medium">ปริ้นรายการวัสดุ</span>
          </div>

          {/* Title */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ปริ้นรายการวัสดุอุปกรณ์</h2>
              <p className="text-slate-500 text-sm mt-1">ตั้งค่าและพิมพ์รายงานรายการวัสดุคงคลัง</p>
            </div>
            <button
              onClick={handlePrint}
              disabled={filteredItems.length === 0}
              className="px-6 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              พิมพ์รายการ ({filteredItems.length} รายการ)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Settings Card */}
            <div className="lg:col-span-1 space-y-4">

              {/* Print Title */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#14b84b] text-lg">title</span>
                  หัวกระดาษ
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อเอกสาร</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="เช่น รายการวัสดุอุปกรณ์คงคลัง"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อหน่วยงาน</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      placeholder="เช่น ห้องปฏิบัติการชีววิทยา"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#14b84b] text-lg">filter_list</span>
                  กรองข้อมูล
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">หมวดหมู่</label>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                    >
                      <option value={0}>ทุกหมวดหมู่</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">สถานะ</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="normal">ปกติ</option>
                      <option value="low">ใกล้หมด</option>
                      <option value="out">หมดแล้ว</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Column Selection */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#14b84b] text-lg">view_column</span>
                  คอลัมน์ที่แสดง
                </h4>
                <div className="space-y-2">
                  {allColumns.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 rounded border-slate-300 text-[#14b84b] focus:ring-[#14b84b]"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#14b84b]">preview</span>
                  ตัวอย่างก่อนพิมพ์
                </h3>
                <span className="text-xs text-slate-400">{filteredItems.length} รายการ</span>
              </div>

              <div className="p-6 overflow-x-auto">
                {loading ? (
                  <div className="py-12 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">print_disabled</span>
                    <p className="text-sm text-slate-400">ไม่มีรายการที่ตรงกับเงื่อนไข</p>
                  </div>
                ) : (
                  <>
                    {/* Preview Header */}
                    <div className="mb-4 text-center">
                      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                      <p className="text-sm text-slate-500">{subtitle}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        หมวดหมู่: {activeCatName} | สถานะ: {statusFilter === 'all' ? 'ทั้งหมด' : statusFilter === 'normal' ? 'ปกติ' : statusFilter === 'low' ? 'ใกล้หมด' : 'หมดแล้ว'} | วันที่พิมพ์: {today}
                      </p>
                    </div>

                    {/* Preview Table */}
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          {allColumns
                            .filter(c => selectedColumns.includes(c.key))
                            .map(col => (
                              <th key={col.key} className="px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 bg-slate-50 whitespace-nowrap">
                                {col.label}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, i) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            {allColumns
                              .filter(c => selectedColumns.includes(c.key))
                              .map(col => (
                                <td
                                  key={col.key}
                                  className={`px-3 py-2 text-xs border border-slate-200 whitespace-nowrap ${
                                    col.key === 'status' ? statusPrintClass(item) :
                                    col.key === 'current_stock' ? statusPrintClass(item) :
                                    'text-slate-700'
                                  }`}
                                >
                                  {renderCell(item, col.key, i)}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <p className="text-[10px] text-slate-400 mt-3 text-right">รวมทั้งหมด {filteredItems.length} รายการ</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Actual Print Area (hidden on screen) ============ */}
      <div
        id="print-area"
        ref={printRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '100%',
          fontFamily: "'Noto Sans Thai', 'Space Grotesk', sans-serif",
          fontSize: '11px',
          color: '#1e293b',
        }}
      >
        {/* Print Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{title}</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 2px 0' }}>{subtitle}</p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
            หมวดหมู่: {activeCatName} | วันที่พิมพ์: {today}
          </p>
        </div>

        {/* Print Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              {allColumns
                .filter(c => selectedColumns.includes(c.key))
                .map(col => (
                  <th
                    key={col.key}
                    style={{
                      border: '1px solid #cbd5e1',
                      padding: '6px 8px',
                      backgroundColor: '#f1f5f9',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      fontSize: '10px',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, i) => {
              const status = getItemStatus(item);
              return (
                <tr key={item.id}>
                  {allColumns
                    .filter(c => selectedColumns.includes(c.key))
                    .map(col => (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #e2e8f0',
                          padding: '5px 8px',
                          whiteSpace: 'nowrap',
                          color: (col.key === 'status' || col.key === 'current_stock')
                            ? (status === 'หมด' ? '#dc2626' : status === 'ใกล้หมด' ? '#d97706' : status === 'ปกติ' ? '#16a34a' : '#1e293b')
                            : '#1e293b',
                          fontWeight: (col.key === 'status' || col.key === 'current_stock') && status !== 'ปกติ' ? 'bold' : 'normal',
                        }}
                      >
                        {renderCell(item, col.key, i)}
                      </td>
                    ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Print Footer */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
          <span>รวมทั้งหมด {filteredItems.length} รายการ</span>
          <span>พิมพ์จากระบบจัดการคลังแล็บ</span>
        </div>

        {/* Signature Lines */}
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #cbd5e1', width: '180px', margin: '0 auto' }}></div>
            <p style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>ผู้จัดทำ</p>
            <p style={{ fontSize: '9px', color: '#94a3b8' }}>วันที่ ....../....../......</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #cbd5e1', width: '180px', margin: '0 auto' }}></div>
            <p style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>ผู้ตรวจสอบ</p>
            <p style={{ fontSize: '9px', color: '#94a3b8' }}>วันที่ ....../....../......</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintInventory;