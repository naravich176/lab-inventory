// server/routes/staff.js
// Staff CRUD Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/staff?search=&status=
router.get('/', (req, res, next) => {
  try {
    const { search, status } = req.query;
    const staff = db.getStaff({
      search: search || undefined,
      status: status || undefined,
    });
    res.json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/:id
router.get('/:id', (req, res, next) => {
  try {
    const staff = db.getStaffById(Number(req.params.id));
    if (!staff) {
      return res.status(404).json({ success: false, error: 'ไม่พบเจ้าหน้าที่' });
    }
    res.json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff — admin only
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { name, position = '', department = '', phone = '' } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อเจ้าหน้าที่' });
    }
    const staff = db.createStaff({ name, position, department, phone });
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

// PUT /api/staff/:id — admin only
router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getStaffById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบเจ้าหน้าที่' });
    }

    const updated = db.updateStaff(id, {
      name: req.body.name ?? existing.name,
      position: req.body.position ?? existing.position,
      department: req.body.department ?? existing.department,
      phone: req.body.phone ?? existing.phone,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/staff/:id — admin only
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getStaffById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบเจ้าหน้าที่' });
    }

    const result = db.deleteStaff(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;