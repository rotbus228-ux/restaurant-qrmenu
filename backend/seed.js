/**
 * seed.js — เติมข้อมูลตัวอย่างชุดพรีเมียม
 * node seed.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'restaurant_db';

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASS     || '',
      database: DB_NAME,
      multipleStatements: true,
    });

    console.log('✅ เชื่อมต่อ MySQL สำเร็จ');

    // ── 1. ตรวจสอบ / สร้างตาราง tables (โต๊ะ 1-10) ────────────────────────
    const [tableRows] = await conn.query('SELECT COUNT(*) AS cnt FROM `tables`');
    if (tableRows[0].cnt === 0) {
      const tableInserts = Array.from({ length: 10 }, (_, i) =>
        `('${i + 1}', 'vacant', 0)`
      ).join(',');
      await conn.query(
        `INSERT INTO \`tables\` (table_number, status, current_customers) VALUES ${tableInserts}`
      );
      console.log('✅ สร้างโต๊ะ 1-10 เรียบร้อย');
    } else {
      console.log(`ℹ️  tables มีข้อมูลอยู่แล้ว (${tableRows[0].cnt} แถว) — ข้าม`);
    }

    // ── 2. ตรวจสอบ / สร้าง categories ──────────────────────────────────────
    const [catRows] = await conn.query('SELECT COUNT(*) AS cnt FROM categories');
    let catIds = {};
    if (catRows[0].cnt === 0) {
      const cats = ['อาหารจานเดียว', 'อาหารประเภทน้ำ', 'ของทานเล่น', 'เครื่องดื่ม'];
      for (const name of cats) {
        const [r] = await conn.query(
          'INSERT INTO categories (name) VALUES (?)', [name]
        );
        catIds[name] = r.insertId;
      }
      console.log('✅ สร้างหมวดหมู่ 4 หมวด เรียบร้อย');
    } else {
      console.log(`ℹ️  categories มีข้อมูลอยู่แล้ว (${catRows[0].cnt} แถว) — ดึง ID`);
      const [existing] = await conn.query('SELECT id, name FROM categories');
      existing.forEach(r => { catIds[r.name] = r.id; });
    }

    // ── 3. ตรวจสอบ / สร้าง menus ───────────────────────────────────────────
    const [menuRows] = await conn.query('SELECT COUNT(*) AS cnt FROM menus');
    if (menuRows[0].cnt === 0) {
      // รีเฟรช catIds ให้แน่ใจว่าตรงกับ DB
      const [allCats] = await conn.query('SELECT id, name FROM categories');
      allCats.forEach(r => { catIds[r.name] = r.id; });

      const c1 = catIds['อาหารจานเดียว'] || 1;
      const c2 = catIds['อาหารประเภทน้ำ'] || 2;
      const c3 = catIds['ของทานเล่น']    || 3;
      const c4 = catIds['เครื่องดื่ม']    || 4;

      const menus = [
        // [category_id, name, price, image_url, is_available]
        [c1, 'ข้าวผัดกระเพราหมูสับไข่ดาว',   65,  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop', 1],
        [c1, 'ผัดไทยกุ้งสดพิเศษ',            89,  'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop', 1],
        [c1, 'ข้าวมันไก่ต้มซอสพิเศษ',         55,  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop', 1],
        [c1, 'ข้าวหมูแดงเป็ดย่างรวมมิตร',     75,  'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?w=400&h=300&fit=crop', 1],
        [c2, 'ต้มยำกุ้งน้ำข้น',               120, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop', 1],
        [c2, 'แกงเขียวหวานไก่',               85,  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop', 1],
        [c2, 'ต้มข่าไก่กะทิสด',               90,  'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop', 1],
        [c3, 'ไข่เจียวหมูสับทอดกรอบ',          55,  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', 1],
        [c3, 'ปีกไก่ทอดน้ำปลากระเทียม',       79,  'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop', 1],
        [c4, 'ชาไทยเย็นนมสด',                 35,  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', 1],
        [c4, 'น้ำมะพร้าวสดใหม่',               40,  'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop', 1],
        [c4, 'กาแฟโบราณร้อน/เย็น',            30,  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop', 1],
      ];

      for (const [cat_id, name, price, image_url, is_available] of menus) {
        await conn.query(
          'INSERT INTO menus (category_id, name, price, image_url, is_available) VALUES (?, ?, ?, ?, ?)',
          [cat_id, name, price, image_url, is_available]
        );
      }
      console.log(`✅ สร้างเมนูอาหาร ${menus.length} รายการ เรียบร้อย`);
    } else {
      console.log(`ℹ️  menus มีข้อมูลอยู่แล้ว (${menuRows[0].cnt} แถว) — ข้าม`);
    }

    // ── 4. สรุป ──────────────────────────────────────────────────────────────
    const [[{ tables_cnt }]] = await conn.query('SELECT COUNT(*) AS tables_cnt FROM `tables`');
    const [[{ cats_cnt }]]   = await conn.query('SELECT COUNT(*) AS cats_cnt FROM categories');
    const [[{ menus_cnt }]]  = await conn.query('SELECT COUNT(*) AS menus_cnt FROM menus');

    console.log('');
    console.log('📊 สรุปข้อมูลในฐานข้อมูล:');
    console.log(`   🪑 tables     : ${tables_cnt} โต๊ะ`);
    console.log(`   📂 categories : ${cats_cnt} หมวดหมู่`);
    console.log(`   🍜 menus      : ${menus_cnt} เมนู`);
    console.log('');
    console.log('🎉 Seed เสร็จสมบูรณ์! รีเฟรชหน้าเว็บได้เลย');

  } catch (err) {
    console.error('❌ Seed ล้มเหลว:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   👉 ตรวจสอบว่าเปิด XAMPP MySQL (พอร์ต 3306) แล้ว');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
