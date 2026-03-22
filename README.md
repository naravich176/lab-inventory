# Lab Stock

**ระบบจัดการคลังวัสดุอุปกรณ์ห้องปฏิบัติการ** — Lab Inventory Management System

---

## ภาพรวม (Overview)

Lab Stock เป็น Web Application + API Server สำหรับบันทึกการเบิกใช้วัสดุอุปกรณ์ของห้องปฏิบัติการ

- **Web App** (React + Vite) — เปิดใช้งานผ่าน Browser ทุกเครื่อง
- **API Server** — เครื่องหลายเครื่องเชื่อมต่อผ่าน Internet ได้
- **ระบบ Login 3 บทบาท** — แบ่งสิทธิ์ admin / staff / procurement ด้วย JWT
- **จัดการคลัง** — บันทึกเบิกใช้วัสดุ, เพิ่มสต็อก, ดูรายงานสรุป
- **แจ้งเตือนวันหมดอายุ** — ติดตามวันหมดอายุวัสดุ พร้อมแจ้งเตือนล่วงหน้าอัตโนมัติ
- **จัดซื้อจัดจ้าง** — แจ้งคำขอ, ติดตามสถานะ, ยืนยันรับพัสดุ
- **ใช้ข้อมูลผู้ใช้ที่ login อัตโนมัติ** — ทุกการเบิกใช้/รับพัสดุจะบันทึกชื่อผู้ดำเนินการจาก user ที่ login อยู่โดยไม่ต้องเลือกเอง

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS v3 + Vite 5 |
| **Backend** | Express.js + SQLite (better-sqlite3) + JWT + bcryptjs |
| **Package Manager** | pnpm (frontend) / npm (server) |
| **Tunnel** | Cloudflare Tunnel (cloudflared) |

---

## Features

### คลังวัสดุ (Home)
- จัดการหมวดหมู่วัสดุ (CRUD + icon/color picker)
- จัดการวัสดุอุปกรณ์ (CRUD + filter + search + pagination)
- เบิกใช้วัสดุ + เพิ่มสต็อก (atomic transaction) — ใช้ข้อมูล user ที่ login อัตโนมัติ
- **กรองวัสดุ** ตามสถานะ stock (ปกติ / ใกล้หมด / หมด / ใกล้หมดอายุ) และเรียงลำดับ (ชื่อ / คงเหลือ / แก้ไขล่าสุด)
- **ดูประวัติการเคลื่อนไหว** ของแต่ละวัสดุ (เบิกใช้ + รับเข้า พร้อมชื่อผู้ดำเนินการ)
- **แสดงสถานะวันหมดอายุ** ในตาราง — badge "หมดอายุแล้ว" (แดง) / "ใกล้หมดอายุ" (เหลือง)

### จัดซื้อจัดจ้าง (Procurement)
- แจ้งคำขอจัดซื้อ (staff / admin)
- อัพเดตสถานะ: แจ้งคำขอ → กำลังสั่งซื้อ → กำลังจัดส่ง → ส่งถึงแล้ว → รับแล้ว
- **ยืนยันรับพัสดุ** — บันทึกชื่อผู้รับจาก user ที่ login อัตโนมัติ
- รับวัสดุเดิมที่มีในระบบ → เพิ่ม stock อัตโนมัติ
- รับวัสดุใหม่ → กรอกข้อมูลครบเหมือนเพิ่มวัสดุใหม่ (ขนาด, เกรด, ยี่ห้อ, วันหมดอายุ) + สร้างรายการ + เพิ่ม stock ในขั้นตอนเดียว
- แสดงชื่อผู้รับพัสดุในตาราง

### จัดการผู้ใช้ (User Management)
- ระบบ 3 บทบาท: admin / staff (เจ้าหน้าที่ห้องปฏิบัติการ) / procurement (เจ้าหน้าที่จัดซื้อ)
- จัดการผู้ใช้ (สร้าง, แก้ไข, รีเซ็ตรหัสผ่าน) — admin only
- ข้อมูลผู้ใช้รวมตำแหน่ง, แผนก, เบอร์โทรศัพท์

### ระบบแจ้งเตือนวันหมดอายุ (Expiry Tracking)
- บันทึก **วันหมดอายุ** และ **จำนวนวันแจ้งเตือนล่วงหน้า** ต่อรายการวัสดุ
- ระบบคำนวณสถานะอัตโนมัติ: หมดอายุแล้ว / ใกล้หมดอายุ / ยังไม่หมดอายุ
- กรองวัสดุใกล้หมดอายุในหน้าหลัก (`stockStatus=expiring`)
- กรอกวันหมดอายุได้ทั้งตอน**เพิ่มวัสดุ**และตอน**รับพัสดุใหม่จากจัดซื้อ**

### ระบบแจ้งเตือน (Notifications)
- ใช้ตาราง `notifications` แยก — เก็บประวัติ, mark อ่านแล้ว/ยังไม่อ่านได้
- สร้าง notification อัตโนมัติ 4 ประเภท: หมดสต็อก (🔴), สต็อกใกล้หมด (🟡), หมดอายุแล้ว (🔴), ใกล้หมดอายุ (🟠)
- ไม่สร้างซ้ำถ้ามี notification ที่ยังไม่อ่านของ item+type เดียวกันอยู่แล้ว
- กดที่ notification → mark เป็นอ่านแล้ว (แสดงสีจาง)
- Badge ตัวเลข unread count บน icon กระดิ่ง
- Auto-refresh ทุก 60 วินาที

### อื่นๆ
- สรุปรายงานรายเดือน/รายปี (SVG charts)
- ปริ้นรายการวัสดุ
- เข้าใช้งานผ่าน Internet ด้วย Cloudflare Tunnel

---

## สถาปัตยกรรม (Architecture)

```
[เครื่อง A - Browser] ──┐
[เครื่อง B - Browser] ──┼── Internet ──→ [Cloudflare Tunnel] ──→ [Server: Express.js + SQLite + Frontend (dist/)]
[เครื่อง C - Browser] ──┘
```

- **Server** รันบนเครื่องหลัก 1 เครื่อง — serve ทั้ง API + Frontend จาก `dist/`
- **Client** (Browser) เปิด URL เดียว ได้ทั้งหน้าเว็บและ API
- ทุกเครื่องใช้ database เดียวกัน — ข้อมูลตรงกันแบบ real-time
- ไม่ต้อง clone repo, ไม่ต้อง install, ไม่ต้อง `pnpm dev` ที่เครื่อง client

---

## โครงสร้างโปรเจกต์ (Project Structure)

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
│       ├── items.js                 # CRUD วัสดุอุปกรณ์ + filter/sort
│       ├── transactions.js          # เบิกใช้ + เพิ่มสต็อก
│       ├── procurement.js           # คำขอจัดซื้อ + ยืนยันรับพัสดุ
│       ├── reports.js               # รายงาน + dashboard
│       ├── users.js                 # จัดการผู้ใช้ (CRUD + filter)
│       └── notifications.js        # แจ้งเตือน (generate, list, mark read)
├── src/                             # Frontend (React)
│   ├── api/
│   │   └── client.ts               # Fetch-based API client
│   ├── hooks/
│   │   └── useAuth.ts              # Auth state + useAuth hook
│   ├── pages/
│   │   ├── Login.tsx               # หน้า Login + ตั้งค่า Server URL
│   │   ├── Home.tsx                # หน้าหลัก (เบิกใช้ + กรอง + ประวัติ)
│   │   ├── Procurement.tsx         # จัดซื้อจัดจ้าง (คำขอ + รับพัสดุ)
│   │   ├── ItemManagement.tsx      # จัดการวัสดุ (list)
│   │   ├── ItemForm.tsx            # เพิ่ม/แก้ไขวัสดุ (form)
│   │   ├── UserManagement.tsx      # จัดการผู้ใช้ (ตำแหน่ง/แผนก/เบอร์โทร)
│   │   ├── CategoryManagement.tsx  # จัดการหมวดหมู่
│   │   ├── ReportSummary.tsx       # สรุปรายงาน (กราฟ+ตาราง)
│   │   └── PrintInventory.tsx      # ปริ้นรายการวัสดุ
│   ├── components/
│   │   └── NotificationPanel.tsx   # แจ้งเตือน (ใช้ตาราง notifications + mark read)
│   ├── App.tsx                     # Router + Navbar + Auth flow
│   └── main.tsx                    # Entry point
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## การติดตั้ง (Installation)

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

> **สำคัญ:** เปลี่ยน `JWT_SECRET` เป็นค่าที่ random และยาว สำหรับ production!

---

## การใช้งาน (Usage)

### รัน Server

```bash
cd server
npm start
```

Server จะรันที่ `http://localhost:3000`

### รัน Frontend (Development)

```bash
# Terminal 1 — Server
cd server && npm start

# Terminal 2 — Frontend (dev mode พร้อม proxy ไปที่ server)
pnpm dev
```

เปิด `http://localhost:5173` ในเบราว์เซอร์ — Vite จะ proxy `/api` requests ไปยัง `http://localhost:3000` อัตโนมัติ

### Default Admin Account

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

> เปลี่ยนรหัสผ่านหลังจาก login ครั้งแรก!

---

## Production Deployment

เป้าหมาย: เครื่อง client เปิด browser เข้าได้เลย **ไม่ต้อง clone repo หรือติดตั้งอะไร**

### 1. Build Frontend

```bash
# ที่ root ของโปรเจกต์
pnpm build
```

จะได้ folder `dist/` ที่มีไฟล์ HTML/JS/CSS พร้อมใช้

### 2. รัน Server

```bash
cd server
npm start
```

Server จะ serve ทั้ง **API** (`/api/*`) และ **Frontend** (จาก `dist/`) บน port เดียวกัน

### 3. เข้าใช้งาน

- **เครื่องเดียวกัน:** เปิด browser → `http://localhost:3000`
- **เครื่องอื่นใน LAN:** เปิด browser → `http://<server-ip>:3000`
- **ผ่าน Internet (Cloudflare Tunnel):**

```bash
cloudflared tunnel --url http://localhost:3000
```

จะได้ URL แบบ `https://xxxx-xxxx.trycloudflare.com` — เครื่อง client เปิด URL นี้ใน browser ได้เลย

> **หมายเหตุ:** `dist/` ไม่ต้อง commit ขึ้น git — build ที่เครื่อง server ทีเดียวพอ

---

## API Endpoints

Base URL: `http://localhost:3000/api`

### Auth

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `POST` | `/api/auth/login` | เข้าสู่ระบบ | ไม่ต้อง login |
| `GET` | `/api/auth/me` | ดูข้อมูลผู้ใช้ปัจจุบัน | ทุก role |
| `PUT` | `/api/auth/change-password` | เปลี่ยนรหัสผ่าน | ทุก role |

### Categories

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/categories` | ดูหมวดหมู่ทั้งหมด | ทุก role |
| `GET` | `/api/categories/:id` | ดูหมวดหมู่ตาม ID | ทุก role |
| `POST` | `/api/categories` | สร้างหมวดหมู่ | admin |
| `PUT` | `/api/categories/:id` | แก้ไขหมวดหมู่ | admin |
| `DELETE` | `/api/categories/:id` | ลบหมวดหมู่ | admin |

### Items

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/items` | ดูวัสดุทั้งหมด (filter, search, sort, pagination) | ทุก role |
| `GET` | `/api/items/:id` | ดูวัสดุตาม ID | ทุก role |
| `POST` | `/api/items` | สร้างวัสดุ | admin |
| `PUT` | `/api/items/:id` | แก้ไขวัสดุ | admin |
| `DELETE` | `/api/items/:id` | ลบวัสดุ | admin |

**Query params สำหรับ GET /api/items:**

| Param | คำอธิบาย | ค่าที่ใช้ได้ |
|-------|----------|-------------|
| `categoryId` | กรองตามหมวดหมู่ | ID ของ category |
| `search` | ค้นหาชื่อหรือรหัสวัสดุ | ข้อความ |
| `status` | กรองตามสถานะ | `active`, `inactive` |
| `stockStatus` | กรองตามระดับ stock | `normal`, `low`, `out`, `expiring` |
| `sort` | เรียงลำดับ | `name_asc`, `stock_asc`, `stock_desc`, `updated_desc` |
| `page` | หน้า | ตัวเลข (default: 1) |
| `limit` | จำนวนต่อหน้า | ตัวเลข (default: 20) |

### Users

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/users` | ดูผู้ใช้ทั้งหมด (search, filter) | ทุก role |
| `POST` | `/api/users` | สร้างผู้ใช้ใหม่ | admin |
| `PUT` | `/api/users/:id` | แก้ไขผู้ใช้ (ชื่อ, role, ตำแหน่ง, แผนก, เบอร์โทร) | admin |
| `PUT` | `/api/users/:id/reset-password` | รีเซ็ตรหัสผ่าน | admin |

### Transactions

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `POST` | `/api/transactions/withdraw` | เบิกใช้วัสดุ | staff, admin |
| `POST` | `/api/transactions/add-stock` | เพิ่มสต็อก | admin |
| `GET` | `/api/transactions` | ดูประวัติการเบิก/รับเข้า (filter, pagination) | ทุก role |

### Procurement (จัดซื้อจัดจ้าง)

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/procurement` | ดูคำขอจัดซื้อทั้งหมด (filter, pagination) | ทุก role |
| `GET` | `/api/procurement/:id` | ดูคำขอจัดซื้อตาม ID | ทุก role |
| `POST` | `/api/procurement` | แจ้งคำขอจัดซื้อ | staff, admin |
| `PUT` | `/api/procurement/:id/status` | อัพเดตสถานะคำขอ | procurement, admin |
| `PUT` | `/api/procurement/:id/receive` | ยืนยันรับพัสดุ | staff, admin |
| `DELETE` | `/api/procurement/:id` | ลบคำขอ (เฉพาะ status=requested) | admin |

**Body สำหรับ PUT /api/procurement/:id/receive:**

```json
{
  "receiver_user_id": 1,
  "new_item": {
    "name": "ชื่อวัสดุ",
    "cat_code": "CHM-001",
    "unit": "ชิ้น",
    "min_stock": 5,
    "category_id": 1,
    "description": "ขนาด|เกรด|ยี่ห้อ",
    "expiry_date": "2026-12-31",
    "expiry_alert_days": 30
  }
}
```
- `receiver_user_id` — ID ผู้ใช้ผู้รับพัสดุ (บันทึกลง `received_by_user`)
- `new_item` — ส่งเฉพาะกรณีวัสดุใหม่ที่ยังไม่มีในระบบ (ถ้าวัสดุมีอยู่แล้วไม่ต้องส่ง)
- `expiry_date` — วันหมดอายุ (ไม่บังคับ)
- `expiry_alert_days` — แจ้งเตือนล่วงหน้ากี่วัน (default: 30)

### Notifications (แจ้งเตือน)

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/notifications` | ดูรายการแจ้งเตือน (filter: `is_read`, `type`) | ทุก role |
| `GET` | `/api/notifications/unread-count` | นับจำนวนยังไม่อ่าน | ทุก role |
| `POST` | `/api/notifications/generate` | สร้าง notifications ใหม่จากข้อมูลปัจจุบัน | ทุก role |
| `PUT` | `/api/notifications/:id/read` | mark เป็นอ่านแล้ว | ทุก role |
| `PUT` | `/api/notifications/read-all` | mark ทั้งหมดเป็นอ่านแล้ว | ทุก role |

### Reports

| Method | Path | คำอธิบาย | สิทธิ์ |
|--------|------|----------|--------|
| `GET` | `/api/reports/low-stock` | วัสดุใกล้หมด/หมดสต็อก | ทุก role |
| `GET` | `/api/reports/expiring-items` | วัสดุหมดอายุ/ใกล้หมดอายุ | ทุก role |
| `GET` | `/api/reports/monthly?year=&month=` | สรุปรายเดือน | ทุก role |
| `GET` | `/api/reports/dashboard` | สถิติ dashboard | ทุก role |

---

## Database Schema

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
| `description` | TEXT | รายละเอียด (format: ขนาด\|เกรด\|ยี่ห้อ) |
| `expiry_date` | TEXT | วันหมดอายุ (YYYY-MM-DD, NULL ถ้าไม่มี) |
| `expiry_alert_days` | INTEGER | แจ้งเตือนล่วงหน้ากี่วัน (default: 30) |
| `status` | TEXT | active / inactive |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `users` — ผู้ใช้งานระบบ

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `username` | TEXT NOT NULL UNIQUE | ชื่อผู้ใช้ |
| `password_hash` | TEXT NOT NULL | รหัสผ่าน (bcrypt hash) |
| `display_name` | TEXT NOT NULL | ชื่อที่แสดงใน UI |
| `role` | TEXT | `admin` / `staff` / `procurement` |
| `position` | TEXT | ตำแหน่ง |
| `department` | TEXT | แผนก/หน่วยงาน |
| `phone` | TEXT | เบอร์โทร |
| `status` | TEXT | active / inactive |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `transactions` — บันทึกการเบิกใช้/รับเข้า

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `item_id` | INTEGER FK NOT NULL | อ้างอิง items.id |
| `user_id` | INTEGER FK | อ้างอิง users.id (ผู้ดำเนินการ) |
| `quantity` | INTEGER NOT NULL | จำนวน |
| `type` | TEXT | `withdraw` (เบิก) / `add` (รับเข้า) |
| `note` | TEXT | หมายเหตุ |
| `date` | TEXT | วันที่ทำรายการ |
| `created_at` | TEXT | วันที่สร้าง |

### ตาราง `procurement_requests` — คำขอจัดซื้อจัดจ้าง

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `item_id` | INTEGER FK | อ้างอิง items.id (NULL สำหรับวัสดุใหม่) |
| `item_name` | TEXT NOT NULL | ชื่อวัสดุที่ขอจัดซื้อ |
| `quantity` | INTEGER NOT NULL | จำนวน |
| `unit` | TEXT | หน่วยนับ (default: ชิ้น) |
| `reason` | TEXT | เหตุผล/หมายเหตุ |
| `requested_by` | INTEGER FK NOT NULL | อ้างอิง users.id (ผู้แจ้งคำขอ) |
| `status` | TEXT NOT NULL | `requested` → `ordering` → `shipping` → `delivered` → `received` |
| `note` | TEXT | หมายเหตุเพิ่มเติม |
| `received_by` | INTEGER FK | อ้างอิง users.id (ผู้กดยืนยันรับ) |
| `received_by_user` | INTEGER FK | อ้างอิง users.id (ผู้รับพัสดุ) |
| `received_at` | TEXT | วันเวลาที่ยืนยันรับ |
| `created_at` | TEXT | วันที่สร้าง |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด |

### ตาราง `notifications` — แจ้งเตือน

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | INTEGER PK | Auto increment |
| `type` | TEXT NOT NULL | `out_of_stock` / `low_stock` / `expiring` / `expired` |
| `title` | TEXT NOT NULL | หัวข้อแจ้งเตือน |
| `message` | TEXT NOT NULL | รายละเอียด |
| `item_id` | INTEGER FK | อ้างอิง items.id (CASCADE delete) |
| `is_read` | INTEGER | 0 = ยังไม่อ่าน, 1 = อ่านแล้ว |
| `created_at` | TEXT | วันที่สร้าง |

---

## Role-based Access (3 บทบาท)

| การกระทำ | Admin | Staff | Procurement |
|----------|:-----:|:-----:|:-----------:|
| ดูข้อมูลวัสดุ / หมวดหมู่ / ผู้ใช้ | ✅ | ✅ | ✅ |
| เบิกใช้วัสดุ | ✅ | ✅ | ❌ |
| ดูประวัติการเคลื่อนไหว | ✅ | ✅ | ✅ |
| ดูรายงานสรุป | ✅ | ✅ | ✅ |
| ปริ้นรายการ | ✅ | ✅ | ✅ |
| เปลี่ยนรหัสผ่านตนเอง | ✅ | ✅ | ✅ |
| สร้าง/แก้ไข/ลบ วัสดุ | ✅ | ✅ | ❌ |
| สร้าง/แก้ไข/ลบ หมวดหมู่ | ✅ | ✅ | ❌ |
| เพิ่มสต็อก | ✅ | ❌ | ❌ |
| แจ้งคำขอจัดซื้อ | ✅ | ✅ | ❌ |
| อัพเดตสถานะจัดซื้อ | ✅ | ❌ | ✅ |
| ยืนยันรับพัสดุ | ✅ | ✅ | ❌ |
| ลบคำขอจัดซื้อ | ✅ | ❌ | ❌ |
| จัดการผู้ใช้ / รีเซ็ตรหัสผ่าน | ✅ | ❌ | ❌ |

---

## License

MIT License
