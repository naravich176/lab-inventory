// server/routes/reports.js
// Report Routes: low-stock, monthly summary, dashboard stats

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ทุก report ต้อง login (ทั้ง admin + user ดูได้)
router.use(authenticateToken);

// GET /api/reports/low-stock
router.get('/low-stock', (req, res, next) => {
  try {
    const items = db.getLowStockItems();
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly?year=&month=
router.get('/monthly', (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ year และ month',
      });
    }

    const summary = db.getMonthlySummary(Number(year), Number(month));
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/dashboard
router.get('/dashboard', (req, res, next) => {
  try {
    const stats = db.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;