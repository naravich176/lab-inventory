// server/routes/users.js
// User Management Routes (admin only) — รวม staff management เข้ามาด้วย

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ทุก route ต้อง login
router.use(authenticateToken);

// GET /api/users — list ทุก user (admin only for full list)
// GET /api/users?search=&status=active — ค้นหา + filter (ทุก role เข้าถึงได้ สำหรับ dropdown เลือกผู้ใช้)
router.get('/', (req, res, next) => {
  try {
    const { search, status } = req.query;
    const users = db.getUsers({
      search: search || undefined,
      status: status || undefined,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — สร้าง user ใหม่ (admin only)
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { username, password, display_name, role = 'staff', position = '', department = '', phone = '' } = req.body;

    if (!username || !password || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก username, password, display_name',
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร',
      });
    }

    if (!['admin', 'staff', 'procurement'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'role ต้องเป็น admin, staff หรือ procurement',
      });
    }

    const user = db.createUser({ username, password, display_name, role, position, department, phone });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.message.includes('มีอยู่แล้ว')) {
      return res.status(409).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// PUT /api/users/:id — admin แก้ไข display_name, role, status, position, department, phone
router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
    }

    const { display_name, role, status, position, department, phone } = req.body;

    if (role && !['admin', 'staff', 'procurement'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'role ต้องเป็น admin, staff หรือ procurement',
      });
    }

    const updated = db.updateUser(id, {
      display_name: display_name ?? user.display_name,
      role: role ?? user.role,
      status: status ?? user.status,
      position: position ?? user.position,
      department: department ?? user.department,
      phone: phone ?? user.phone,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/reset-password — admin reset password ให้ user
router.put('/:id/reset-password', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { new_password } = req.body;

    if (!new_password || new_password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร',
      });
    }

    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
    }

    const updated = db.updatePassword(id, new_password);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
