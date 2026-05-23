/**
 * migrate-serving.js
 * รันครั้งเดียวเพื่อเพิ่มสถานะ 'serving' ลงใน ENUM ของตาราง orders
 * node migrate-serving.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'restaurant_db',
    });

    await conn.query(`
      ALTER TABLE orders
      MODIFY COLUMN status
      ENUM('pending','preparing','serving','served','completed','cancelled')
      DEFAULT 'pending'
    `);

    console.log('✅ Migration สำเร็จ: เพิ่มสถานะ "serving" ลงใน orders.status ENUM แล้ว');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate')) {
      console.log('ℹ️  ไม่ต้องทำ migration — สถานะ "serving" มีอยู่แล้ว');
    } else {
      console.error('❌ Migration ล้มเหลว:', err.message);
      if (err.code === 'ECONNREFUSED') console.error('   👉 ตรวจสอบว่าเปิด XAMPP MySQL แล้ว');
      process.exit(1);
    }
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
