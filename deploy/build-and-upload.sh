#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  build-and-upload.sh  —  Build frontend + upload ขึ้น VPS
#  วิธีใช้: bash deploy/build-and-upload.sh
# ════════════════════════════════════════════════════════════════

read -p "VPS IP address: " VPS_IP
read -p "ชื่อย่อร้าน (slug) เช่น resto-1: " SLUG
read -p "Domain ร้าน เช่น resto-1.yourdomain.com: " DOMAIN

echo ""
echo "📦 กำลัง Build frontend..."
cd frontend
VITE_API_URL=https://$DOMAIN/backend npm run build
echo "✅ Build เสร็จ"

echo ""
echo "📤 กำลัง Upload ขึ้น VPS..."
scp -r dist/* root@$VPS_IP:/var/www/$SLUG/frontend/
echo "✅ Upload frontend เสร็จ"

echo ""
echo "📤 กำลัง Upload backend..."
cd ../backend
scp -r . root@$VPS_IP:/var/www/$SLUG/backend/ --exclude=node_modules --exclude=.env
echo "✅ Upload backend เสร็จ"

echo ""
echo "⚙️  ติดตั้ง dependencies + restart..."
ssh root@$VPS_IP "
  cd /var/www/$SLUG/backend
  npm install --production
  pm2 restart $SLUG || pm2 start server.js --name $SLUG
  pm2 save
"

echo ""
echo "════════════════════════════════════════"
echo "✅ Deploy เสร็จ! เปิดเว็บ: https://$DOMAIN"
echo "════════════════════════════════════════"
