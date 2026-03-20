// server/middleware/auth.js
// JWT Authentication & Role Authorization Middleware

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lab-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// สร้าง JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Middleware: ตรวจสอบ JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'กรุณาเข้าสู่ระบบ (ไม่พบ token)',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token ไม่ถูกต้องหรือหมดอายุ',
    });
  }
}

// Middleware: ตรวจสอบว่าเป็น admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'ต้องเป็นผู้ดูแลระบบเท่านั้น',
    });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireAdmin,
};