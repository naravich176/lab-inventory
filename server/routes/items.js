// server/routes/items.js
// Item CRUD Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/items?categoryId=&search=&status=&page=&limit=
router.get('/', (req, res, next) => {
  try {
    const { categoryId, search, status, stockStatus, sort, page = 1, limit = 20 } = req.query;
    const result = db.getItems({
      categoryId: categoryId ? Number(categoryId) : undefined,
      search: search || undefined,
      status: status || undefined,
      stockStatus: stockStatus || undefined,
      sort: sort || undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/:id', (req, res, next) => {
  try {
    const item = db.getItemById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ success: false, error: 'ไม่พบวัสดุ' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// POST /api/items — admin only
router.post('/', requireStaffOrAdmin, (req, res, next) => {
  try {
    const { name, cat_code, unit, min_stock = 0, current_stock = 0, category_id, description = '', user_id } = req.body;

    if (!name || !cat_code || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก name, cat_code, category_id',
      });
    }

    const stockQty = Number(current_stock);
    // สร้าง item — ถ้ามี user_id จะสร้างด้วย stock=0 แล้ว addStock เพื่อบันทึก transaction
    const item = db.createItem({
      name, cat_code, unit: unit || 'ชิ้น',
      min_stock: Number(min_stock),
      current_stock: user_id && stockQty > 0 ? 0 : stockQty,
      category_id: Number(category_id),
      description,
    });

    // ถ้ามี user_id และ stock > 0 → สร้าง transaction record
    let finalItem = item;
    if (user_id && stockQty > 0) {
      finalItem = db.addStock({
        item_id: item.id,
        quantity: stockQty,
        note: 'สต็อกเริ่มต้น (สร้างรายการใหม่)',
        user_id: Number(user_id),
      });
    }

    res.status(201).json({ success: true, data: finalItem });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'รหัสวัสดุ (cat_code) ซ้ำ' });
    }
    next(err);
  }
});

// PUT /api/items/:id — admin only
router.put('/:id', requireStaffOrAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบวัสดุ' });
    }

    const newStock = req.body.current_stock != null ? Number(req.body.current_stock) : existing.current_stock;
    const stockDiff = newStock - existing.current_stock;
    const staffId = req.body.user_id ? Number(req.body.user_id) : null;

    // อัปเดตข้อมูลพื้นฐาน (ไม่รวม stock ถ้ามี user_id — ให้ addStock จัดการ)
    const updateStock = staffId && stockDiff !== 0 ? existing.current_stock : newStock;
    const updated = db.updateItem(id, {
      name: req.body.name ?? existing.name,
      cat_code: req.body.cat_code ?? existing.cat_code,
      unit: req.body.unit ?? existing.unit,
      min_stock: req.body.min_stock != null ? Number(req.body.min_stock) : existing.min_stock,
      current_stock: updateStock,
      category_id: req.body.category_id != null ? Number(req.body.category_id) : existing.category_id,
      description: req.body.description ?? existing.description,
    });

    // ถ้ามี user_id และ stock เปลี่ยน → สร้าง transaction
    let finalItem = updated;
    if (staffId && stockDiff > 0) {
      finalItem = db.addStock({
        item_id: id,
        quantity: stockDiff,
        note: 'เพิ่มสต็อก (แก้ไขข้อมูล)',
        user_id: staffId,
      });
    } else if (staffId && stockDiff < 0) {
      const result = db.withdrawItem({
        item_id: id,
        user_id: staffId,
        quantity: Math.abs(stockDiff),
        note: 'ลดสต็อก (แก้ไขข้อมูล)',
      });
      finalItem = result.item;
    }

    res.json({ success: true, data: finalItem });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'รหัสวัสดุ (cat_code) ซ้ำ' });
    }
    next(err);
  }
});

// DELETE /api/items/:id — admin only
router.delete('/:id', requireStaffOrAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบวัสดุ' });
    }

    const result = db.deleteItem(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;