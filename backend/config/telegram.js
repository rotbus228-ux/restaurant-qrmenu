const axios = require('axios');
require('dotenv').config();

/**
 * ส่งข้อความแจ้งเตือนออเดอร์ใหม่ผ่าน Telegram Bot
 *
 * @param {Object}        orderData   - ข้อมูลออเดอร์ { total_price, ... }
 * @param {string|number} tableNumber - หมายเลขโต๊ะที่แสดงให้ลูกค้าเห็น
 * @param {Array}         items       - รายการอาหาร [{ name, quantity, note, unitPrice|price }]
 */
async function sendOrderNotification(orderData, tableNumber, items) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[Telegram] ⚠️  TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID ยังไม่ได้ตั้งค่าใน .env — ข้ามการแจ้งเตือน');
    return;
  }

  // ─── เวลาปัจจุบัน (Bangkok) ─────────────────────────────────────────────
  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour:     '2-digit',
    minute:   '2-digit',
  });

  // ─── สร้างบรรทัดรายการอาหาร ──────────────────────────────────────────────
  const itemLines = (items || []).map((item) => {
    const name  = item.name || item.ordered_menu_name || 'ไม่ทราบชื่อเมนู';
    const qty   = Number(item.quantity) || 1;
    // รองรับทั้ง unitPrice (มี options) และ price (ราคาฐาน)
    const price = Number(item.unitPrice ?? item.price) || 0;
    const note  = item.note && String(item.note).trim() ? String(item.note).trim() : '-';

    return (
      `• 🍴 ${name} x ${qty}\n` +
      `  🔸 หมายเหตุ: ${note}\n` +
      `  🔸 ราคา: ${price.toFixed(0)} บาท`
    );
  }).join('\n\n');

  const totalPrice = Number(orderData.total_price) || 0;

  // ─── ประกอบข้อความตามฟอร์แมตที่กำหนด ────────────────────────────────────
  const message =
    `📝 มีออเดอร์ใหม่เข้าครัว!\n` +
    `🪑 โต๊ะ: ${tableNumber}\n\n` +
    `🍽️ รายการอาหารที่สั่ง:\n` +
    `${itemLines}\n\n` +
    `💰 ยอดรวมออเดอร์นี้: ${totalPrice.toFixed(0)} บาท\n` +
    `----------------------------------\n` +
    `⏱️ เวลาที่สั่ง: ${now} น.`;

  // ─── ส่งข้อความหา Telegram ───────────────────────────────────────────────
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: CHAT_ID,
    text:    message,
    // ไม่ใส่ parse_mode → plain text (ปลอดภัยกับทุก input)
  });

  console.log(`[Telegram] ✅ แจ้งเตือนออเดอร์โต๊ะ ${tableNumber} สำเร็จ`);
}

module.exports = { sendOrderNotification };
