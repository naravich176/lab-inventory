// server/routes/items.js
// Item CRUD Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/items?categoryId=&search=&status=&page=&limit=
router.get('/', (req, res, next) => {
  try {
    const { categoryId, search, status, page = 1, limit = 20 } = req.query;
    const result = db.getItems({
      categoryId: categoryId ? Number(categoryId) : undefined,
      search: search || undefined,
      status: status || undefined,
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
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { name, cat_code, unit, min_stock = 0, current_stock = 0, category_id, description = '' } = req.body;

    if (!name || !cat_code || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก name, cat_code, category_id',
      });
    }

    const item = db.createItem({
      name, cat_code, unit: unit || 'ชิ้น',
      min_stock: Number(min_stock),
      current_stock: Number(current_stock),
      category_id: Number(category_id),
      description,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'รหัสวัสดุ (cat_code) ซ้ำ' });
    }
    next(err);
  }
});

// PUT /api/items/:id — admin only
router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบวัสดุ' });
    }

    const updated = db.updateItem(id, {
      name: req.body.name ?? existing.name,
      cat_code: req.body.cat_code ?? existing.cat_code,
      unit: req.body.unit ?? existing.unit,
      min_stock: req.body.min_stock != null ? Number(req.body.min_stock) : existing.min_stock,
      current_stock: req.body.current_stock != null ? Number(req.body.current_stock) : existing.current_stock,
      category_id: req.body.category_id != null ? Number(req.body.category_id) : existing.category_id,
      description: req.body.description ?? existing.description,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'รหัสวัสดุ (cat_code) ซ้ำ' });
    }
    next(err);
  }
});

// DELETE /api/items/:id — admin only
router.delete('/:id', requireAdmin, (req, res, next) => {
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