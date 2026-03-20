// server/routes/categories.js
// Category CRUD Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ทุก route ต้อง login
router.use(authenticateToken);

// GET /api/categories
router.get('/', (req, res, next) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', (req, res, next) => {
  try {
    const category = db.getCategoryById(Number(req.params.id));
    if (!category) {
      return res.status(404).json({ success: false, error: 'ไม่พบหมวดหมู่' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — admin only
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { name, icon = '', color = '#4F46E5', sort_order = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อหมวดหมู่' });
    }
    const category = db.createCategory({ name, icon, color, sort_order });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' });
    }
    next(err);
  }
});

// PUT /api/categories/:id — admin only
router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getCategoryById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบหมวดหมู่' });
    }

    const { name, icon, color, sort_order } = req.body;
    db.updateCategory(id, {
      name: name ?? existing.name,
      icon: icon ?? existing.icon,
      color: color ?? existing.color,
      sort_order: sort_order ?? existing.sort_order,
    });

    const updated = db.getCategoryById(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id — admin only
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getCategoryById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบหมวดหมู่' });
    }

    db.deleteCategory(id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    // deleteCategory throws ถ้ายังมี items อยู่
    if (err.message.includes('ไม่สามารถลบ')) {
      return res.status(409).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;