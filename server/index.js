// server/index.js
// Express.js API Server สำหรับระบบจัดการคลังแล็บ

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const itemRoutes = require('./routes/items');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const procurementRoutes = require('./routes/procurement');
const notificationRoutes = require('./routes/notifications');

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
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `ไม่พบ endpoint: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// Serve Frontend (Production Build)
// ============================================================

const frontendPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // SPA fallback — ทุก route ที่ไม่ใช่ /api ให้ส่ง index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  console.log(`[Static] Serving frontend from ${frontendPath}`);
}

// Global error handler (ต้องอยู่หลังสุด)
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'lab-inventory.db');
db.initDatabase(dbPath);

const hasFrontend = fs.existsSync(frontendPath);

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🧪 Lab Inventory Server                   ║');
  console.log(`║   🌐 http://localhost:${PORT}                  ║`);
  console.log(`║   📁 Database: ${path.basename(dbPath)}       ║`);
  console.log(`║   🖥️  Frontend: ${hasFrontend ? 'Serving from dist/' : 'Not built (run pnpm build)'}  ║`);
  console.log('║   🔑 Default: admin / admin123               ║');
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