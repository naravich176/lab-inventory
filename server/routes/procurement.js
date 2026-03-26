// server/routes/procurement.js
// Procurement Request Routes

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin, requireStaffOrAdmin, requireProcurementOrAdmin } = require('../middleware/auth');

// ทุก route ต้อง login
router.use(authenticateToken);

// GET /api/procurement — ดูรายการจัดซื้อ (ทุก role)
router.get('/', (req, res, next) => {
  try {
    const { status, requested_by, search, page = 1, limit = 20 } = req.query;
    const result = db.getProcurementRequests({
      status: status || undefined,
      requested_by: requested_by ? Number(requested_by) : undefined,
      search: search || undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/procurement/:id — ดูรายละเอียดรายการเดียว (ทุก role)
router.get('/:id', (req, res, next) => {
  try {
    const request = db.getProcurementRequestById(Number(req.params.id));
    if (!request) {
      return res.status(404).json({ success: false, error: 'ไม่พบคำขอจัดซื้อ' });
    }
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

// POST /api/procurement — สร้างคำขอจัดซื้อ (staff + admin)
router.post('/', requireStaffOrAdmin, (req, res, next) => {
  try {
    const { item_id, item_name, quantity, unit, reason } = req.body;

    if (!item_name) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อวัสดุ',
      });
    }

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนต้องมากกว่า 0',
      });
    }

    const request = db.createProcurementRequest({
      item_id: item_id ? Number(item_id) : null,
      item_name,
      quantity: Number(quantity),
      unit: unit || 'ชิ้น',
      reason: reason || '',
      requested_by: req.user.id,
    });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

// PUT /api/procurement/:id/status — อัพเดตสถานะ (procurement + admin)
router.put('/:id/status', requireProcurementOrAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status, note } = req.body;

    const validStatuses = ['requested', 'ordering', 'shipping', 'delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'สถานะต้องเป็น requested, ordering, shipping หรือ delivered',
      });
    }

    const updated = db.updateProcurementStatus(id, { status, note });
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message.includes('ไม่พบ')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// PUT /api/procurement/:id/receive — ยืนยันรับพัสดุ (staff + admin)
router.put('/:id/receive', requireStaffOrAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { new_item } = req.body;

    const result = db.confirmReceived(id, req.user.id, new_item || null);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('ไม่พบ') || err.message.includes('ยืนยันรับได้เฉพาะ') || err.message.includes('วัสดุใหม่ต้อง') || err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// DELETE /api/procurement/:id — ลบคำขอ (admin เท่านั้น, เฉพาะ status=requested)
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = db.deleteProcurementRequest(id);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('ไม่พบ') || err.message.includes('ลบได้เฉพาะ')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
