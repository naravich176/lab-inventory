# ระบบจัดการคลังแล็บ (Lab Inventory Management System)

Desktop Application สำหรับบันทึกการเบิกใช้วัสดุของเจ้าหน้าที่ห้องปฏิบัติการ

## Tech Stack

- **Frontend:** Ionic + React + TypeScript
- **Desktop:** Electron
- **Database:** SQLite (better-sqlite3)
- **Styling:** Tailwind CSS v3
- **Build Tool:** Vite
- **Package Manager:** pnpm

## Features

- จัดการวัสดุอุปกรณ์ (CRUD) แบ่งตาม 4 หมวดหมู่
- ระบบเบิกใช้วัสดุพร้อมบันทึกเจ้าหน้าที่ผู้เบิก
- จัดการรายชื่อเจ้าหน้าที่
- แจ้งเตือนวัสดุใกล้หมด / หมดสต็อก
- สรุปรายงานรายเดือน / รายปี พร้อมกราฟ
- ปริ้นรายการวัสดุ (Print / Save as PDF)

---

## การติดตั้งบนเครื่องใหม่

### 1. ติดตั้ง Prerequisites

ต้องมีโปรแกรมเหล่านี้ก่อน:

- **Node.js** v18 ขึ้นไป → [https://nodejs.org](https://nodejs.org)
- **pnpm** → ติดตั้งผ่าน terminal:

```bash
npm install -g pnpm
```

- **Git** → [https://git-scm.com](https://git-scm.com)

### 2. Clone โปรเจกต์

```bash
git clone <repository-url>
cd lab-inventory
```

### 3. ติดตั้ง Dependencies

```bash
pnpm install
```

> **หมายเหตุ:** `better-sqlite3` ต้อง compile native module
> ถ้าเจอ error ให้ติดตั้ง build tools ก่อน:
>
> **Windows:**
> ```bash
> npm install -g windows-build-tools
> ```
> หรือติดตั้ง [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) แล้วเลือก "Desktop development with C++"
>
> **macOS:**
> ```bash
> xcode-select --install
> ```

### 4. รันโปรเจกต์

#### Development (Electron + Vite Dev Server)

```bash
pnpm electron:dev
```

จะเปิดหน้าต่าง Electron พร้อม Hot Reload อัตโนมัติ

#### Development (Browser เท่านั้น)

```bash
pnpm dev
```

เปิด [http://localhost:5173](http://localhost:5173) ในเบราว์เซอร์ (ใช้ mock data แทน SQLite)

### 5. Build สำหรับ Production

```bash
pnpm electron:build
```

ไฟล์ installer จะอยู่ในโฟลเดอร์ `release/`

---

## โครงสร้างโปรเจกต์

```
lab-inventory/
├── electron/
│   ├── main.js            # Electron main process + IPC handlers
│   ├── preload.js         # contextBridge expose API
│   └── database.js        # SQLite database manager (schema, CRUD)
├── src/
│   ├── components/
│   │   └── NotificationPanel.tsx   # แจ้งเตือนวัสดุใกล้หมด
│   ├── hooks/
│   │   └── useDatabase.ts          # React hooks สำหรับ DB
│   ├── pages/
│   │   ├── Home.tsx                # หน้าหลัก (เบิกใช้วัสดุ)
│   │   ├── ItemManagement.tsx      # จัดการวัสดุ (list)
│   │   ├── ItemForm.tsx            # เพิ่ม/แก้ไขวัสดุ (form)
│   │   ├── StaffManagement.tsx     # จัดการเจ้าหน้าที่
│   │   ├── ReportSummary.tsx       # สรุปรายงาน (กราฟ+ตาราง)
│   │   └── PrintInventory.tsx      # ปริ้นรายการวัสดุ
│   ├── types/
│   │   └── database.ts             # TypeScript types
│   ├── theme/
│   │   └── variables.css           # Tailwind + fonts
│   ├── App.tsx                     # Router + Navbar
│   └── main.tsx                    # Entry point
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## Database

SQLite database จะถูกสร้างอัตโนมัติเมื่อเปิดแอปครั้งแรก ที่ตำแหน่ง:

- **Windows:** `%APPDATA%/lab-inventory/lab-inventory.db`
- **macOS:** `~/Library/Application Support/lab-inventory/lab-inventory.db`
- **Linux:** `~/.config/lab-inventory/lab-inventory.db`

### ตาราง

| ตาราง | คำอธิบาย |
|-------|----------|
| `categories` | หมวดหมู่พัสดุ (seed 4 หมวดเริ่มต้นอัตโนมัติ) |
| `items` | รายการวัสดุ (ชื่อ, รหัส, หน่วย, สต็อก, ขั้นต่ำ) |
| `staff` | รายชื่อเจ้าหน้าที่ |
| `transactions` | บันทึกการเบิกใช้ / รับเข้า |

---

## Scripts

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `pnpm dev` | รัน Vite dev server (browser only) |
| `pnpm electron:dev` | รัน Electron + Vite dev server |
| `pnpm build` | Build frontend (TypeScript + Vite) |
| `pnpm electron:build` | Build Electron installer (.exe) |

---

## Troubleshooting

### better-sqlite3 compile error

ลบ node_modules แล้วติดตั้งใหม่:

```bash
rm -rf node_modules
pnpm install
```

ถ้ายังไม่ได้ ตรวจสอบว่าติดตั้ง Visual Studio Build Tools แล้ว

### Tailwind CSS ไม่ทำงาน (เห็น HTML เปล่า)

ตรวจสอบ 2 จุด:

1. มีไฟล์ `postcss.config.js` อยู่ที่ root ของโปรเจกต์
2. `src/main.tsx` มีบรรทัด `import './theme/variables.css'`

### Electron หน้าจอขาว

Vite dev server ต้องรันอยู่ที่ port 5173 ก่อน Electron จะเปิดได้ — คำสั่ง `pnpm electron:dev` จัดการเรื่องนี้ให้อัตโนมัติผ่าน `wait-on`

### ชื่อไฟล์ Casing Error (Windows)

ถ้าเจอ error เกี่ยวกับ casing ของชื่อไฟล์ ให้ rename 2 ขั้น:

```bash
ren FileName.tsx temp.tsx
ren temp.tsx FileName.tsx
```