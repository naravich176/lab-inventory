import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Notification } from '../api/client';

// ============================================================
// NotificationPanel — ใช้ตาราง notifications แทน low-stock / expiring queries
// ============================================================
interface NotificationPanelProps {
  onNavigateItems?: () => void;
}

const typeConfig: Record<string, { icon: string; bgColor: string; iconColor: string; sectionBg: string; sectionBorder: string; sectionText: string; label: string }> = {
  out_of_stock: {
    icon: 'error',
    bgColor: 'bg-red-100',
    iconColor: 'text-red-500',
    sectionBg: 'bg-red-50',
    sectionBorder: 'border-red-100',
    sectionText: 'text-red-700',
    label: 'หมดสต็อก',
  },
  low_stock: {
    icon: 'inventory_2',
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-500',
    sectionBg: 'bg-amber-50',
    sectionBorder: 'border-amber-100',
    sectionText: 'text-amber-700',
    label: 'สต็อกใกล้หมด',
  },
  expired: {
    icon: 'event_busy',
    bgColor: 'bg-red-100',
    iconColor: 'text-red-500',
    sectionBg: 'bg-red-50',
    sectionBorder: 'border-red-100',
    sectionText: 'text-red-700',
    label: 'หมดอายุแล้ว',
  },
  expiring: {
    icon: 'schedule',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-500',
    sectionBg: 'bg-orange-50',
    sectionBorder: 'border-orange-100',
    sectionText: 'text-orange-700',
    label: 'ใกล้หมดอายุ',
  },
};

// ลำดับการแสดงผล sections
const sectionOrder: string[] = ['expired', 'expiring', 'out_of_stock', 'low_stock'];

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onNavigateItems }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Generate ก่อน แล้วค่อยดึงรายการ
      await api.generateNotifications();
      const [notifs, countData] = await Promise.all([
        api.getNotifications(),
        api.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and periodically (every 60s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Click notification → mark as read + navigate
  const handleClickNotification = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    setOpen(false);
    if (onNavigateItems) onNavigateItems();
  };

  // Group notifications by type
  const grouped = sectionOrder.reduce<Record<string, Notification[]>>((acc, type) => {
    const items = notifications.filter(n => n.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  const totalAlerts = notifications.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
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
              <h3 className="font-bold text-slate-900 text-sm">แจ้งเตือน</h3>
            </div>
            <span className="text-xs text-slate-400">{totalAlerts} รายการ</span>
          </div>

          {/* Content */}
          <div className="max-h-[500px] overflow-y-auto">
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
                <p className="text-xs text-slate-400">วัสดุทุกรายการมีสต็อกเพียงพอและยังไม่หมดอายุ</p>
              </div>
            ) : (
              <>
                {sectionOrder.map(type => {
                  const items = grouped[type];
                  if (!items) return null;
                  const config = typeConfig[type];
                  return (
                    <div key={type}>
                      {/* Section Header */}
                      <div className={`px-5 py-2 ${config.sectionBg} border-b ${config.sectionBorder}`}>
                        <span className={`text-xs font-bold ${config.sectionText} uppercase tracking-wider`}>
                          {config.label} ({items.length})
                        </span>
                      </div>
                      {/* Items */}
                      {items.map(notif => (
                        <div
                          key={notif.id}
                          className={`px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer ${notif.is_read ? 'opacity-50' : ''}`}
                          onClick={() => handleClickNotification(notif)}
                        >
                          <div className={`w-9 h-9 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <span className={`material-symbols-outlined ${config.iconColor} text-lg`}>{config.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${notif.is_read ? 'font-medium text-slate-500' : 'font-bold text-slate-900'} truncate`}>
                              {notif.item_name || notif.title}
                            </p>
                            {notif.cat_code && (
                              <p className="text-xs text-slate-400 mt-0.5">CAT: {notif.cat_code}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          {totalAlerts > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => { setOpen(false); if (onNavigateItems) onNavigateItems(); }}
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
