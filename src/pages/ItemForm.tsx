import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Category, Item } from '../api/client';

// ============================================================
// Props
// ============================================================
interface ItemFormProps {
  editItem?: Item | null;          // ถ้ามี = edit mode, ไม่มี = add mode
  onSave: () => void;              // callback หลัง save สำเร็จ
  onCancel: () => void;            // callback กด ยกเลิก
}

// ============================================================
// Component
// ============================================================
const ItemForm: React.FC<ItemFormProps> = ({ editItem, onSave, onCancel }) => {
  const isEdit = !!editItem;

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [size, setSize] = useState('');
  const [grade, setGrade] = useState('');
  const [brand, setBrand] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Common units for quick select
  const commonUnits = ['ขวด', 'กก.', 'ชิ้น', 'แพ็ค', 'กล่อง', 'ม้วน', 'อัน', 'แผ่น', 'ลิตร', 'ml'];

  // ============================================================
  // Load categories
  // ============================================================
  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ============================================================
  // Populate form if editing
  // ============================================================
  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCatCode(editItem.cat_code);
      setCategoryId(editItem.category_id);
      setUnit(editItem.unit);
      setCurrentStock(editItem.current_stock);
      setMinStock(editItem.min_stock);
      // แยก description กลับเป็น 3 fields (เก็บรูปแบบ: ขนาด|เกรด|ยี่ห้อ)
      const parts = (editItem.description || '').split('|');
      setSize(parts[0] || '');
      setGrade(parts[1] || '');
      setBrand(parts[2] || '');
    }
  }, [editItem]);

  // ============================================================
  // Validation
  // ============================================================
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'กรุณาระบุชื่อรายการ';
    if (!catCode.trim()) errors.catCode = 'กรุณาระบุรหัสวัสดุ';
    if (!categoryId) errors.categoryId = 'กรุณาเลือกหมวดหมู่';
    if (!unit.trim()) errors.unit = 'กรุณาระบุหน่วย';
    if (currentStock < 0) errors.currentStock = 'จำนวนต้องไม่ติดลบ';
    if (minStock < 0) errors.minStock = 'จำนวนต้องไม่ติดลบ';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ============================================================
  // Submit
  // ============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    const data = {
      name: name.trim(),
      cat_code: catCode.trim(),
      category_id: categoryId,
      unit: unit.trim(),
      current_stock: currentStock,
      min_stock: minStock,
      description: [size.trim(), grade.trim(), brand.trim()].join('|'),
    };

    try {
      if (isEdit && editItem) {
        await api.updateItem(editItem.id, data);
      } else {
        await api.createItem(data);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Field component helper
  // ============================================================
  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200 focus:ring-green-200 focus:border-[#14b84b]'} bg-white focus:ring-2 outline-none transition-all text-sm`;

  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

  return (
    <div className="min-h-screen bg-[#f6f7f8]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans Thai', sans-serif" }}>

      {/* Breadcrumb & Title */}
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <span className="material-symbols-outlined text-base">inventory_2</span>
          <span>จัดการวัสดุอุปกรณ์</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-[#14b84b] font-medium">
            {isEdit ? 'แก้ไขรายการวัสดุ' : 'เพิ่มรายการวัสดุอุปกรณ์'}
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700">arrow_back</span>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isEdit ? 'แก้ไขรายการวัสดุ' : 'เพิ่มรายการวัสดุอุปกรณ์'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {isEdit
                  ? 'แก้ไขข้อมูลวัสดุในระบบจัดการคลังวัสดุอุปกรณ์ห้องปฏิบัติการ'
                  : 'กรอกข้อมูลเพื่อบันทึกรายการวัสดุลงในระบบจัดการคลังวัสดุอุปกรณ์ห้องปฏิบัติการ'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div className="px-8 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#14b84b]">edit_note</span>
            <h3 className="font-bold text-slate-900">ข้อมูลวัสดุอุปกรณ์</h3>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">

              {/* ชื่อรายการ */}
              <div className="lg:col-span-2">
                <label className={labelClass}>
                  ชื่อรายการ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                  placeholder="ระบุชื่อวัสดุ เช่น Ethanol 95% (AR Grade)"
                  className={inputClass(!!fieldErrors.name) + " text-slate-900"}
                />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>

              {/* รหัสวัสดุ */}
              <div>
                <label className={labelClass}>
                  รหัสวัสดุ (CAT Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={catCode}
                  onChange={e => { setCatCode(e.target.value.toUpperCase()); setFieldErrors(p => ({ ...p, catCode: '' })); }}
                  placeholder="เช่น CH-00125"
                  className={inputClass(!!fieldErrors.catCode) + " text-slate-900"}
                />
                {fieldErrors.catCode && <p className="text-xs text-red-500 mt-1">{fieldErrors.catCode}</p>}
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className={labelClass}>
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={e => { setCategoryId(Number(e.target.value)); setFieldErrors(p => ({ ...p, categoryId: '' })); }}
                  className={inputClass(!!fieldErrors.categoryId) + " text-slate-900"}
                >
                  <option value={0}>เลือกหมวดหมู่</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {fieldErrors.categoryId && <p className="text-xs text-red-500 mt-1">{fieldErrors.categoryId}</p>}
              </div>

              {/* หน่วย */}
              <div>
                <label className={labelClass}>
                  หน่วยนับ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={unit}
                    onChange={e => { setUnit(e.target.value); setFieldErrors(p => ({ ...p, unit: '' })); }}
                    placeholder="เช่น ขวด, กก., ชิ้น"
                    className={inputClass(!!fieldErrors.unit) + " text-slate-900"}
                    list="unit-options"
                  />
                  <datalist id="unit-options">
                    {commonUnits.map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                {fieldErrors.unit && <p className="text-xs text-red-500 mt-1">{fieldErrors.unit}</p>}
              </div>

              {/* ขนาด */}
              <div>
                <label className={labelClass}>ขนาด</label>
                <input
                  type="text"
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  placeholder="ระบุขนาด/มิติ เช่น 500ml, 1kg"
                  className={inputClass() + " text-slate-900"}
                />
              </div>

              {/* เกรด */}
              <div>
                <label className={labelClass}>เกรด</label>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className={inputClass() + " text-slate-900"}
                >
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

              {/* ยี่ห้อ */}
              <div>
                <label className={labelClass}>ยี่ห้อ</label>
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="ระบุยี่ห้อ เช่น Merck, Sigma"
                  className={inputClass() + " text-slate-900"}
                />
              </div>

            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#14b84b]">inventory</span>
                จำนวนสต็อก
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">

                {/* จำนวนรับเข้า (current stock) */}
                <div>
                  <label className={labelClass}>
                    จำนวนคงเหลือปัจจุบัน <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={currentStock}
                      onChange={e => setCurrentStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`${inputClass(!!fieldErrors.currentStock)} text-slate-900 text-center`}
                    />
                    <span className="text-slate-400 text-xs font-medium whitespace-nowrap min-w-[40px]">
                      {unit || 'หน่วย'}
                    </span>
                  </div>
                  {fieldErrors.currentStock && <p className="text-xs text-red-500 mt-1">{fieldErrors.currentStock}</p>}
                </div>

                {/* แจ้งจำนวนขั้นต่ำ (min stock) */}
                <div>
                  <label className={labelClass}>แจ้งเตือนเมื่อเหลือต่ำกว่า</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={minStock}
                      onChange={e => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`${inputClass()} text-slate-900 text-center`}
                    />
                    <span className="text-slate-400 text-xs font-medium whitespace-nowrap min-w-[40px]">
                      {unit || 'หน่วย'}
                    </span>
                  </div>
                </div>

                {/* สถานะ (auto-computed preview) */}
                <div>
                  <label className={labelClass}>สถานะ (คำนวณอัตโนมัติ)</label>
                  <div className={`px-4 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-center`}>
                    {currentStock <= 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> หมด
                      </span>
                    ) : currentStock <= minStock ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> ใกล้หมด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> ปกติ
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-sm transition-all text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 rounded-lg bg-[#14b84b] hover:bg-[#0ea53e] text-white font-bold text-sm shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;