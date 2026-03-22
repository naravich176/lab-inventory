// server/routes/notifications.js
// Notification Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ทุก route ต้อง login
router.use(authenticateToken);

// GET /api/notifications — ดูรายการแจ้งเตือน (filter: is_read, type)
router.get('/', (req, res, next) => {
  try {
    const { is_read, type } = req.query;
    const notifications = db.getNotifications({ is_read, type });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

// GET /api/notifications/unread-count — นับจำนวนยังไม่อ่าน
router.get('/unread-count', (req, res, next) => {
  try {
    const count = db.getUnreadCount();
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

// POST /api/notifications/generate — สร้าง notifications ใหม่จากข้อมูลปัจจุบัน
router.post('/generate', (req, res, next) => {
  try {
    const generated = db.generateNotifications();
    res.json({ success: true, data: { generated } });
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all — mark ทั้งหมดเป็นอ่านแล้ว
router.put('/read-all', (req, res, next) => {
  try {
    const updated = db.markAllNotificationsAsRead();
    res.json({ success: true, data: { updated } });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read — mark เป็นอ่านแล้ว
router.put('/:id/read', (req, res, next) => {
  try {
    const notification = db.markNotificationAsRead(Number(req.params.id));
    if (!notification) {
      return res.status(404).json({ success: false, error: 'ไม่พบการแจ้งเตือน' });
    }
    res.json({ success: true, data: notification });
  } catch (err) { next(err); }
});

module.exports = router;
