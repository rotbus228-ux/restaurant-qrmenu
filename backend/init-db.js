/**
 * init-db.js — สคริปต์เนรมิตฐานข้อมูลและตารางทั้งหมด
 * รันครั้งเดียว: node init-db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'restaurant_db';

// ─── SQL: สร้างตารางทั้ง 5 ─────────────────────────────────────────────────

const SQL_TABLES = `
-- 1. tables (โต๊ะในร้าน)
CREATE TABLE IF NOT EXISTS \`tables\` (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  table_number     VARCHAR(10)  NOT NULL UNIQUE,
  status           ENUM('vacant', 'occupied') DEFAULT 'vacant',
  current_customers INT         DEFAULT 0,
  updated_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. categories (หมวดหมู่เมนู)
CREATE TABLE IF NOT EXISTS categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. menus (รายการเมนูอาหาร)
CREATE TABLE IF NOT EXISTS menus (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category_id  INT,
  name         VARCHAR(255)   NOT NULL,
  price        DECIMAL(10,2)  NOT NULL,
  image_url    VARCHAR(255),
  is_available BOOLEAN        DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. orders (คำสั่งซื้อ)
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  table_id       INT,
  total_price    DECIMAL(10,2) NOT NULL,
  status         ENUM('pending', 'preparing', 'serving', 'served', 'completed', 'cancelled') DEFAULT 'pending',
  customer_count INT           DEFAULT 1,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. order_items (รายการอาหารในแต่ละคำสั่งซื้อ)
CREATE TABLE IF NOT EXISTS order_items (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  order_id  INT,
  menu_id   INT,
  quantity  INT           NOT NULL,
  price     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
  FOREIGN KEY (menu_id)  REFERENCES menus(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// ─── Main ──────────────────────────────────────────────────────────────────

async function init() {
  let conn;

  try {
    // 1. เชื่อมต่อ MySQL หลัก (ยังไม่เลือก database)
    console.log('⏳ กำลังเชื่อมต่อ MySQL...');
    conn = await mysql.createConnection({
      host    : process.env.DB_HOST || 'localhost',
      port    : Number(process.env.DB_PORT) || 3306,
      user    : process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
    });
    console.log('✅ เชื่อมต่อ MySQL สำเร็จ');

    // 2. สร้าง Database
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${DB_NAME}" พร้อมใช้งาน`);

    // 3. สลับไปใช้ Database ที่สร้าง
    await conn.query(`USE \`${DB_NAME}\``);

    // 4. สร้างตารางทีละคำสั่ง
    //    - ลบ comment (-- ...) ออกก่อน แล้วค่อยแยกด้วย ;
    const statements = SQL_TABLES
      .replace(/--[^\n]*/g, '')   // ลบ single-line comments ออกก่อน
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sql of statements) {
      await conn.query(sql);
    }

    console.log('');
    console.log('📋 ตารางที่สร้างสำเร็จ:');
    console.log('   ✅  tables       — โต๊ะในร้าน');
    console.log('   ✅  categories   — หมวดหมู่เมนู');
    console.log('   ✅  menus        — รายการเมนูอาหาร');
    console.log('   ✅  orders       — คำสั่งซื้อ');
    console.log('   ✅  order_items  — รายการอาหารในคำสั่งซื้อ');
    console.log('');
    console.log('🎉 เนรมิตฐานข้อมูลเสร็จสมบูรณ์!');

  } catch (err) {
    console.error('');
    console.error('❌ เกิดข้อผิดพลาด:', err.message);
    console.error('');
    if (err.code === 'ECONNREFUSED') {
      console.error('👉 ตรวจสอบว่าเปิด XAMPP MySQL (พอร์ต 3306) แล้วหรือยัง');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 ตรวจสอบ DB_USER / DB_PASS ใน .env ว่าถูกต้อง');
    }
    process.exit(1);

  } finally {
    if (conn) await conn.end();
  }
}

init();
