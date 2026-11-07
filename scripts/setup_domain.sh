#!/usr/bin/env bash
# ==============================================================================
# Kernel Ping - Local Domain & mDNS Setup Script (kernelping.local)
# Supports: Fedora KDE 44 Workstation & Debian 13 Server
# ==============================================================================
set -e

DOMAIN="kernelping.local"
LOCAL_IP="127.0.0.1"

echo "=========================================================="
echo "  🌐 إعداد النطاق المحلي لنظام Kernel Ping: $DOMAIN"
echo "=========================================================="

# 1. Update /etc/hosts for local machine resolution
if grep -q "$DOMAIN" /etc/hosts 2>/dev/null; then
    echo "✔ النطاق $DOMAIN موجود بالفعل داخل /etc/hosts"
else
    echo "📝 إضافة $DOMAIN إلى /etc/hosts..."
    if [ "$(id -u)" -ne 0 ]; then
        echo "$LOCAL_IP  $DOMAIN" | sudo tee -a /etc/hosts >/dev/null
    else
        echo "$LOCAL_IP  $DOMAIN" >> /etc/hosts
    fi
    echo "✔ تمت إضافة $DOMAIN إلى /etc/hosts بنجاح!"
fi

# 2. Check and configure Avahi daemon for LAN mDNS broadcast
if command -v avahi-daemon >/dev/null 2>&1; then
    echo "✔ تم العثور على خادم Avahi (mDNS)"
    # Ensure avahi service is running
    if [ "$(id -u)" -ne 0 ]; then
        sudo systemctl enable --now avahi-daemon 2>/dev/null || true
    else
        systemctl enable --now avahi-daemon 2>/dev/null || true
    fi
    echo "✔ تم تفعيل خدمة Avahi لنشر النطاق عبر الشبكة المحلية"
else
    echo "ℹ️ لنشر $DOMAIN عبر كافة أجهزة الشبكة (Wi-Fi/LAN)، يرجى تثبيت avahi:"
    echo "   - على فيدورا: sudo dnf install -y avahi avahi-tools"
    echo "   - على ديبيان: sudo apt update && sudo apt install -y avahi-daemon avahi-utils"
fi

# 3. Port Redirection (Port 80 -> Port 8000) so no ':8000' is needed in browser
echo ""
echo "💡 لتشغيل الموقع مباشرة عبر الرابط http://$DOMAIN بدون كتابة رقم المنفذ :8000:"
echo "   يمكنك تحويل المنفذ 80 إلى 8000 عبر الأمر التالي:"
echo "   sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000"
echo "   (أو استخدام Nginx / Caddy كخادم وسيط موضح في مجلد docs)"
echo ""
echo "🎉 اكتمل الإعداد! يمكنك الآن فتح المتصفح والدخول إلى:"
echo "   http://$DOMAIN:8000/"
echo "   أو لوحة الإدارة: http://$DOMAIN:8000/admin"

