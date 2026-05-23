-- ============================================================
--  QR Code E-Menu — Database Schema
--  รันคำสั่งนี้ใน MySQL เพื่อสร้างฐานข้อมูลและตารางทั้งหมด
-- ============================================================

CREATE DATABASE IF NOT EXISTS restaurant_qrmenu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE restaurant_qrmenu;

-- ─── Tables (โต๊ะอาหาร) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tables` (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  table_number      VARCHAR(10)  NOT NULL UNIQUE,
  status            ENUM('vacant', 'occupied') NOT NULL DEFAULT 'vacant',
  current_customers INT          NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Categories (หมวดหมู่เมนู) ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id    INT          PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Menus (รายการเมนูอาหาร) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id           INT            PRIMARY KEY AUTO_INCREMENT,
  category_id  INT            NOT NULL,
  name         VARCHAR(200)   NOT NULL,
  price        DECIMAL(10,2)  NOT NULL,
  image_url    VARCHAR(500),
  is_available BOOLEAN        NOT NULL DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Orders (ออเดอร์หลัก) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             INT            PRIMARY KEY AUTO_INCREMENT,
  table_id       INT            NOT NULL,
  total_price    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  status         ENUM('pending','accepted','cooking','served','completed','cancelled')
                               NOT NULL DEFAULT 'pending',
  customer_count INT            NOT NULL DEFAULT 1,
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES `tables`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Order Items (รายการอาหารในออเดอร์) ──────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id        INT            PRIMARY KEY AUTO_INCREMENT,
  order_id  INT            NOT NULL,
  menu_id   INT            NOT NULL,
  quantity  INT            NOT NULL DEFAULT 1,
  price     DECIMAL(10,2)  NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id)  REFERENCES menus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  Seed Data — ข้อมูลตัวอย่าง
-- ============================================================

-- โต๊ะ 1-10
INSERT INTO `tables` (table_number) VALUES
  ('T01'),('T02'),('T03'),('T04'),('T05'),
  ('T06'),('T07'),('T08'),('T09'),('T10');

-- หมวดหมู่
INSERT INTO categories (name) VALUES
  ('อาหารจานหลัก'),
  ('เครื่องดื่ม'),
  ('ของหวาน'),
  ('เมนูแนะนำ');

-- เมนูตัวอย่าง
INSERT INTO menus (category_id, name, price, is_available) VALUES
  (1, 'ข้าวผัดกุ้ง',     89.00, TRUE),
  (1, 'ผัดกะเพราหมูสับ', 79.00, TRUE),
  (1, 'ต้มยำกุ้ง',       129.00, TRUE),
  (1, 'แกงเขียวหวานไก่', 99.00, TRUE),
  (2, 'น้ำเปล่า',         20.00, TRUE),
  (2, 'น้ำส้ม',           35.00, TRUE),
  (2, 'ชาไทย',            40.00, TRUE),
  (2, 'โค้ก',             35.00, TRUE),
  (3, 'ไอศกรีมวานิลลา',  59.00, TRUE),
  (3, 'ข้าวเหนียวมะม่วง', 79.00, TRUE),
  (4, 'ปลาทอดน้ำปลา',   119.00, TRUE),
  (4, 'ยำวุ้นเส้น',       89.00, TRUE);
