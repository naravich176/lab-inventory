// electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    title: 'ระบบจัดการคลังแล็บ',
  });

  // Development: load from Vite dev server
  // Production: load from build folder
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// App Lifecycle
// ============================================================
app.whenReady().then(() => {
  // Initialize database before creating window
  db.initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  db.closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  db.closeDatabase();
});

// ============================================================
// IPC Handlers — Categories
// ============================================================
ipcMain.handle('db:getCategories', () => {
  try {
    return { success: true, data: db.getCategories() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getCategoryById', (_event, id) => {
  try {
    return { success: true, data: db.getCategoryById(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:createCategory', (_event, data) => {
  try {
    return { success: true, data: db.createCategory(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:updateCategory', (_event, id, data) => {
  try {
    return { success: true, data: db.updateCategory(id, data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:deleteCategory', (_event, id) => {
  try {
    return { success: true, data: db.deleteCategory(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Items
// ============================================================
ipcMain.handle('db:getItems', (_event, filters) => {
  try {
    return { success: true, data: db.getItems(filters) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getItemById', (_event, id) => {
  try {
    return { success: true, data: db.getItemById(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:createItem', (_event, data) => {
  try {
    return { success: true, data: db.createItem(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:updateItem', (_event, id, data) => {
  try {
    return { success: true, data: db.updateItem(id, data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:deleteItem', (_event, id) => {
  try {
    return { success: true, data: db.deleteItem(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Staff
// ============================================================
ipcMain.handle('db:getStaff', (_event, filters) => {
  try {
    return { success: true, data: db.getStaff(filters) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getStaffById', (_event, id) => {
  try {
    return { success: true, data: db.getStaffById(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:createStaff', (_event, data) => {
  try {
    return { success: true, data: db.createStaff(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:updateStaff', (_event, id, data) => {
  try {
    return { success: true, data: db.updateStaff(id, data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:deleteStaff', (_event, id) => {
  try {
    return { success: true, data: db.deleteStaff(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Transactions
// ============================================================
ipcMain.handle('db:withdrawItem', (_event, data) => {
  try {
    return { success: true, data: db.withdrawItem(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:addStock', (_event, data) => {
  try {
    return { success: true, data: db.addStock(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getTransactions', (_event, filters) => {
  try {
    return { success: true, data: db.getTransactions(filters) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers — Dashboard / Reports
// ============================================================
ipcMain.handle('db:getLowStockItems', () => {
  try {
    return { success: true, data: db.getLowStockItems() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getMonthlySummary', (_event, year, month) => {
  try {
    return { success: true, data: db.getMonthlySummary(year, month) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:getDashboardStats', () => {
  try {
    return { success: true, data: db.getDashboardStats() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
