#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  add-restaurant.sh  —  เพิ่มร้านใหม่บน VPS
#  วิธีใช้: bash add-restaurant.sh
# ════════════════════════════════════════════════════════════════
set -e

echo "════════════════════════════════════════════════════════"
echo "  🍽️  เพิ่มร้านอาหารใหม่"
echo "════════════════════════════════════════════════════════"

# ─── รับข้อมูลจากผู้ใช้ ──────────────────────────────────────
read -p "ชื่อย่อร้าน (เช่น khao-pad, somtum): " SLUG
read -p "โดเมน subdomain (เช่น khaopat.yourdomain.com): " DOMAIN
read -p "Port (เช่น 3001, 3002, 3003 ...): " PORT
read -p "Email เจ้าของร้าน: " ADMIN_EMAIL
read -p "รหัสผ่าน Admin: " ADMIN_PASS
read -p "Telegram Bot Token: " TG_TOKEN
read -p "Telegram Chat ID: " TG_CHAT

# ─── Auto-generate ───────────────────────────────────────────
DB_NAME="restaurant_${SLUG//-/_}"
DB_USER="${SLUG//-/_}_user"
DB_PASS=$(openssl rand -base64 16)
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "📋 สรุปข้อมูลที่จะสร้าง:"
echo "   Slug:    $SLUG"
echo "   Domain:  $DOMAIN"
echo "   Port:    $PORT"
echo "   DB Name: $DB_NAME"
echo "   DB User: $DB_USER"
echo ""
read -p "ยืนยัน? (y/n): " CONFIRM
[[ $CONFIRM != "y" ]] && echo "ยกเลิก" && exit 0

# ─── 1. สร้างโฟลเดอร์ ────────────────────────────────────────
mkdir -p /var/www/$SLUG/backend
mkdir -p /var/www/$SLUG/frontend
echo "✅ สร้างโฟลเดอร์ /var/www/$SLUG/"

# ─── 2. สร้าง MySQL DB + User ────────────────────────────────
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
echo "✅ สร้าง MySQL DB: $DB_NAME"

# ─── 3. สร้างไฟล์ .env ───────────────────────────────────────
cat > /var/www/$SLUG/backend/.env <<EOF
NODE_ENV=production
PORT=$PORT
FRONTEND_URL=https://$DOMAIN

DB_HOST=localhost
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME

ADMIN_EMAILS=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASS
JWT_SECRET=$JWT_SECRET

TELEGRAM_BOT_TOKEN=$TG_TOKEN
TELEGRAM_CHAT_ID=$TG_CHAT
EOF
chmod 600 /var/www/$SLUG/backend/.env
echo "✅ สร้างไฟล์ .env (auto-generated passwords)"

# ─── 4. สร้าง Nginx config ───────────────────────────────────
cat > /etc/nginx/sites-available/$SLUG <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    root /var/www/$SLUG/frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /backend/ {
        proxy_pass         http://localhost:$PORT/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass         http://localhost:$PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
    }
}
EOF
ln -sf /etc/nginx/sites-available/$SLUG /etc/nginx/sites-enabled/
echo "✅ สร้าง Nginx config"

# ─── 5. SSL Certificate ──────────────────────────────────────
echo "📌 กำลังขอ SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
echo "✅ SSL ติดตั้งแล้ว"

# ─── 6. Reload Nginx ─────────────────────────────────────────
nginx -t && systemctl reload nginx
echo "✅ Nginx reloaded"

# ─── 7. สรุป ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ ร้าน '$SLUG' พร้อมแล้ว!"
echo ""
echo "📋 ขั้นตอนต่อไป (ทำบนเครื่องตัวเอง):"
echo ""
echo "  1. Build frontend:"
echo "     cd frontend"
echo "     VITE_API_URL=https://$DOMAIN/backend npm run build"
echo ""
echo "  2. Upload ไฟล์:"
echo "     scp -r frontend/dist/* root@VPS_IP:/var/www/$SLUG/frontend/"
echo "     scp -r backend/* root@VPS_IP:/var/www/$SLUG/backend/"
echo ""
echo "  3. ติดตั้ง dependencies บน VPS:"
echo "     cd /var/www/$SLUG/backend && npm install --production"
echo ""
echo "  4. Import database:"
echo "     mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < restaurant_db_backup.sql"
echo ""
echo "  5. เปิด backend:"
echo "     pm2 start /var/www/$SLUG/backend/server.js --name $SLUG"
echo "     pm2 save"
echo ""
echo "  🌐 URL: https://$DOMAIN"
echo "  🔑 Admin: https://$DOMAIN/admin/login"
echo "  📧 Email: $ADMIN_EMAIL"
echo "════════════════════════════════════════════════════════"
