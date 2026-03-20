// server/middleware/errorHandler.js
// Global Error Handler Middleware

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // ถ้า error มี statusCode ให้ใช้ ไม่งั้นใช้ 500
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
}

module.exports = errorHandler;