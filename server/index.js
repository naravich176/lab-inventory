// server/index.js
// Express.js API Server สำหรับระบบจัดการคลังแล็บ

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const itemRoutes = require('./routes/items');
const staffRoutes = require('./routes/staff');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const procurementRoutes = require('./routes/procurement');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================

// CORS — อนุญาตทุก origin (ปรับ production ให้เฉพาะเจาะจง)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON body
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('th-TH');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// Routes
// ============================================================

// Health check (ไม่ต้อง auth)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/procurement', procurementRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `ไม่พบ endpoint: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler (ต้องอยู่หลังสุด)
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'lab-inventory.db');
db.initDatabase(dbPath);

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🧪 Lab Inventory API Server               ║');
  console.log(`║   🌐 http://localhost:${PORT}                  ║`);
  console.log(`║   📁 Database: ${path.basename(dbPath)}       ║`);
  console.log('║   🔑 Default: admin / admin123               ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║   Endpoints:                                 ║');
  console.log('║   POST   /api/auth/login                     ║');
  console.log('║   GET    /api/auth/me                        ║');
  console.log('║   GET    /api/categories                     ║');
  console.log('║   GET    /api/items                          ║');
  console.log('║   GET    /api/staff                          ║');
  console.log('║   GET    /api/transactions                   ║');
  console.log('║   GET    /api/reports/dashboard               ║');
  console.log('║   GET    /api/health                         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  db.closeDatabase();
  process.exit(0);
});