// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================================
  // Categories
  // ============================================================
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  getCategoryById: (id) => ipcRenderer.invoke('db:getCategoryById', id),
  createCategory: (data) => ipcRenderer.invoke('db:createCategory', data),
  updateCategory: (id, data) => ipcRenderer.invoke('db:updateCategory', id, data),
  deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),

  // ============================================================
  // Items
  // ============================================================
  getItems: (filters) => ipcRenderer.invoke('db:getItems', filters),
  getItemById: (id) => ipcRenderer.invoke('db:getItemById', id),
  createItem: (data) => ipcRenderer.invoke('db:createItem', data),
  updateItem: (id, data) => ipcRenderer.invoke('db:updateItem', id, data),
  deleteItem: (id) => ipcRenderer.invoke('db:deleteItem', id),

  // ============================================================
  // Staff
  // ============================================================
  getStaff: (filters) => ipcRenderer.invoke('db:getStaff', filters),
  getStaffById: (id) => ipcRenderer.invoke('db:getStaffById', id),
  createStaff: (data) => ipcRenderer.invoke('db:createStaff', data),
  updateStaff: (id, data) => ipcRenderer.invoke('db:updateStaff', id, data),
  deleteStaff: (id) => ipcRenderer.invoke('db:deleteStaff', id),

  // ============================================================
  // Transactions
  // ============================================================
  withdrawItem: (data) => ipcRenderer.invoke('db:withdrawItem', data),
  addStock: (data) => ipcRenderer.invoke('db:addStock', data),
  getTransactions: (filters) => ipcRenderer.invoke('db:getTransactions', filters),

  // ============================================================
  // Dashboard / Reports
  // ============================================================
  getLowStockItems: () => ipcRenderer.invoke('db:getLowStockItems'),
  getMonthlySummary: (year, month) => ipcRenderer.invoke('db:getMonthlySummary', year, month),
  getDashboardStats: () => ipcRenderer.invoke('db:getDashboardStats'),
});
