# 🧪 Lab Stock

**ระบบจัดการคลังวัสดุอุปกรณ์ห้องปฏิบัติการ** — Lab Inventory Management System

---

## 📋 ภาพรวม (Overview)

Lab Stock เป็น Desktop Application + API Server สำหรับบันทึกการเบิกใช้วัสดุอุปกรณ์ของเจ้าหน้าที่ห้องปฏิบัติการ

- 🖥️ **Desktop App** (Electron) — ใช้งานหน้า UI ที่สวยงาม
- 🌐 **API Server** — เครื่องหลายเครื่องเชื่อมต่อผ่าน Internet ได้
- 🔐 **ระบบ Login** — แบ่งสิทธิ์ admin / user ด้วย JWT
- 📦 **จัดการคลัง** — บันทึกเบิกใช้วัสดุ, เพิ่มสต็อก, ดูรายงานสรุป

---

## 🛠️ Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | Electron + Ionic + React 19 + TypeScript + Tailwind CSS v3 + Vite 5 |
| **Backend** | Express.js + SQLite (better-sqlite3) + JWT + bcryptjs |
| **Package Manager** | pnpm |
| **Tunnel** | Cloudflare Tunnel (cloudflared) |

---

## ✨ Features

- 📂 จัดการหมวดหมู่วัสดุ (CRUD + icon/color picker)
- 📦 จัดการวัสดุอุปกรณ์ (CRUD + filter + search + pagination)
- 👥 จัดการรายชื่อเจ้าหน้าที่ (CRUD)
- 📤 เบิกใช้วัสดุ + เพิ่มสต็อก (atomic transaction)
- 🔔 แจ้งเตือนวัสดุใกล้หมด (auto-refresh)
- 📊 สรุปรายงานรายเดือน/รายปี (SVG charts)
- 🖨️ ปริ้นรายการวัสดุ
- 🔐 ระบบ Login (JWT) แบ่ง admin/user
- 🌐 เข้าใช้งานผ่าน Internet ด้วย Cloudflare Tunnel

---

## 🏗️ สถาปัตยกรรม (Architecture)

```
[เครื่อง A - Electron App] ──┐
[เครื่อง B - Electron App] ──┼── Internet ──→ [Cloudflare Tunnel] ──→ [Server - Express.js + SQLite]
[เครื่อง C - Electron App] ──┘
```

- **Server** รันบนเครื่องหลัก 1 เครื่อง (มี database)
- **Client** (Electron App) เชื่อมต่อ Server ผ่าน Cloudflare Tunnel URL
- ทุกเครื่องใช้ database เดียวกัน — ข้อมูลตรงกันแบบ real-time

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
lab-inventory/
├── server/                          # API Server (Express.js)
│   ├── index.js                     # Entry point — Express app + mount routes
│   ├── database.js                  # SQLite manager (schema, CRUD, auth)
│   ├── package.json                 # Server dependencies
│   ├── env.example                  # ตัวอย่าง .env (commit ได้)
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication + role middleware
│   │   └── errorHandler.js          # Global error handler
│   └── routes/
│       ├── auth.js                  # POST /login, GET /me, PUT /change-password
│       ├── categories.js            # CRUD หมวดหมู่
│       ├── items.js                 # CRUD วัสดุอุปกรณ์
│       ├── staff.js                 # CRUD เจ้าหน้าที่
│       ├── transactions.js          # เบิกใช้ + เพิ่มสต็อก
│       ├── reports.js               # รายงาน + dashboard
│       └── users.js                 # จัดการผู้ใช้ (admin only)
├── src/                             # Frontend (React + Ionic)
│   ├── api/
│   │   └── client.ts               # Fetch-based API client (แทน electronAPI)
│   ├── hooks/
│   │   ├── useAuth.ts              # AuthContext/Provider + useAuth hook
│   │   └── useDatabase.ts          # React hooks เรียก API
│   ├── pages/
│   │   ├── Login.tsx               # หน้า Login + ตั้งค่า Server URL
│   │   ├── Home.tsx                # หน้าหลัก (เบิกใช้วัสดุ)
│   │   ├── ItemManagement.tsx      # จัดการวัสดุ (list)
│   │   ├── ItemForm.tsx            # เพิ่ม/แก้ไขวัสดุ (form)
│   │   ├── StaffManagement.tsx     # จัดการเจ้าหน้าที่
│   │   ├── CategoryManagement.tsx  # จัดการหมวดหมู่
│   │   ├── ReportSummary.tsx       # สรุปรายงาน (กราฟ+ตาราง)
│   │   └── PrintInventory.tsx      # ปริ้นรายการวัสดุ
│   ├── components/
│   │   └── NotificationPanel.tsx   # แจ้งเตือนวัสดุใกล้หมด
│   ├── types/
│   │   └── database.ts             # TypeScript types
│   ├── theme/
│   │   └── variables.css           # Tailwind + fonts
│   ├── App.tsx                     # Router + Navbar + Auth flow
│   └── main.tsx                    # Entry point + AuthProvider
├── electron/                        # Electron main process
│   ├── main.js                     # Main process + IPC handlers
│   ├── preload.js                  # contextBridge expose API
│   └── database.js                 # SQLite (local mode)
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 การติดตั้ง (Installation)

### Prerequisites

- **Node.js** v20 ขึ้นไป → [https://nodejs.org](https://nodejs.org)
- **pnpm** → ติดตั้งผ่าน terminal:
  ```bash
  npm install -g pnpm
  ```
- **Git** → [https://git-scm.com](https://git-scm.com)

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/naravich176/lab-inventory.git
cd lab-inventory
```

### 2. ติดตั้ง Dependencies

```bash
# Frontend (root)
pnpm install

# Server
cd server
npm install
```

### 3. ตั้งค่า Server Environment

```bash
cd server
cp env.example .env
```

แก้ไขไฟล์ `server/.env`:

```env
PORT=3000
JWT_SECRET=เปลี่ยนเป็นค่า-random-ที่ยาวๆ
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

> ⚠️ **สำคัญ:** เปลี่ยน `JWT_SECRET` เป็นค่าที่ random และยาว สำหรับ production!

---

## 💻 การใช้งาน (Usage)

### รัน Server

```bash
cd server
npm start
```

Server จะรันที่ `http://localhost:3000`

### รัน Electron App (Development)

```bash
cd lab-inventory
pnpm dev
```

เปิด `http://localhost:5173` ในเบราว์เซอร์ หรือ:

```bash
pnpm electron:dev
```

### เปิดให้เข้าจาก Internet (Cloudflare Tunnel)

```bash
cloudflared tunnel --url http://localhost:3000
```

จะได้ URL แบบ `https://xxxx-xxxx.trycloudflare.com` — ใช้ URL นี้ตั้งค่าในหน้า Login ของเครื่อง Client

### Default Admin Account

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

> ⚠️ เปลี่ยนรหัสผ่านหลังจาก login ครั้งแรก!

---

## 🖥️ การตั้งค่าเครื่อง Client

1. Clone โปรเจกต์ → `pnpm install` → `pnpm dev`
2. เปิดหน้า Login
3. กด **ตั้งค่า Server** → กรอก Cloudflare Tunnel URL (เช่น `https://xxxx.trycloudflare.com`)
4. กรอก username / password → Login

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### 🔐 Auth

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `POST` | `/api/auth/login` | เข้าสู่ระบบ | ไม่ต้อง login |
| `GET` | `/api/auth/me` | ดูข้อมูลผู้ใช้ปัจจุบัน | ทุก role |
| `PUT` | `/api/auth/change-password` | เปลี่ยนรหัสผ่าน | ทุก role |

### 📂 Categories

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/categories` | ดูหมวดหมู่ทั้งหมด | ทุก role |
| `GET` | `/api/categories/:id` | ดูหมวดหมู่ตาม ID | ทุก role |
| `POST` | `/api/categories` | สร้างหมวดหมู่ | admin |
| `PUT` | `/api/categories/:id` | แก้ไขหมวดหมู่ | admin |
| `DELETE` | `/api/categories/:id` | ลบหมวดหมู่ | admin |

### 📦 Items

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/items` | ดูวัสดุทั้งหมด (filter, search, pagination) | ทุก role |
| `GET` | `/api/items/:id` | ดูวัสดุตาม ID | ทุก role |
| `POST` | `/api/items` | สร้างวัสดุ | admin |
| `PUT` | `/api/items/:id` | แก้ไขวัสดุ | admin |
| `DELETE` | `/api/items/:id` | ลบวัสดุ | admin |

### 👥 Staff

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/staff` | ดูเจ้าหน้าที่ทั้งหมด (search, filter) | ทุก role |
| `GET` | `/api/staff/:id` | ดูเจ้าหน้าที่ตาม ID | ทุก role |
| `POST` | `/api/staff` | สร้างเจ้าหน้าที่ | admin |
| `PUT` | `/api/staff/:id` | แก้ไขเจ้าหน้าที่ | admin |
| `DELETE` | `/api/staff/:id` | ลบเจ้าหน้าที่ | admin |

### 📤 Transactions

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `POST` | `/api/transactions/withdraw` | เบิกใช้วัสดุ | ทุก role |
| `POST` | `/api/transactions/add-stock` | เพิ่มสต็อก | admin |
| `GET` | `/api/transactions` | ดูประวัติการเบิก (filter, pagination) | ทุก role |

### 📊 Reports

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/reports/low-stock` | วัสดุใกล้หมด/หมดสต็อก | ทุก role |
| `GET` | `/api/reports/monthly?year=&month=` | สรุปรายเดือน | ทุก role |
| `GET` | `/api/reports/dashboard` | สถิติ dashboard | ทุก role |

### 👤 Users (Admin Only)

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/users` | ดูผู้ใช้ทั้งหมด | admin |
| `POST` | `/api/users` | สร้างผู้ใช้ใหม่ | admin |
| `PUT` | `/api/users/:id/reset-password` | รีเซ็ตรหัสผ่าน | admin |

---

## 🗄️ Database Schema

ใช้ SQLite (better-sqlite3) — database สร้างอัตโนมัติเมื่อรัน server ครั้งแรก

### ตาราง `categories` — หมวดหมู่พัสดุ

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `name` | TEXT NOT NULL UNIQUE | ชื่อหมวดหมู่ |
| `icon` | TEXT | ชื่อ icon |
| `color` | TEXT | สี HEX (default: #4F46E5) |
| `sort_order` | INTEGER | ลำดับการแสดงผล |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `items` — วัสดุอุปกรณ์

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `name` | TEXT NOT NULL | ชื่อวัสดุ |
| `cat_code` | TEXT NOT NULL UNIQUE | รหัสวัสดุ |
| `unit` | TEXT | หน่วยนับ (default: ชิ้น) |
| `min_stock` | INTEGER | สต็อกขั้นต่ำ (สำหรับแจ้งเตือน) |
| `current_stock` | INTEGER | สต็อกปัจจุบัน |
| `category_id` | INTEGER FK | อ้างอิง categories.id |
| `description` | TEXT | รายละเอียดเพิ่มเติม |
| `status` | TEXT | active / inactive |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `staff` — เจ้าหน้าที่

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `name` | TEXT NOT NULL | ชื่อเจ้าหน้าที่ |
| `position` | TEXT | ตำแหน่ง |
| `department` | TEXT | แผนก/หน่วยงาน |
| `phone` | TEXT | เบอร์โทร |
| `status` | TEXT | active / inactive |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `transactions` — บันทึกการเบิกใช้

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `item_id` | INTEGER FK | อ้างอิง items.id |
| `staff_id` | INTEGER FK | อ้างอิง staff.id |
| `quantity` | INTEGER NOT NULL | จำนวน |
| `type` | TEXT | withdraw (เบิก) / add (เพิ่มสต็อก) |
| `note` | TEXT | หมายเหตุ |
| `date` | TEXT | วันที่ทำรายการ |
| `created_at` | TEXT | วันที่สร้าง |

### ตาราง `users` — ผู้ใช้งานระบบ

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `username` | TEXT NOT NULL UNIQUE | ชื่อผู้ใช้ |
| `password_hash` | TEXT NOT NULL | รหัสผ่าน (bcrypt hash) |
| `display_name` | TEXT NOT NULL | ชื่อที่แสดงใน UI |
| `role` | TEXT | admin / user |
| `status` | TEXT | active / inactive |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

---

## 🔒 Role-based Access

| การกระทำ | Admin | User |
|----------|:-----:|:----:|
| ดูข้อมูลวัสดุ / หมวดหมู่ / เจ้าหน้าที่ | ✅ | ✅ |
| เบิกใช้วัสดุ | ✅ | ✅ |
| ดูรายงานสรุป | ✅ | ✅ |
| ปริ้นรายการ | ✅ | ✅ |
| เปลี่ยนรหัสผ่านตนเอง | ✅ | ✅ |
| สร้าง/แก้ไข/ลบ วัสดุ | ✅ | ❌ |
| สร้าง/แก้ไข/ลบ หมวดหมู่ | ✅ | ❌ |
| สร้าง/แก้ไข/ลบ เจ้าหน้าที่ | ✅ | ❌ |
| เพิ่มสต็อก | ✅ | ❌ |
| จัดการผู้ใช้ / รีเซ็ตรหัสผ่าน | ✅ | ❌ |

---

## 📄 License

MIT License
