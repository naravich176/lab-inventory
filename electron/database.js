// electron/database.js
// SQLite Database Manager สำหรับระบบจัดการคลังแล็บ
// ใช้ better-sqlite3 (synchronous API)

const path = require('path');
const { app } = require('electron');

let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('Failed to load better-sqlite3:', err);
}

let db = null;

// ============================================================
// 1) Initialize & Create Tables
// ============================================================
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'lab-inventory.db');
  console.log('Database path:', dbPath);

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedDefaultCategories();

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

    -- เจ้าหน้าที่
    CREATE TABLE IF NOT EXISTS staff (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      position    TEXT    DEFAULT '',
      department  TEXT    DEFAULT '',
      phone       TEXT    DEFAULT '',
      status      TEXT    DEFAULT 'active',
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    );

    -- บันทึกการเบิกใช้
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id     INTEGER NOT NULL,
      staff_id    INTEGER NOT NULL,
      quantity    INTEGER NOT NULL,
      type        TEXT    NOT NULL DEFAULT 'withdraw',
      note        TEXT    DEFAULT '',
      date        TEXT    DEFAULT (datetime('now','localtime')),
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (item_id)  REFERENCES items(id)  ON DELETE RESTRICT,
      FOREIGN KEY (staff_id) REFERENCES staff(id)   ON DELETE RESTRICT
    );

    -- Indexes สำหรับ query ที่ใช้บ่อย
    CREATE INDEX IF NOT EXISTS idx_items_category    ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_status      ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_cat_code    ON items(cat_code);
    CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_staff_status      ON staff(status);
  `);
}

// ============================================================
// 2) Seed Default Categories (4 หมวดตาม design)
// ============================================================
function seedDefaultCategories() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
  if (count.cnt > 0) return; // already seeded

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
  // ตรวจสอบว่ามี items อยู่ในหมวดนี้หรือไม่
  const itemCount = db.prepare('SELECT COUNT(*) as cnt FROM items WHERE category_id = ?').get(id);
  if (itemCount.cnt > 0) {
    throw new Error(`ไม่สามารถลบหมวดหมู่ได้ เพราะยังมีวัสดุ ${itemCount.cnt} รายการอยู่`);
  }
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

// ============================================================
// 4) CRUD — Items
// ============================================================
function getItems({ categoryId, search, status, page = 1, limit = 20 } = {}) {
  let where = ['1=1'];
  let params = {};

  if (categoryId) {
    where.push('i.category_id = @categoryId');
    params.categoryId = categoryId;
  }
  if (search) {
    where.push('(i.name LIKE @search OR i.cat_code LIKE @search)');
    params.search = `%${search}%`;
  }
  if (status) {
    where.push('i.status = @status');
    params.status = status;
  }

  const whereClause = where.join(' AND ');
  const offset = (page - 1) * limit;

  // Total count
  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM items i WHERE ${whereClause}
  `).get(params);

  // Data with category join
  const items = db.prepare(`
    SELECT i.*, c.name as category_name, c.color as category_color
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE ${whereClause}
    ORDER BY i.id DESC
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
    INSERT INTO items (name, cat_code, unit, min_stock, current_stock, category_id, description)
    VALUES (@name, @cat_code, @unit, @min_stock, @current_stock, @category_id, @description)
  `);
  const result = stmt.run(data);
  return getItemById(result.lastInsertRowid);
}

function updateItem(id, data) {
  const stmt = db.prepare(`
    UPDATE items
    SET name = @name, cat_code = @cat_code, unit = @unit,
        min_stock = @min_stock, current_stock = @current_stock,
        category_id = @category_id, description = @description,
        updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  stmt.run({ id, ...data });
  return getItemById(id);
}

function deleteItem(id) {
  const txnCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE item_id = ?').get(id);
  if (txnCount.cnt > 0) {
    // Soft delete — มีประวัติการเบิกอยู่
    db.prepare("UPDATE items SET status = 'inactive', updated_at = datetime('now','localtime') WHERE id = ?").run(id);
    return { softDeleted: true };
  }
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return { deleted: true };
}

// ============================================================
// 5) CRUD — Staff
// ============================================================
function getStaff({ search, status } = {}) {
  let where = ['1=1'];
  let params = {};

  if (search) {
    where.push('(name LIKE @search OR department LIKE @search)');
    params.search = `%${search}%`;
  }
  if (status) {
    where.push('status = @status');
    params.status = status;
  }

  return db.prepare(`
    SELECT * FROM staff WHERE ${where.join(' AND ')} ORDER BY name ASC
  `).all(params);
}

function getStaffById(id) {
  return db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
}

function createStaff(data) {
  const stmt = db.prepare(`
    INSERT INTO staff (name, position, department, phone)
    VALUES (@name, @position, @department, @phone)
  `);
  const result = stmt.run(data);
  return getStaffById(result.lastInsertRowid);
}

function updateStaff(id, data) {
  const stmt = db.prepare(`
    UPDATE staff
    SET name = @name, position = @position, department = @department,
        phone = @phone, updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  stmt.run({ id, ...data });
  return getStaffById(id);
}

function deleteStaff(id) {
  const txnCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE staff_id = ?').get(id);
  if (txnCount.cnt > 0) {
    db.prepare("UPDATE staff SET status = 'inactive', updated_at = datetime('now','localtime') WHERE id = ?").run(id);
    return { softDeleted: true };
  }
  db.prepare('DELETE FROM staff WHERE id = ?').run(id);
  return { deleted: true };
}

// ============================================================
// 6) Transactions — เบิกใช้วัสดุ
// ============================================================
function withdrawItem({ item_id, staff_id, quantity, note = '' }) {
  // ใช้ transaction เพื่อความ atomic
  const withdraw = db.transaction(() => {
    // ตรวจสอบ stock
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) throw new Error('ไม่พบรายการวัสดุ');
    if (item.current_stock < quantity) {
      throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${item.current_stock} ${item.unit})`);
    }

    // ตรวจสอบเจ้าหน้าที่
    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id);
    if (!staff) throw new Error('ไม่พบเจ้าหน้าที่');

    // บันทึก transaction
    const txnStmt = db.prepare(`
      INSERT INTO transactions (item_id, staff_id, quantity, type, note)
      VALUES (@item_id, @staff_id, @quantity, 'withdraw', @note)
    `);
    const txnResult = txnStmt.run({ item_id, staff_id, quantity, note });

    // ลด stock
    db.prepare(`
      UPDATE items
      SET current_stock = current_stock - @quantity,
          updated_at = datetime('now','localtime')
      WHERE id = @item_id
    `).run({ quantity, item_id });

    // ดึงข้อมูลกลับ
    const updatedItem = getItemById(item_id);
    const transaction = db.prepare(`
      SELECT t.*, i.name as item_name, s.name as staff_name
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN staff s ON t.staff_id = s.id
      WHERE t.id = ?
    `).get(txnResult.lastInsertRowid);

    return { transaction, item: updatedItem };
  });

  return withdraw();
}

function addStock({ item_id, quantity, note = '' }) {
  const add = db.transaction(() => {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) throw new Error('ไม่พบรายการวัสดุ');

    // บันทึก transaction (ใช้ staff_id = 0 สำหรับระบบ)
    db.prepare(`
      INSERT INTO transactions (item_id, staff_id, quantity, type, note)
      VALUES (@item_id, 0, @quantity, 'add', @note)
    `).run({ item_id, quantity, note });

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

function getTransactions({ item_id, staff_id, type, startDate, endDate, page = 1, limit = 50 } = {}) {
  let where = ['1=1'];
  let params = {};

  if (item_id) {
    where.push('t.item_id = @item_id');
    params.item_id = item_id;
  }
  if (staff_id) {
    where.push('t.staff_id = @staff_id');
    params.staff_id = staff_id;
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
           s.name as staff_name, s.department as staff_department
    FROM transactions t
    LEFT JOIN items i ON t.item_id = i.id
    LEFT JOIN staff s ON t.staff_id = s.id
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

function getMonthlySummary(year, month) {
  return db.prepare(`
    SELECT
      i.name as item_name,
      i.unit,
      c.name as category_name,
      SUM(CASE WHEN t.type = 'withdraw' THEN t.quantity ELSE 0 END) as total_withdrawn,
      SUM(CASE WHEN t.type = 'add' THEN t.quantity ELSE 0 END) as total_added,
      COUNT(*) as transaction_count
    FROM transactions t
    LEFT JOIN items i ON t.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE strftime('%Y', t.date) = @year
      AND strftime('%m', t.date) = @month
    GROUP BY t.item_id
    ORDER BY total_withdrawn DESC
  `).all({ year: String(year), month: String(month).padStart(2, '0') });
}

function getDashboardStats() {
  const totalItems = db.prepare("SELECT COUNT(*) as cnt FROM items WHERE status = 'active'").get().cnt;
  const lowStockCount = db.prepare("SELECT COUNT(*) as cnt FROM items WHERE current_stock <= min_stock AND status = 'active'").get().cnt;
  const totalStaff = db.prepare("SELECT COUNT(*) as cnt FROM staff WHERE status = 'active'").get().cnt;
  const todayTransactions = db.prepare(`
    SELECT COUNT(*) as cnt FROM transactions
    WHERE date(date) = date('now','localtime')
  `).get().cnt;

  return { totalItems, lowStockCount, totalStaff, todayTransactions };
}

// ============================================================
// 8) Close DB
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
  // Staff
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  // Transactions
  withdrawItem,
  addStock,
  getTransactions,
  // Reports
  getLowStockItems,
  getMonthlySummary,
  getDashboardStats,
};
