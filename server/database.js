// server/database.js
// SQLite Database Manager สำหรับระบบจัดการคลังแล็บ (Server Version)
// ปรับจาก electron/database.js — ลบ Electron dependency, เพิ่ม users table + auth

const path = require('path');
const bcrypt = require('bcryptjs');

let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('Failed to load better-sqlite3:', err);
}

let db = null;

const SALT_ROUNDS = 10;

// ============================================================
// 1) Initialize & Create Tables
// ============================================================
function initDatabase(dbPath) {
  // รับ path จากภายนอก หรือใช้ default ข้างๆ server
  const resolvedPath = dbPath || path.join(__dirname, 'lab-inventory.db');
  console.log('Database path:', resolvedPath);

  db = new Database(resolvedPath);

  // Enable WAL mode for better performance (รองรับ concurrent reads)
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  migrateSchema();
  seedDefaultCategories();
  seedDefaultAdmin();

  console.log('Database initialized successfully');
  return db;
}

function createTables() {
  db.exec(`
    -- หมวดหมู่พัสดุ
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      icon        TEXT    DEFAULT '',
      color       TEXT    DEFAULT '#4F46E5',
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    );

    -- รายการวัสดุ
    CREATE TABLE IF NOT EXISTS items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      cat_code      TEXT    NOT NULL UNIQUE,
      unit          TEXT    NOT NULL DEFAULT 'ชิ้น',
      min_stock     INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      category_id   INTEGER NOT NULL,
      description   TEXT    DEFAULT '',
      status        TEXT    DEFAULT 'active',
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    -- ผู้ใช้งานระบบ (รวม staff เข้ามาด้วย)
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'staff',
      position      TEXT    DEFAULT '',
      department    TEXT    DEFAULT '',
      phone         TEXT    DEFAULT '',
      status        TEXT    DEFAULT 'active',
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime'))
    );

    -- บันทึกการเบิกใช้
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id     INTEGER NOT NULL,
      user_id     INTEGER,
      quantity    INTEGER NOT NULL,
      type        TEXT    NOT NULL DEFAULT 'withdraw',
      note        TEXT    DEFAULT '',
      date        TEXT    DEFAULT (datetime('now','localtime')),
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (item_id) REFERENCES items(id)  ON DELETE RESTRICT,
      FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE RESTRICT
    );

    -- คำขอจัดซื้อ
    CREATE TABLE IF NOT EXISTS procurement_requests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER,
      item_name     TEXT    NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 1,
      unit          TEXT    DEFAULT 'ชิ้น',
      reason        TEXT    DEFAULT '',
      requested_by  INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'requested',
      note          TEXT    DEFAULT '',
      received_by       INTEGER DEFAULT NULL,
      received_at       TEXT DEFAULT NULL,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
      FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (received_by) REFERENCES users(id)
    );

    -- Indexes สำหรับ query ที่ใช้บ่อย
    CREATE INDEX IF NOT EXISTS idx_items_category    ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_status      ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_cat_code    ON items(cat_code);
    CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);
    CREATE INDEX IF NOT EXISTS idx_procurement_status ON procurement_requests(status);
    CREATE INDEX IF NOT EXISTS idx_procurement_requested_by ON procurement_requests(requested_by);

    -- แจ้งเตือน
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      item_id     INTEGER,
      is_read     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  `);

}

// ============================================================
// 1.5) Safe Migrations (ALTER TABLE ADD COLUMN ถ้ายังไม่มี)
// ============================================================
function migrateSchema() {
  const columns = db.prepare("PRAGMA table_info(items)").all().map(c => c.name);

  if (!columns.includes('expiry_date')) {
    db.exec("ALTER TABLE items ADD COLUMN expiry_date TEXT DEFAULT NULL");
    console.log('Migration: added items.expiry_date');
  }
  if (!columns.includes('expiry_alert_days')) {
    db.exec("ALTER TABLE items ADD COLUMN expiry_alert_days INTEGER DEFAULT 30");
    console.log('Migration: added items.expiry_alert_days');
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_items_expiry ON items(expiry_date)");
}

// ============================================================
// 2) Seed Defaults
// ============================================================
function seedDefaultCategories() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
  if (count.cnt > 0) return;

  const insert = db.prepare(`
    INSERT INTO categories (name, icon, color, sort_order) VALUES (?, ?, ?, ?)
  `);

  const defaults = [
    ['สารเคมี',           'flask',      '#EF4444', 1],
    ['วัสดุวิทยาศาสตร์',   'microscope', '#3B82F6', 2],
    ['วัสดุสำนักงาน',      'briefcase',  '#F59E0B', 3],
    ['วัสดุงานบ้าน',       'home',       '#10B981', 4],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(...row);
    }
  });

  insertMany(defaults);
  console.log('Default categories seeded');
}

function seedDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (count.cnt > 0) return;

  // สร้าง admin account เริ่มต้น
  const hash = bcrypt.hashSync('admin123', SALT_ROUNDS);
  db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, position, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin', hash, 'ผู้ดูแลระบบ', 'admin', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร');

  console.log('Default admin seeded (username: admin, password: admin123)');
}

// ============================================================
// 3) CRUD — Categories
// ============================================================
function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
}

function getCategoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function createCategory(data) {
  const stmt = db.prepare(`
    INSERT INTO categories (name, icon, color, sort_order)
    VALUES (@name, @icon, @color, @sort_order)
  `);
  const result = stmt.run(data);
  return { id: result.lastInsertRowid, ...data };
}

function updateCategory(id, data) {
  const stmt = db.prepare(`
    UPDATE categories
    SET name = @name, icon = @icon, color = @color, sort_order = @sort_order,
        updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  return stmt.run({ id, ...data });
}

function deleteCategory(id) {
  const itemCount = db.prepare('SELECT COUNT(*) as cnt FROM items WHERE category_id = ?').get(id);
  if (itemCount.cnt > 0) {
    throw new Error(`ไม่สามารถลบหมวดหมู่ได้ เพราะยังมีวัสดุ ${itemCount.cnt} รายการอยู่`);
  }
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

// ============================================================
// 4) CRUD — Items
// ============================================================
function getItems({ categoryId, search, status, stockStatus, sort, page = 1, limit = 20 } = {}) {
  let where = ['1=1'];
  let params = {};

  // Default to showing only active items unless a specific status is requested
  if (status) {
    where.push('i.status = @status');
    params.status = status;
  } else {
    where.push("i.status = 'active'");
  }

  if (categoryId) {
    where.push('i.category_id = @categoryId');
    params.categoryId = categoryId;
  }
  if (search) {
    where.push('(i.name LIKE @search OR i.cat_code LIKE @search)');
    params.search = `%${search}%`;
  }
  if (stockStatus === 'out') {
    where.push('i.current_stock <= 0');
  } else if (stockStatus === 'low') {
    where.push('i.current_stock > 0 AND i.current_stock <= i.min_stock');
  } else if (stockStatus === 'normal') {
    where.push('i.current_stock > i.min_stock');
  } else if (stockStatus === 'expiring') {
    where.push("i.expiry_date IS NOT NULL AND i.expiry_date <= date('now', '+' || i.expiry_alert_days || ' days', 'localtime')");
  }

  const sortMap = {
    'name_asc': 'i.name ASC',
    'stock_asc': 'i.current_stock ASC',
    'stock_desc': 'i.current_stock DESC',
    'updated_desc': 'i.updated_at DESC',
  };
  const orderBy = sortMap[sort] || 'i.id DESC';

  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM items i WHERE ${whereClause}
  `).get(params);

  const items = db.prepare(`
    SELECT i.*, c.name as category_name, c.color as category_color
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  return {
    items,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  };
}

function getItemById(id) {
  return db.prepare(`
    SELECT i.*, c.name as category_name, c.color as category_color
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(id);
}

function createItem(data) {
  const stmt = db.prepare(`
    INSERT INTO items (name, cat_code, unit, min_stock, current_stock, category_id, description, expiry_date, expiry_alert_days)
    VALUES (@name, @cat_code, @unit, @min_stock, @current_stock, @category_id, @description, @expiry_date, @expiry_alert_days)
  `);
  const result = stmt.run({
    ...data,
    expiry_date: data.expiry_date || null,
    expiry_alert_days: data.expiry_alert_days ?? 30,
  });
  return getItemById(result.lastInsertRowid);
}

function updateItem(id, data) {
  const stmt = db.prepare(`
    UPDATE items
    SET name = @name, cat_code = @cat_code, unit = @unit,
        min_stock = @min_stock, current_stock = @current_stock,
        category_id = @category_id, description = @description,
        expiry_date = @expiry_date, expiry_alert_days = @expiry_alert_days,
        updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  stmt.run({
    id,
    ...data,
    expiry_date: data.expiry_date || null,
    expiry_alert_days: data.expiry_alert_days ?? 30,
  });
  return getItemById(id);
}

function deleteItem(id) {
  const txnCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE item_id = ?').get(id);
  if (txnCount.cnt > 0) {
    db.prepare("UPDATE items SET status = 'inactive', updated_at = datetime('now','localtime') WHERE id = ?").run(id);
    return { softDeleted: true };
  }
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return { deleted: true };
}

// ============================================================
// 5) Transactions — เบิกใช้วัสดุ
// ============================================================
function withdrawItem({ item_id, user_id, quantity, note = '' }) {
  const withdraw = db.transaction(() => {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) throw new Error('ไม่พบรายการวัสดุ');
    if (item.current_stock < quantity) {
      throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${item.current_stock} ${item.unit})`);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) throw new Error('ไม่พบผู้ใช้');

    const txnStmt = db.prepare(`
      INSERT INTO transactions (item_id, user_id, quantity, type, note)
      VALUES (@item_id, @user_id, @quantity, 'withdraw', @note)
    `);
    const txnResult = txnStmt.run({ item_id, user_id, quantity, note });

    db.prepare(`
      UPDATE items
      SET current_stock = current_stock - @quantity,
          updated_at = datetime('now','localtime')
      WHERE id = @item_id
    `).run({ quantity, item_id });

    const updatedItem = getItemById(item_id);
    const transaction = db.prepare(`
      SELECT t.*, i.name as item_name, u.display_name as user_name, u.department as user_department
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(txnResult.lastInsertRowid);

    return { transaction, item: updatedItem };
  });

  return withdraw();
}

function addStock({ item_id, quantity, note = '', user_id = null }) {
  const add = db.transaction(() => {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) throw new Error('ไม่พบรายการวัสดุ');

    db.prepare(`
      INSERT INTO transactions (item_id, user_id, quantity, type, note)
      VALUES (@item_id, @user_id, @quantity, 'add', @note)
    `).run({ item_id, user_id, quantity, note });

    db.prepare(`
      UPDATE items
      SET current_stock = current_stock + @quantity,
          updated_at = datetime('now','localtime')
      WHERE id = @item_id
    `).run({ quantity, item_id });

    return getItemById(item_id);
  });

  return add();
}

function getTransactions({ item_id, user_id, type, startDate, endDate, page = 1, limit = 50 } = {}) {
  let where = ['1=1'];
  let params = {};

  if (item_id) {
    where.push('t.item_id = @item_id');
    params.item_id = item_id;
  }
  if (user_id) {
    where.push('t.user_id = @user_id');
    params.user_id = user_id;
  }
  if (type) {
    where.push('t.type = @type');
    params.type = type;
  }
  if (startDate) {
    where.push('t.date >= @startDate');
    params.startDate = startDate;
  }
  if (endDate) {
    where.push('t.date <= @endDate');
    params.endDate = endDate;
  }

  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM transactions t WHERE ${whereClause}
  `).get(params);

  const transactions = db.prepare(`
    SELECT t.*, i.name as item_name, i.unit as item_unit,
           u.display_name as user_name, u.department as user_department
    FROM transactions t
    LEFT JOIN items i ON t.item_id = i.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE ${whereClause}
    ORDER BY t.date DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  return {
    transactions,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  };
}

// ============================================================
// 7) Dashboard / Reports
// ============================================================
function getLowStockItems() {
  return db.prepare(`
    SELECT i.*, c.name as category_name, c.color as category_color
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.current_stock <= i.min_stock AND i.status = 'active'
    ORDER BY (i.current_stock * 1.0 / MAX(i.min_stock, 1)) ASC
  `).all();
}

function getExpiringItems() {
  return db.prepare(`
    SELECT i.*, c.name as category_name, c.color as category_color
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.expiry_date IS NOT NULL
      AND i.status = 'active'
      AND i.expiry_date <= date('now', '+' || i.expiry_alert_days || ' days', 'localtime')
    ORDER BY i.expiry_date ASC
  `).all();
}

function getMonthlySummary(year, month) {
  return db.prepare(`
    SELECT
      t.item_id,
      i.name as item_name,
      i.unit,
      c.name as category_name,
      SUM(CASE WHEN t.type = 'withdraw' THEN t.quantity ELSE 0 END) as total_withdrawn,
      SUM(CASE WHEN t.type = 'add' THEN t.quantity ELSE 0 END) as total_added,
      COUNT(*) as transaction_count
    FROM transactions t
    JOIN items i ON t.item_id = i.id AND i.status = 'active'
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE strftime('%Y', t.date) = @year
      AND strftime('%m', t.date) = @month
    GROUP BY t.item_id
    ORDER BY total_withdrawn DESC
  `).all({ year: String(year), month: String(month).padStart(2, '0') });
}

function deleteMonthlyTransactions(itemId, year, month) {
  const result = db.prepare(`
    DELETE FROM transactions
    WHERE item_id = @itemId
      AND strftime('%Y', date) = @year
      AND strftime('%m', date) = @month
  `).run({ itemId, year: String(year), month: String(month).padStart(2, '0') });
  return result.changes;
}

function getDashboardStats() {
  const totalItems = db.prepare("SELECT COUNT(*) as cnt FROM items WHERE status = 'active'").get().cnt;
  const lowStockCount = db.prepare("SELECT COUNT(*) as cnt FROM items WHERE current_stock <= min_stock AND status = 'active'").get().cnt;
  const totalStaff = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status = 'active'").get().cnt;
  const todayTransactions = db.prepare(`
    SELECT COUNT(*) as cnt FROM transactions
    WHERE date(date) = date('now','localtime')
  `).get().cnt;

  return { totalItems, lowStockCount, totalStaff, todayTransactions };
}

// ============================================================
// 8) Users / Auth (ใหม่)
// ============================================================
function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  // ไม่ส่ง password_hash กลับ
  return db.prepare(`
    SELECT id, username, display_name, role, position, department, phone, status, created_at, updated_at
    FROM users WHERE id = ?
  `).get(id);
}

function getUsers({ search, status } = {}) {
  let where = ['1=1'];
  let params = {};

  if (search) {
    where.push('(display_name LIKE @search OR department LIKE @search OR username LIKE @search)');
    params.search = `%${search}%`;
  }
  if (status) {
    where.push('status = @status');
    params.status = status;
  }

  return db.prepare(`
    SELECT id, username, display_name, role, position, department, phone, status, created_at, updated_at
    FROM users WHERE ${where.join(' AND ')} ORDER BY display_name ASC
  `).all(params);
}

function createUser({ username, password, display_name, role = 'staff', position = '', department = '', phone = '' }) {
  const existing = getUserByUsername(username);
  if (existing) {
    throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, position, department, phone)
    VALUES (@username, @password_hash, @display_name, @role, @position, @department, @phone)
  `);
  const result = stmt.run({
    username,
    password_hash: hash,
    display_name,
    role,
    position,
    department,
    phone,
  });
  return getUserById(result.lastInsertRowid);
}

function updateUser(id, data) {
  const user = getUserById(id);
  if (!user) throw new Error('ไม่พบผู้ใช้');

  const stmt = db.prepare(`
    UPDATE users
    SET display_name = @display_name, role = @role, status = @status,
        position = @position, department = @department, phone = @phone,
        updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  stmt.run({
    id,
    display_name: data.display_name ?? user.display_name,
    role: data.role ?? user.role,
    status: data.status ?? user.status,
    position: data.position ?? user.position,
    department: data.department ?? user.department,
    phone: data.phone ?? user.phone,
  });
  return getUserById(id);
}

function updatePassword(id, newPassword) {
  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  db.prepare(`
    UPDATE users
    SET password_hash = @hash, updated_at = datetime('now','localtime')
    WHERE id = @id
  `).run({ id, hash });
  return getUserById(id);
}

function verifyPassword(plainPassword, hash) {
  return bcrypt.compareSync(plainPassword, hash);
}

// ============================================================
// 9) Procurement Requests
// ============================================================
function createProcurementRequest(data) {
  const stmt = db.prepare(`
    INSERT INTO procurement_requests (item_id, item_name, quantity, unit, reason, requested_by)
    VALUES (@item_id, @item_name, @quantity, @unit, @reason, @requested_by)
  `);
  const result = stmt.run({
    item_id: data.item_id || null,
    item_name: data.item_name,
    quantity: data.quantity || 1,
    unit: data.unit || 'ชิ้น',
    reason: data.reason || '',
    requested_by: data.requested_by,
  });
  return getProcurementRequestById(result.lastInsertRowid);
}

function getProcurementRequests({ status, requested_by, search, page = 1, limit = 20 } = {}) {
  let where = ['1=1'];
  let params = {};

  if (status) {
    where.push('pr.status = @status');
    params.status = status;
  }
  if (requested_by) {
    where.push('pr.requested_by = @requested_by');
    params.requested_by = requested_by;
  }
  if (search) {
    where.push("(pr.item_name LIKE @search OR EXISTS (SELECT 1 FROM items i2 WHERE i2.id = pr.item_id AND i2.cat_code LIKE @search))");
    params.search = `%${search}%`;
  }

  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM procurement_requests pr WHERE ${whereClause}
  `).get(params);

  const requests = db.prepare(`
    SELECT pr.*, u.display_name as requested_by_name,
           u2.display_name as received_by_name,
           i.cat_code as cat_code
    FROM procurement_requests pr
    LEFT JOIN users u ON pr.requested_by = u.id
    LEFT JOIN users u2 ON pr.received_by = u2.id
    LEFT JOIN items i ON pr.item_id = i.id
    WHERE ${whereClause}
    ORDER BY pr.id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  return {
    requests,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  };
}

function getProcurementRequestById(id) {
  return db.prepare(`
    SELECT pr.*, u.display_name as requested_by_name,
           u2.display_name as received_by_name,
           i.cat_code as cat_code
    FROM procurement_requests pr
    LEFT JOIN users u ON pr.requested_by = u.id
    LEFT JOIN users u2 ON pr.received_by = u2.id
    LEFT JOIN items i ON pr.item_id = i.id
    WHERE pr.id = ?
  `).get(id);
}

const procurementStatusLabels = {
  requested: 'แจ้งคำขอ',
  ordering: 'กำลังสั่งซื้อ',
  shipping: 'ระหว่างจัดส่ง',
  delivered: 'ส่งถึงแล้ว',
  received: 'รับแล้ว',
};

function createProcurementNotification(request, newStatus) {
  const label = procurementStatusLabels[newStatus] || newStatus;
  db.prepare(`
    INSERT INTO notifications (type, title, message, item_id)
    VALUES (@type, @title, @message, @item_id)
  `).run({
    type: 'procurement_status',
    title: `จัดซื้อ: ${label}`,
    message: `${request.item_name} (จำนวน ${request.quantity} ${request.unit}) — สถานะเปลี่ยนเป็น "${label}"`,
    item_id: request.item_id || null,
  });
}

function updateProcurementStatus(id, { status, note }) {
  const existing = getProcurementRequestById(id);
  if (!existing) throw new Error('ไม่พบคำขอจัดซื้อ');

  db.prepare(`
    UPDATE procurement_requests
    SET status = @status, note = @note, updated_at = datetime('now','localtime')
    WHERE id = @id
  `).run({
    id,
    status,
    note: note ?? existing.note,
  });

  createProcurementNotification(existing, status);

  return getProcurementRequestById(id);
}

function confirmReceived(id, userId, newItemData) {
  const confirm = db.transaction(() => {
    const existing = getProcurementRequestById(id);
    if (!existing) throw new Error('ไม่พบคำขอจัดซื้อ');
    if (existing.status !== 'delivered') {
      throw new Error('ยืนยันรับได้เฉพาะคำขอที่มีสถานะ "ส่งถึงแล้ว" เท่านั้น');
    }

    if (existing.item_id) {
      // วัสดุมีอยู่ในระบบแล้ว → addStock
      addStock({
        item_id: existing.item_id,
        quantity: existing.quantity,
        note: `รับพัสดุจากคำขอจัดซื้อ #${id}`,
        user_id: userId,
      });
    } else if (newItemData) {
      // วัสดุใหม่ → สร้าง item แล้ว addStock
      const newItem = createItem({
        name: newItemData.name,
        cat_code: newItemData.cat_code,
        unit: newItemData.unit || existing.unit,
        min_stock: newItemData.min_stock || 0,
        current_stock: 0,
        category_id: newItemData.category_id,
        description: newItemData.description || '',
        expiry_date: newItemData.expiry_date || null,
        expiry_alert_days: newItemData.expiry_alert_days || 30,
      });
      // addStock เพื่อบันทึกประวัติการรับเข้า
      addStock({
        item_id: newItem.id,
        quantity: existing.quantity,
        note: `รับพัสดุจากคำขอจัดซื้อ #${id} (วัสดุใหม่)`,
        user_id: userId,
      });
      // อัพเดต item_id ใน procurement request
      db.prepare('UPDATE procurement_requests SET item_id = ? WHERE id = ?').run(newItem.id, id);
    } else {
      throw new Error('วัสดุใหม่ต้องกรอกข้อมูลสร้างรายการวัสดุ');
    }

    // เปลี่ยนสถานะเป็น received + บันทึกผู้ยืนยัน
    db.prepare(`
      UPDATE procurement_requests
      SET status = 'received',
          received_by = @userId,
          received_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
      WHERE id = @id
    `).run({ id, userId });

    createProcurementNotification(existing, 'received');

    return getProcurementRequestById(id);
  });

  return confirm();
}

function deleteProcurementRequest(id) {
  const existing = getProcurementRequestById(id);
  if (!existing) throw new Error('ไม่พบคำขอจัดซื้อ');
  if (existing.status !== 'requested') {
    throw new Error('ลบได้เฉพาะคำขอที่มีสถานะ "แจ้งคำขอ" เท่านั้น');
  }
  db.prepare('DELETE FROM procurement_requests WHERE id = ?').run(id);
  return { deleted: true };
}

// ============================================================
// 10) Notifications
// ============================================================
function generateNotifications() {
  const generate = db.transaction(() => {
    // ลบ notification ที่อ่านแล้วทั้งหมดอัตโนมัติ
    db.prepare("DELETE FROM notifications WHERE is_read = 1").run();

    let generated = 0;

    // Helper: สร้าง notification ถ้ายังไม่มี unread ของ item+type เดียวกัน
    const existsUnread = db.prepare(
      'SELECT COUNT(*) as cnt FROM notifications WHERE item_id = @item_id AND type = @type AND is_read = 0'
    );
    const insertNotif = db.prepare(`
      INSERT INTO notifications (type, title, message, item_id)
      VALUES (@type, @title, @message, @item_id)
    `);

    // out_of_stock: current_stock = 0
    const outOfStock = db.prepare(
      "SELECT * FROM items WHERE current_stock = 0 AND status = 'active'"
    ).all();
    for (const item of outOfStock) {
      if (existsUnread.get({ item_id: item.id, type: 'out_of_stock' }).cnt === 0) {
        insertNotif.run({
          type: 'out_of_stock',
          title: 'สต็อกหมด',
          message: `${item.name} (${item.cat_code}) — สต็อกหมดแล้ว`,
          item_id: item.id,
        });
        generated++;
      }
    }

    // low_stock: current_stock > 0 AND current_stock <= min_stock
    const lowStock = db.prepare(
      "SELECT * FROM items WHERE current_stock > 0 AND current_stock <= min_stock AND status = 'active'"
    ).all();
    for (const item of lowStock) {
      if (existsUnread.get({ item_id: item.id, type: 'low_stock' }).cnt === 0) {
        insertNotif.run({
          type: 'low_stock',
          title: 'สต็อกใกล้หมด',
          message: `${item.name} (${item.cat_code}) — เหลือ ${item.current_stock}/${item.min_stock} ${item.unit}`,
          item_id: item.id,
        });
        generated++;
      }
    }

    // expired: expiry_date < date('now')
    const expired = db.prepare(
      "SELECT * FROM items WHERE expiry_date IS NOT NULL AND expiry_date < date('now','localtime') AND status = 'active'"
    ).all();
    for (const item of expired) {
      if (existsUnread.get({ item_id: item.id, type: 'expired' }).cnt === 0) {
        insertNotif.run({
          type: 'expired',
          title: 'หมดอายุแล้ว',
          message: `${item.name} (${item.cat_code}) — หมดอายุวันที่ ${item.expiry_date}`,
          item_id: item.id,
        });
        generated++;
      }
    }

    // expiring: within alert window but not yet expired
    const expiring = db.prepare(`
      SELECT * FROM items
      WHERE expiry_date IS NOT NULL
        AND expiry_date >= date('now','localtime')
        AND expiry_date <= date('now', '+' || expiry_alert_days || ' days', 'localtime')
        AND status = 'active'
    `).all();
    for (const item of expiring) {
      if (existsUnread.get({ item_id: item.id, type: 'expiring' }).cnt === 0) {
        insertNotif.run({
          type: 'expiring',
          title: 'ใกล้หมดอายุ',
          message: `${item.name} (${item.cat_code}) — หมดอายุวันที่ ${item.expiry_date}`,
          item_id: item.id,
        });
        generated++;
      }
    }

    return generated;
  });

  return generate();
}

function getNotifications({ is_read, type } = {}) {
  let where = ['1=1'];
  let params = {};

  if (is_read !== undefined && is_read !== null && is_read !== '') {
    where.push('n.is_read = @is_read');
    params.is_read = Number(is_read);
  }
  if (type) {
    where.push('n.type = @type');
    params.type = type;
  }

  return db.prepare(`
    SELECT n.*, i.name as item_name, i.cat_code
    FROM notifications n
    LEFT JOIN items i ON n.item_id = i.id
    WHERE ${where.join(' AND ')}
    ORDER BY n.created_at DESC
    LIMIT 200
  `).all(params);
}

function getUnreadCount() {
  return db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;
}

function markNotificationAsRead(id) {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
  return db.prepare(`
    SELECT n.*, i.name as item_name, i.cat_code
    FROM notifications n
    LEFT JOIN items i ON n.item_id = i.id
    WHERE n.id = ?
  `).get(id);
}

function markAllNotificationsAsRead() {
  const result = db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run();
  return result.changes;
}

function deleteOldNotifications(days = 30) {
  const result = db.prepare(`
    DELETE FROM notifications
    WHERE is_read = 1 AND created_at < datetime('now', '-' || @days || ' days', 'localtime')
  `).run({ days });
  return result.changes;
}

// ============================================================
// 11) Close DB
// ============================================================
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

// ============================================================
// Export
// ============================================================
module.exports = {
  initDatabase,
  closeDatabase,
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  // Items
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  // Transactions
  withdrawItem,
  addStock,
  getTransactions,
  // Reports
  getLowStockItems,
  getExpiringItems,
  getMonthlySummary,
  deleteMonthlyTransactions,
  getDashboardStats,
  // Users / Auth
  getUserByUsername,
  getUserById,
  getUsers,
  createUser,
  updateUser,
  updatePassword,
  verifyPassword,
  // Procurement
  createProcurementRequest,
  getProcurementRequests,
  getProcurementRequestById,
  updateProcurementStatus,
  confirmReceived,
  deleteProcurementRequest,
  // Notifications
  generateNotifications,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteOldNotifications,
};