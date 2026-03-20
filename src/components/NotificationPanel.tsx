import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Item } from '../api/client';

function getItemStatus(item: Item): 'หมด' | 'ใกล้หมด' {
  if (item.current_stock <= 0) return 'หมด';
  return 'ใกล้หมด';
}

// ============================================================
// NotificationPanel
// ============================================================
interface NotificationPanelProps {
  onNavigateItems?: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onNavigateItems }) => {
  const [open, setOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch low stock items
  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLowStockItems();
      setLowStockItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and periodically (every 60s)
  useEffect(() => {
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 60000);
    return () => clearInterval(interval);
  }, [fetchLowStock]);

  // Refetch when panel opens
  useEffect(() => {
    if (open) fetchLowStock();
  }, [open, fetchLowStock]);

  const outOfStock = lowStockItems.filter(i => i.current_stock <= 0);
  const almostOut = lowStockItems.filter(i => i.current_stock > 0);
  const totalAlerts = lowStockItems.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {totalAlerts > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">{totalAlerts > 99 ? '99+' : totalAlerts}</span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-2xl z-[60] overflow-hidden animate-in">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <h3 className="font-bold text-slate-900 text-sm">แจ้งเตือนวัสดุใกล้หมด</h3>
            </div>
            <span className="text-xs text-slate-400">{totalAlerts} รายการ</span>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 bg-slate-200 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : totalAlerts === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[#14b84b] text-2xl">check_circle</span>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">ไม่มีรายการแจ้งเตือน</p>
                <p className="text-xs text-slate-400">วัสดุทุกรายการมีสต็อกเพียงพอ</p>
              </div>
            ) : (
              <>
                {/* Out of stock section */}
                {outOfStock.length > 0 && (
                  <div>
                    <div className="px-5 py-2 bg-red-50 border-b border-red-100">
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                        หมดแล้ว ({outOfStock.length})
                      </span>
                    </div>
                    {outOfStock.map(item => (
                      <div
                        key={item.id}
                        className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer"
                        onClick={() => {
                          setOpen(false);
                          if (onNavigateItems) onNavigateItems();
                        }}
                      >
                        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">CAT: {item.cat_code}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              สต็อกหมด
                            </span>
                            <span className="text-[10px] text-slate-400">ขั้นต่ำ: {item.min_stock} {item.unit}</span>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-red-600 flex-shrink-0">0</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Almost out section */}
                {almostOut.length > 0 && (
                  <div>
                    <div className="px-5 py-2 bg-amber-50 border-b border-amber-100">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        ใกล้หมด ({almostOut.length})
                      </span>
                    </div>
                    {almostOut.map(item => {
                      const percent = Math.round((item.current_stock / Math.max(item.min_stock, 1)) * 100);
                      return (
                        <div
                          key={item.id}
                          className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer"
                          onClick={() => {
                            setOpen(false);
                            if (onNavigateItems) onNavigateItems();
                          }}
                        >
                          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-amber-500 text-lg">inventory_2</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">CAT: {item.cat_code}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                <div
                                  className={`h-full rounded-full ${percent <= 30 ? 'bg-red-400' : 'bg-amber-400'}`}
                                  style={{ width: `${Math.min(100, percent)}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                เหลือ {item.current_stock}/{item.min_stock} {item.unit}
                              </span>
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-amber-600 flex-shrink-0">{item.current_stock}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {totalAlerts > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  setOpen(false);
                  if (onNavigateItems) onNavigateItems();
                }}
                className="w-full text-center text-xs font-bold text-[#14b84b] hover:text-[#0ea53e] transition-colors py-1"
              >
                ดูรายการวัสดุทั้งหมด →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;