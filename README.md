# 🍽️ QR Code E-Menu & Real-time Admin Dashboard

> ระบบสั่งอาหารผ่าน QR Code พร้อมหน้าจัดการออเดอร์แบบ Real-time สำหรับร้านอาหาร  
> รองรับการแจ้งเตือนพนักงานทันทีผ่าน LINE Messaging API และ Telegram Bot API

---

## 🛠️ Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| **Backend** | Node.js, Express, Socket.io, MySQL2, dotenv, cors   |
| **Frontend**| React (Vite), TailwindCSS, Socket.io Client         |
| **Notify**  | LINE Messaging API (Flex Message), Telegram Bot API |
| **Database**| MySQL                                               |

---

## 📁 Project Structure

```
restaurant-qrmenu/
├── README.md
│
├── backend/
│   ├── config/
│   │   ├── db.js               # MySQL connection pool
│   │   ├── line.js             # LINE Messaging API client setup
│   │   └── telegram.js         # Telegram Bot API helper
│   ├── controllers/
│   │   ├── orderController.js  # ตรรกะการสร้าง/อัปเดตออเดอร์
│   │   └── menuController.js   # CRUD เมนูอาหาร
│   ├── routes/
│   │   └── api.js              # รวม API routes ทั้งหมด
│   ├── .env                    # Environment variables (ไม่ commit)
│   ├── .env.example            # ตัวอย่าง env
│   ├── package.json
│   └── server.js               # Entry point: Express + Socket.io
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/         # Reusable UI components
    │   ├── pages/
    │   │   ├── client/
    │   │   │   └── [table_id].jsx   # หน้าลูกค้าสั่งอาหาร
    │   │   └── admin/
    │   │       ├── dashboard.jsx    # Admin Dashboard (Real-time)
    │   │       └── menu-manage.jsx  # จัดการเมนูอาหาร (CRUD)
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## 🗄️ Database Schema

### `tables` — โต๊ะอาหาร
```sql
CREATE TABLE tables (
  id               INT          PRIMARY KEY AUTO_INCREMENT,
  table_number     VARCHAR(10)  NOT NULL UNIQUE,
  status           ENUM('vacant', 'occupied') NOT NULL DEFAULT 'vacant',
  current_customers INT         NOT NULL DEFAULT 0,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `categories` — หมวดหมู่เมนู
```sql
CREATE TABLE categories (
  id    INT         PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(100) NOT NULL
);
```

### `menus` — รายการเมนูอาหาร
```sql
CREATE TABLE menus (
  id           INT            PRIMARY KEY AUTO_INCREMENT,
  category_id  INT            NOT NULL,
  name         VARCHAR(200)   NOT NULL,
  price        DECIMAL(10, 2) NOT NULL,
  image_url    VARCHAR(500),
  is_available BOOLEAN        NOT NULL DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

### `orders` — ออเดอร์หลัก
```sql
CREATE TABLE orders (
  id             INT            PRIMARY KEY AUTO_INCREMENT,
  table_id       INT            NOT NULL,
  total_price    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status         ENUM('pending', 'accepted', 'cooking', 'served', 'completed', 'cancelled')
                               NOT NULL DEFAULT 'pending',
  customer_count INT            NOT NULL DEFAULT 1,
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id)
);
```

### `order_items` — รายการอาหารในออเดอร์
```sql
CREATE TABLE order_items (
  id        INT            PRIMARY KEY AUTO_INCREMENT,
  order_id  INT            NOT NULL,
  menu_id   INT            NOT NULL,
  quantity  INT            NOT NULL DEFAULT 1,
  price     DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id)  REFERENCES menus(id)
);
```

---

## ⚙️ Core Features & Flow

### 🔵 ฝั่งลูกค้า (Customer Flow)
1. ลูกค้าสแกน QR Code → เปิด URL รูปแบบ `http://<host>/table?table_id=X`
2. ระบบ **บังคับให้ระบุจำนวนคน** (Modal กรอกจำนวนก่อนดูเมนู)
3. ลูกค้าเลือกเมนู → กดสั่งอาหาร
4. Frontend ส่ง POST `/api/orders` → Backend บันทึกลง MySQL
5. Server emit Socket.io event `new_order` → Admin Dashboard อัปเดต Real-time
6. Backend ยิง **LINE Flex Message** + **Telegram Message** แจ้งพนักงาน

### 🟠 ฝั่งแอดมิน (Admin Flow)
1. Admin Dashboard รับ Socket.io events → อัปเดต UI แบบ Real-time (ไม่ต้องรีเฟรช)
2. แอดมินอัปเดตสถานะออเดอร์: `pending → accepted → cooking → served → completed`
3. เมื่ออัปเดตสถานะ → emit event กลับไปยัง client โต๊ะนั้น
4. จัดการข้อมูลเมนูผ่านหน้า Menu Management (CRUD)

### 🟢 Real-time Events (Socket.io)
| Event              | Direction        | Description                          |
|--------------------|------------------|--------------------------------------|
| `new_order`        | Server → Admin   | มีออเดอร์ใหม่เข้ามา                  |
| `order_status_update` | Server → Client | สถานะออเดอร์เปลี่ยน                |
| `table_status_update` | Server → All   | สถานะโต๊ะเปลี่ยน (ว่าง/ไม่ว่าง)    |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- MySQL >= 8.x
- npm >= 9.x

### 1. Clone & Setup

```bash
git clone <repo-url>
cd restaurant-qrmenu
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# แก้ไข .env ให้ตรงกับ environment ของคุณ
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables (backend/.env)

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=restaurant_qrmenu

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_USER_ID=your_line_user_or_group_id

# Telegram Bot API
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

---

## 📦 Dependencies

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "express": "^4.x",
    "mysql2": "^3.x",
    "socket.io": "^4.x",
    "dotenv": "^16.x",
    "cors": "^2.x",
    "@line/bot-sdk": "^9.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "nodemon": "^3.x"
  }
}
```

### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "socket.io-client": "^4.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

---

## 🗺️ API Endpoints

| Method | Endpoint                      | Description                   |
|--------|-------------------------------|-------------------------------|
| GET    | `/api/tables`                 | ดึงข้อมูลโต๊ะทั้งหมด           |
| GET    | `/api/menus`                  | ดึงเมนูทั้งหมด (กรองตาม category) |
| POST   | `/api/menus`                  | เพิ่มเมนูใหม่ (Admin)         |
| PUT    | `/api/menus/:id`              | แก้ไขเมนู (Admin)             |
| DELETE | `/api/menus/:id`              | ลบเมนู (Admin)                |
| POST   | `/api/orders`                 | สร้างออเดอร์ใหม่              |
| GET    | `/api/orders`                 | ดึงออเดอร์ทั้งหมด (Admin)     |
| PATCH  | `/api/orders/:id/status`      | อัปเดตสถานะออเดอร์ (Admin)    |
| PATCH  | `/api/tables/:id/customers`   | อัปเดตจำนวนลูกค้าที่โต๊ะ     |

---

## 🔔 Notification Templates

### LINE Flex Message (ออเดอร์ใหม่)
- Header: "📋 มีออเดอร์ใหม่!"
- Body: โต๊ะ, จำนวนลูกค้า, รายการอาหาร, ราคารวม
- Footer: เวลาที่สั่ง

### Telegram Message (ออเดอร์ใหม่)
```
🛎️ ออเดอร์ใหม่!
โต๊ะ: {table_number}
จำนวนคน: {customer_count} คน
รายการ:
  - {item_name} x{qty} = {price} บาท
รวม: {total_price} บาท
เวลา: {created_at}
```

---

## 📝 Development Roadmap

- [x] วางแผนโครงสร้างโปรเจกต์ (README)
- [ ] สร้างฐานข้อมูลและ schema
- [ ] Backend: Express server + API routes
- [ ] Backend: Socket.io integration
- [ ] Backend: LINE & Telegram notification
- [ ] Frontend: หน้าลูกค้า (E-Menu)
- [ ] Frontend: Admin Dashboard (Real-time)
- [ ] Frontend: Menu Management (CRUD)
- [ ] Testing & Deployment

---

*Last updated: 2026-05-21*
