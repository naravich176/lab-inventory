// server/routes/auth.js
// Authentication Routes: login, me, change-password

const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
      });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'บัญชีนี้ถูกระงับ',
      });
    }

    const valid = db.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', authenticateToken, (req, res, next) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบผู้ใช้',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password — เปลี่ยนรหัสผ่าน
router.put('/change-password', authenticateToken, (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่',
      });
    }

    if (new_password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร',
      });
    }

    // ตรวจสอบรหัสผ่านเดิม
    const user = db.getUserByUsername(req.user.username);
    const valid = db.verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'รหัสผ่านเดิมไม่ถูกต้อง',
      });
    }

    const updated = db.updatePassword(req.user.id, new_password);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;