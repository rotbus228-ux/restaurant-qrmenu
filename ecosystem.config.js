// PM2 Ecosystem Config
// ใช้ไฟล์นี้บน VPS เพื่อจัดการทุกร้านพร้อมกัน
// คำสั่ง: pm2 start ecosystem.config.js

module.exports = {
  apps: [

    // ─────────────────────────────────────────────────────────────────
    // ร้านที่ 1 — คัดลอก block นี้แล้วแก้ชื่อ/port/env เพื่อเพิ่มร้านใหม่
    // ─────────────────────────────────────────────────────────────────
    {
      name:   'resto-1',                          // ชื่อ process ใน PM2
      cwd:    '/var/www/resto-1/backend',          // path ของ backend
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV:           'production',
        PORT:               3001,                  // ← เปลี่ยนทุกร้าน
        DB_HOST:            'localhost',
        DB_USER:            'resto_1_user',
        DB_PASS:            'CHANGE_ME_STRONG_PASSWORD',
        DB_NAME:            'restaurant_resto_1',
        ADMIN_EMAILS:       'owner1@gmail.com',
        ADMIN_PASSWORD:     'CHANGE_ME_ADMIN_PASSWORD',
        JWT_SECRET:         'CHANGE_ME_RUN_openssl_rand_-hex_32',
        TELEGRAM_BOT_TOKEN: 'BOT_TOKEN_RESTO_1',
        TELEGRAM_CHAT_ID:   'CHAT_ID_RESTO_1',
        FRONTEND_URL:       'https://resto-1.yourdomain.com',
      },
    },

    // ─── ร้านที่ 2 (เพิ่มเมื่อมีลูกค้าใหม่) ─────────────────────────
    // {
    //   name:   'resto-2',
    //   cwd:    '/var/www/resto-2/backend',
    //   script: 'server.js',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '300M',
    //   env: {
    //     NODE_ENV:           'production',
    //     PORT:               3002,
    //     DB_HOST:            'localhost',
    //     DB_USER:            'resto_2_user',
    //     DB_PASS:            'CHANGE_ME',
    //     DB_NAME:            'restaurant_resto_2',
    //     ADMIN_EMAILS:       'owner2@gmail.com',
    //     ADMIN_PASSWORD:     'CHANGE_ME',
    //     JWT_SECRET:         'CHANGE_ME',
    //     TELEGRAM_BOT_TOKEN: 'BOT_TOKEN_RESTO_2',
    //     TELEGRAM_CHAT_ID:   'CHAT_ID_RESTO_2',
    //     FRONTEND_URL:       'https://resto-2.yourdomain.com',
    //   },
    // },

  ],
};
