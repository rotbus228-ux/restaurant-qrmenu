#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  setup-vps.sh  —  ติดตั้ง VPS ใหม่ ทำแค่ครั้งเดียว
#  วิธีใช้: bash setup-vps.sh
# ════════════════════════════════════════════════════════════════
set -e
echo "🚀 เริ่มติดตั้ง VPS..."

# ─── 1. Update ───────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y

# ─── 2. Node.js 20 LTS ───────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "✅ Node.js: $(node -v)"

# ─── 3. PM2 ──────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "✅ PM2 installed"

# ─── 4. Nginx ────────────────────────────────────────────────
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx installed"

# ─── 5. MySQL ────────────────────────────────────────────────
apt-get install -y mysql-server
systemctl enable mysql
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'ROOT_PASS_CHANGE_ME'; FLUSH PRIVILEGES;"
echo "✅ MySQL installed"

# ─── 6. Certbot (SSL) ────────────────────────────────────────
apt-get install -y certbot python3-certbot-nginx
echo "✅ Certbot installed"

# ─── 7. Firewall ─────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "✅ Firewall configured"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ VPS พร้อมแล้ว! ขั้นตอนต่อไป:"
echo "   รัน: bash add-restaurant.sh"
echo "════════════════════════════════════════════════════════"
