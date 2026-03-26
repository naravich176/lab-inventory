import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { ProcurementRequest, Item, PaginatedProcurement, Category } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const statusLabels: Record<string, string> = {
  requested: 'แจ้งคำขอ',
  ordering: 'กำลังสั่งซื้อ',
  shipping: 'ระหว่างจัดส่ง',
  delivered: 'ส่งถึงแล้ว',
  received: 'รับแล้ว',
};

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  ordering: 'bg-blue-100 text-blue-800',
  shipping: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  received: 'bg-emerald-200 text-emerald-900',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================================
// Create Request Modal
// ============================================================
interface CreateModalProps {
  onSave: () => void;
  onClose: () => void;
}

const CreateRequestModal: React.FC<CreateModalProps> = ({ onSave, onClose }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('ชิ้น');
  const [reason, setReason] = useState('');
  const [useExisting, setUseExisting] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Item search
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await api.getItems({ limit: 500, status: 'active' });
        setItems(data.items);
      } catch (err) { console.error(err); }
    }
    fetchItems();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowItemDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.cat_code.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === selectedItemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = useExisting && selectedItem ? selectedItem.name : itemName.trim();
    if (!name) {
      setError('กรุณาระบุชื่อวัสดุ');
      return;
    }
    if (quantity <= 0) {
      setError('จำนวนต้องมากกว่า 0');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createProcurementRequest({
        item_id: useExisting && selectedItemId ? selectedItemId : null,
        item_name: name,
        quantity,
        unit: useExisting && selectedItem ? selectedItem.unit : unit,
        reason,
      });
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
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              <h3 className="text-lg font-bold">แจ้งคำขอจัดซื้อ</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Toggle: existing item or new */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setUseExisting(true); setItemName(''); }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${useExisting ? 'bg-[#14b84b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              เลือกจากระบบ
            </button>
            <button
              type="button"
              onClick={() => { setUseExisting(false); setSelectedItemId(null); }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!useExisting ? 'bg-[#14b84b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              วัสดุใหม่
            </button>
          </div>

          {useExisting ? (
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">เลือกวัสดุจากระบบ</label>
              <div
                className="w-full border border-slate-200 rounded-lg cursor-pointer hover:border-[#14b84b] transition-colors"
                onClick={() => setShowItemDropdown(!showItemDropdown)}
              >
                {selectedItem ? (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">{selectedItem.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({selectedItem.cat_code})</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 flex items-center justify-between text-slate-400">
                    <span className="text-sm">เลือกวัสดุ...</span>
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </div>
                )}
              </div>

              {showItemDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-56 overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อหรือรหัสวัสดุ..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white text-slate-900 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#14b84b]"
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-40">
                    {filteredItems.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400 text-center">ไม่พบวัสดุ</p>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className={`w-full px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm ${selectedItemId === item.id ? 'bg-green-50 text-[#14b84b]' : 'text-slate-700'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemId(item.id);
                            setUnit(item.unit);
                            setShowItemDropdown(false);
                            setItemSearch('');
                          }}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-slate-400 ml-2">({item.cat_code}) — {item.unit}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  ชื่อวัสดุ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="ระบุชื่อวัสดุที่ต้องการจัดซื้อ"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">หน่วย</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="เช่น ชิ้น, ขวด, กล่อง"
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              จำนวน <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 text-center bg-white border border-slate-200 rounded-lg py-2.5 text-slate-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b]"
              />
              <span className="text-sm text-slate-500">{useExisting && selectedItem ? selectedItem.unit : unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">เหตุผล / หมายเหตุ</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="ระบุเหตุผลหรือหมายเหตุ (ไม่บังคับ)..."
              rows={2}
              className={inputClass + ' resize-none'}
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
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  แจ้งคำขอ
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
// Update Status Modal
// ============================================================
interface UpdateStatusModalProps {
  request: ProcurementRequest;
  onSave: () => void;
  onClose: () => void;
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({ request, onSave, onClose }) => {
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.updateProcurementStatus(request.id, { status, note });
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">update</span>
              <h3 className="text-lg font-bold">อัพเดตสถานะ</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="font-bold text-slate-900">{request.item_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">จำนวน: {request.quantity} {request.unit}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">สถานะ</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className={inputClass}>
              <option value="requested">แจ้งคำขอ</option>
              <option value="ordering">กำลังสั่งซื้อ</option>
              <option value="shipping">ระหว่างจัดส่ง</option>
              <option value="delivered">ส่งถึงแล้ว</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ระบุหมายเหตุ (ไม่บังคับ)..."
              rows={2}
              className={inputClass + ' resize-none'}
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
              {loading ? 'กำลังบันทึก...' : (<><span className="material-symbols-outlined text-lg">save</span> บันทึก</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Receive Modal — ยืนยันรับพัสดุ (วัสดุที่มีอยู่แล้ว)
// ============================================================
interface ReceiveConfirmModalProps {
  request: ProcurementRequest;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const ReceiveConfirmModal: React.FC<ReceiveConfirmModalProps> = ({ request, onConfirm, onCancel, loading }) => {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#14b84b] text-3xl">inventory</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันรับพัสดุ</h3>
            <p className="text-sm text-slate-500 mb-1">รับวัสดุและเพิ่มเข้าคลัง</p>
            <p className="font-bold text-slate-900">"{request.item_name}"</p>
            <p className="text-sm text-slate-500 mt-2">จำนวน <span className="font-bold text-[#14b84b]">{request.quantity} {request.unit}</span> จะถูกเพิ่มเข้า stock</p>
          </div>

          {/* ผู้รับพัสดุ — user ที่ login อยู่ */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ผู้รับพัสดุ</label>
            <div className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 flex items-center gap-2">
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#14b84b] text-sm">person</span>
              </div>
              <div>
                <span className="font-medium text-slate-900">{user?.display_name}</span>
                {user?.department && <span className="text-xs text-slate-400 ml-2">({user.department})</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2.5 bg-[#14b84b] text-white text-sm font-bold rounded-lg hover:bg-[#0ea53e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                กำลังบันทึก...
              </>
            ) : (
              <><span className="material-symbols-outlined text-sm">check</span> ยืนยันรับพัสดุ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Receive New Item Modal — วัสดุใหม่ที่ยังไม่มีในระบบ
// ============================================================
interface ReceiveNewItemModalProps {
  request: ProcurementRequest;
  onSave: () => void;
  onClose: () => void;
}

const ReceiveNewItemModal: React.FC<ReceiveNewItemModalProps> = ({ request, onSave, onClose }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(request.item_name);
  const [catCode, setCatCode] = useState('');
  const [unit, setUnit] = useState(request.unit || 'ชิ้น');
  const [minStock, setMinStock] = useState(0);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [size, setSize] = useState('');
  const [grade, setGrade] = useState('');
  const [brand, setBrand] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonUnits = ['ขวด', 'กก.', 'ชิ้น', 'แพ็ค', 'กล่อง', 'ม้วน', 'อัน', 'แผ่น', 'ลิตร', 'ml'];

  useEffect(() => {
    async function fetchData() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      } catch (err) { console.error(err); }
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('กรุณาระบุชื่อวัสดุ'); return; }
    if (!catCode.trim()) { setError('กรุณาระบุรหัสวัสดุ'); return; }
    if (!categoryId) { setError('กรุณาเลือกหมวดหมู่'); return; }

    setLoading(true);
    setError(null);
    try {
      await api.confirmProcurementReceived(request.id, {
        name: name.trim(),
        cat_code: catCode.trim(),
        unit: unit.trim() || 'ชิ้น',
        min_stock: minStock,
        category_id: categoryId,
        description: [size.trim(), grade.trim(), brand.trim()].join('|'),
        expiry_date: expiryDate || null,
        expiry_alert_days: expiryAlertDays,
      });
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#14b84b] to-[#0ea53e] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">add_box</span>
              <h3 className="text-lg font-bold">รับพัสดุ — สร้างวัสดุใหม่</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-400">จากคำขอจัดซื้อ #{String(request.id).padStart(3, '0')}</p>
            <p className="font-bold text-slate-900 mt-0.5">{request.item_name}</p>
            <p className="text-sm text-slate-500 mt-1">จำนวน <span className="font-bold text-[#14b84b]">{request.quantity} {request.unit}</span> จะถูกเพิ่มเป็น stock เริ่มต้น</p>
          </div>

          {/* ผู้รับพัสดุ — user ที่ login อยู่ */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ผู้รับพัสดุ</label>
            <div className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 flex items-center gap-2">
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#14b84b] text-sm">person</span>
              </div>
              <div>
                <span className="font-medium text-slate-900">{user?.display_name}</span>
                {user?.department && <span className="text-xs text-slate-400 ml-2">({user.department})</span>}
              </div>
            </div>
          </div>

          {/* ข้อมูลพื้นฐาน */}
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#14b84b]">edit_note</span>
            ข้อมูลวัสดุอุปกรณ์
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อวัสดุ <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                รหัสวัสดุ (CAT Code) <span className="text-red-500">*</span>
              </label>
              <input type="text" value={catCode} onChange={e => setCatCode(e.target.value.toUpperCase())} placeholder="เช่น CH-00125" className={inputClass} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                หมวดหมู่ <span className="text-red-500">*</span>
              </label>
              <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} className={inputClass}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">หน่วยนับ</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="เช่น ขวด, กก., ชิ้น" className={inputClass} list="receive-unit-options" />
              <datalist id="receive-unit-options">
                {commonUnits.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">แจ้งเตือนเมื่อเหลือต่ำกว่า</label>
              <input type="number" min={0} value={minStock} onChange={e => setMinStock(Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ขนาด</label>
              <input type="text" value={size} onChange={e => setSize(e.target.value)} placeholder="เช่น 500ml, 1kg" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">เกรด</label>
              <select value={grade} onChange={e => setGrade(e.target.value)} className={inputClass}>
                <option value="">เลือกเกรด (ถ้ามี)</option>
                <option value="Analytical Reagent (AR)">Analytical Reagent (AR)</option>
                <option value="Laboratory Grade">Laboratory Grade</option>
                <option value="General Purpose">General Purpose</option>
                <option value="ACS Grade">ACS Grade</option>
                <option value="HPLC Grade">HPLC Grade</option>
                <option value="Food Grade">Food Grade</option>
                <option value="Technical Grade">Technical Grade</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ยี่ห้อ</label>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="เช่น Merck, Sigma" className={inputClass} />
            </div>
          </div>

          {/* วันหมดอายุ */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-sm text-[#14b84b]">event</span>
              วันหมดอายุ (ถ้ามี)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">วันหมดอายุ</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputClass} />
                <p className="text-xs text-slate-400 mt-1">ไม่บังคับ — เว้นว่างถ้าไม่มีวันหมดอายุ</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">แจ้งเตือนล่วงหน้า (วัน)</label>
                <input type="number" min={1} value={expiryAlertDays} onChange={e => setExpiryAlertDays(Math.max(1, parseInt(e.target.value) || 30))} className={inputClass + ' text-center'} />
                <p className="text-xs text-slate-400 mt-1">แจ้งเตือนก่อนหมดอายุกี่วัน (default: 30)</p>
              </div>
            </div>
            {expiryDate && (
              <div className="mt-3">
                {(() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const exp = new Date(expiryDate + 'T00:00:00');
                  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> หมดอายุแล้ว ({Math.abs(diffDays)} วัน)
                    </span>
                  );
                  if (diffDays <= expiryAlertDays) return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> ใกล้หมดอายุ ({diffDays} วัน)
                    </span>
                  );
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> ยังไม่หมดอายุ ({diffDays} วัน)
                    </span>
                  );
                })()}
              </div>
            )}
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
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <><span className="material-symbols-outlined text-lg">check</span> สร้างวัสดุ + รับพัสดุ</>
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
  request: ProcurementRequest;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ request, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบ</h3>
        <p className="text-sm text-slate-500 mb-1">คุณต้องการลบคำขอจัดซื้อ</p>
        <p className="font-bold text-slate-900">"{request.item_name}"</p>
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
          {loading ? 'กำลังลบ...' : (<><span className="material-symbols-outlined text-sm">delete</span> ลบคำขอ</>)}
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
// Main: Procurement
// ============================================================
interface ProcurementProps {
  onNavigateHome?: () => void;
}

const Procurement: React.FC<ProcurementProps> = () => {
  const { user, isAdmin, isStaff, isProcurement } = useAuth();
  const canCreate = isStaff || isAdmin;
  const canUpdateStatus = isProcurement || isAdmin;
  const canReceive = isStaff || isAdmin;

  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [updatingRequest, setUpdatingRequest] = useState<ProcurementRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<ProcurementRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [receivingRequest, setReceivingRequest] = useState<ProcurementRequest | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProcurementRequests({
        status: filterStatus || undefined,
        search: searchTerm || undefined,
        page,
        limit,
      });
      setRequests(data.requests);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterStatus, searchTerm, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setPage(1); }, [filterStatus, searchTerm]);

  const handleDelete = async () => {
    if (!deletingRequest) return;
    setDeleteLoading(true);
    try {
      await api.deleteProcurementRequest(deletingRequest.id);
      setToast({ message: 'ลบคำขอจัดซื้อสำเร็จ', type: 'success' });
      fetchRequests();
    } catch (err: any) {
      setToast({ message: err.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setDeletingRequest(null);
      setDeleteLoading(false);
    }
  };

  const handleCreateSave = () => {
    setToast({ message: 'แจ้งคำขอจัดซื้อสำเร็จ', type: 'success' });
    setShowCreate(false);
    fetchRequests();
  };

  const handleUpdateSave = () => {
    setToast({ message: 'อัพเดตสถานะสำเร็จ', type: 'success' });
    setUpdatingRequest(null);
    fetchRequests();
  };

  const handleReceiveExisting = async () => {
    if (!receivingRequest || !user) return;
    setReceiveLoading(true);
    try {
      await api.confirmProcurementReceived(receivingRequest.id);
      setToast({ message: 'ยืนยันรับพัสดุสำเร็จ — เพิ่ม stock แล้ว', type: 'success' });
      setReceivingRequest(null);
      fetchRequests();
    } catch (err: any) {
      setToast({ message: err.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleReceiveNewSave = () => {
    setToast({ message: 'ยืนยันรับพัสดุสำเร็จ — สร้างวัสดุใหม่แล้ว', type: 'success' });
    setReceivingRequest(null);
    fetchRequests();
  };

  // Pagination
  const getPageRange = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const statusFilters = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'requested', label: 'แจ้งคำขอ' },
    { value: 'ordering', label: 'กำลังสั่งซื้อ' },
    { value: 'shipping', label: 'ระหว่างจัดส่ง' },
    { value: 'delivered', label: 'ส่งถึงแล้ว' },
    { value: 'received', label: 'รับแล้ว' },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showCreate && <CreateRequestModal onSave={handleCreateSave} onClose={() => setShowCreate(false)} />}
      {updatingRequest && <UpdateStatusModal request={updatingRequest} onSave={handleUpdateSave} onClose={() => setUpdatingRequest(null)} />}
      {deletingRequest && <DeleteModal request={deletingRequest} onConfirm={handleDelete} onCancel={() => setDeletingRequest(null)} loading={deleteLoading} />}
      {receivingRequest && receivingRequest.item_id && (
        <ReceiveConfirmModal
          request={receivingRequest}
          onConfirm={handleReceiveExisting}
          onCancel={() => setReceivingRequest(null)}
          loading={receiveLoading}
        />
      )}
      {receivingRequest && !receivingRequest.item_id && (
        <ReceiveNewItemModal
          request={receivingRequest}
          onSave={handleReceiveNewSave}
          onClose={() => setReceivingRequest(null)}
        />
      )}

      <div className="p-8 max-w-[1400px] mx-auto w-full">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">จัดซื้อจัดจ้าง</h2>
            <p className="text-slate-500 text-sm mt-1">จัดการคำขอจัดซื้อและติดตามสถานะ</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              แจ้งคำขอจัดซื้อ
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-400 font-medium mb-1">ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
          {statusFilters.filter(s => s.value).map(sf => (
            <div key={sf.value} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-400 font-medium mb-1">{sf.label}</p>
              <p className="text-2xl font-bold text-slate-700">{requests.filter(r => r.status === sf.value).length}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {statusFilters.map(sf => (
                <button
                  key={sf.value}
                  onClick={() => setFilterStatus(sf.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterStatus === sf.value
                      ? 'bg-[#14b84b] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสวัสดุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-[#14b84b] transition-all w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-16">ลำดับ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">รหัสวัสดุ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ชื่อวัสดุ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 text-center">จำนวน</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ผู้แจ้ง</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">วันที่แจ้ง</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">สถานะ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">ผู้รับพัสดุ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">วันที่รับ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200">หมายเหตุ</th>
                  <th className="px-5 py-3.5 font-bold border-b border-slate-200 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 1 ? '60%' : '40%' }}></div></td>
                      ))}
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">shopping_cart</span>
                      <p className="text-slate-400 text-sm mb-4">ยังไม่มีคำขอจัดซื้อ</p>
                      {canCreate && (
                        <button onClick={() => setShowCreate(true)} className="text-[#14b84b] text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
                          <span className="material-symbols-outlined text-lg">add</span> แจ้งคำขอแรก
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-400">
                        #{String(req.id).padStart(3, '0')}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {req.cat_code || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 text-sm">{req.item_name}</span>
                        {req.reason && <p className="text-xs text-slate-400 mt-0.5">{req.reason}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-slate-900">{req.quantity}</span>
                        <span className="text-slate-400 text-xs ml-1">{req.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{req.requested_by_name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(req.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-slate-100 text-slate-800'}`}>
                          {statusLabels[req.status] || req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {req.received_by_name ? (
                          <span className="text-sm font-medium text-slate-900">{req.received_by_name}</span>
                        ) : (
                          <span className="text-sm text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{req.received_at ? formatDate(req.received_at) : '-'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[150px] truncate">{req.note || '-'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateStatus && req.status !== 'received' && (
                            <button
                              onClick={() => setUpdatingRequest(req)}
                              className="p-1.5 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors "
                              title="อัพเดตสถานะ"
                            >
                              <span className="material-symbols-outlined text-lg">update</span>
                            </button>
                          )}
                          {canReceive && req.status === 'delivered' && (
                            <button
                              onClick={() => setReceivingRequest(req)}
                              className="p-1.5 text-slate-400 hover:text-[#14b84b] hover:bg-green-50 rounded-lg transition-colors "
                              title="ยืนยันรับพัสดุ"
                            >
                              <span className="material-symbols-outlined text-lg">inventory</span>
                            </button>
                          )}
                          {isAdmin && req.status === 'requested' && (
                            <button
                              onClick={() => setDeletingRequest(req)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors "
                              title="ลบ"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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

export default Procurement;
