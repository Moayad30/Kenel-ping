#!/usr/bin/env bash
# ==============================================================================
# Kernel Ping - Local Domain & mDNS Setup Script (kernelping.local)
# Supports: Fedora KDE 44 Workstation & Debian 13 Server
# ==============================================================================
set -e

DOMAIN="kernelping.local"
LOCAL_IP="127.0.0.1"

echo "=========================================================="
echo "  🌐 Setting up local domain for Kernel Ping: $DOMAIN"
echo "=========================================================="

# 1. Update /etc/hosts for local machine resolution
if grep -q "$DOMAIN" /etc/hosts 2>/dev/null; then
    echo "✔ Domain $DOMAIN is already present in /etc/hosts"
else
    echo "📝 Adding $DOMAIN to /etc/hosts..."
    if [ "$(id -u)" -ne 0 ]; then
        echo "$LOCAL_IP  $DOMAIN" | sudo tee -a /etc/hosts >/dev/null
    else
        echo "$LOCAL_IP  $DOMAIN" >> /etc/hosts
    fi
    echo "✔ Successfully added $DOMAIN to /etc/hosts!"
fi

# 2. Check and configure Avahi daemon for LAN mDNS broadcast
if command -v avahi-daemon >/dev/null 2>&1; then
    echo "✔ Avahi daemon (mDNS) found."
    # Ensure avahi service is running
    if [ "$(id -u)" -ne 0 ]; then
        sudo systemctl enable --now avahi-daemon 2>/dev/null || true
    else
        systemctl enable --now avahi-daemon 2>/dev/null || true
    fi
    echo "✔ Avahi daemon enabled for broadcasting across the local network."
else
    echo "ℹ️ To broadcast $DOMAIN across all local network devices (Wi-Fi/LAN), please install avahi:"
    echo "   - On Fedora: sudo dnf install -y avahi avahi-tools"
    echo "   - On Debian: sudo apt update && sudo apt install -y avahi-daemon avahi-utils"
fi

# 3. Port Redirection (Port 80 -> Port 8000) so no ':8000' is needed in browser
echo ""
echo "💡 To access the website directly via http://$DOMAIN without specifying port :8000:"
echo "   You can redirect port 80 to 8000 using iptables:"
echo "   sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000"
echo "   (or configure an Nginx / Caddy reverse proxy as detailed in docs)"
echo ""
echo "🎉 Setup complete! You can now open your browser and navigate to:"
echo "   http://$DOMAIN:8000/"
echo "   or Admin Console: http://$DOMAIN:8000/admin"
