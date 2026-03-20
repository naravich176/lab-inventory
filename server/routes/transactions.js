// server/routes/transactions.js
// Transaction Routes: withdraw, add-stock, list

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// POST /api/transactions/withdraw — ทุก role ทำได้
router.post('/withdraw', (req, res, next) => {
  try {
    const { item_id, staff_id, quantity, note = '' } = req.body;

    if (!item_id || !staff_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก item_id, staff_id, quantity',
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนต้องมากกว่า 0',
      });
    }

    const result = db.withdrawItem({
      item_id: Number(item_id),
      staff_id: Number(staff_id),
      quantity: Number(quantity),
      note,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    // withdrawItem throws เมื่อ stock ไม่พอ หรือไม่พบ item/staff
    if (err.message.includes('ไม่พบ') || err.message.includes('ไม่เพียงพอ')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// POST /api/transactions/add-stock — admin only
router.post('/add-stock', requireAdmin, (req, res, next) => {
  try {
    const { item_id, quantity, note = '' } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก item_id, quantity',
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนต้องมากกว่า 0',
      });
    }

    const result = db.addStock({
      item_id: Number(item_id),
      quantity: Number(quantity),
      note,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('ไม่พบ')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// GET /api/transactions?item_id=&staff_id=&type=&startDate=&endDate=&page=&limit=
router.get('/', (req, res, next) => {
  try {
    const { item_id, staff_id, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = db.getTransactions({
      item_id: item_id ? Number(item_id) : undefined,
      staff_id: staff_id ? Number(staff_id) : undefined,
      type: type || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;