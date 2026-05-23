const axios = require('axios');
require('dotenv').config();

/**
 * ส่ง LINE Text Message แจ้งเตือนออเดอร์ใหม่ (รูปแบบ emoji ตามที่กำหนด)
 * ต้องการ env: LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID
 */
async function sendOrderNotification(order, tableNumber, items) {
  const userId = process.env.LINE_USER_ID;
  const token  = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!userId || !token) {
    console.warn('[LINE] LINE_USER_ID หรือ LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งค่า — ข้ามการแจ้งเตือน');
    return;
  }

  // ─── สร้างรายการอาหาร ─────────────────────────────────────────────────────
  const itemLines = items.map(item => {
    const lines = [
      `• 🍴 ${item.name}`,
      `  🔸 จำนวน: ${item.quantity}`,
      `  🔸 ราคาต่อชิ้น: ${Number(item.unitPrice ?? item.price).toFixed(0)} บาท`,
    ];
    if (item.note) lines.push(`  🔸 หมายเหตุ: ${item.note}`);
    return lines.join('\n');
  }).join('\n\n');

  const message =
    `📝 การสั่งซื้อใหม่\n` +
    `🪑 โต๊ะ: ${tableNumber}\n\n` +
    `🍽️ รายการอาหาร:\n${itemLines}\n\n` +
    `💰 ยอดรวมทั้งหมด: ${Number(order.total_price).toFixed(0)} บาท`;

  await axios.post(
    'https://api.line.me/v2/bot/message/push',
    {
      to: userId,
      messages: [{ type: 'text', text: message }],
    },
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
}

module.exports = { sendOrderNotification };
