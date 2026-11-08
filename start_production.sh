#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "        🚀 Kernel Ping - Full Production Environment      "
echo "=========================================================="

# 1. Check Python Virtual Environment
if [ ! -d "$DIR/venv" ]; then
    echo "❌ Virtual environment not found at $DIR/venv"
    exit 1
fi

# 2. Ensure Chime Audio Files Exist
"$DIR/venv/bin/python3" "$DIR/backend/generate_chimes.py" 2>/dev/null || true

# 3. Always build production frontend to guarantee latest updates
echo "📦 Building production frontend assets..."
cd "$DIR/frontend"
npm run build
cd "$DIR"

# 4. Clean up any stale process occupying port 8000
echo "🧹 Checking port 8000..."
fuser -k 8000/tcp 2>/dev/null || true
sleep 0.5

# 5. Detect local network IP address for mobile access
PRIMARY_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$PRIMARY_IP" ] || [ "$PRIMARY_IP" == "127.0.0.1" ]; then
    PRIMARY_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$PRIMARY_IP" ]; then
    PRIMARY_IP="127.0.0.1"
fi

echo ""
echo "=========================================================="
echo "  🔊 Kernel Ping is running on 0.0.0.0:8000"
echo ""
echo "  💻 Access from this PC:"
echo "     👉 http://localhost:8000/"
echo "     🔒 http://localhost:8000/admin"
echo ""
echo "  📱 Access from Mobile Phones or other devices (Same Wi-Fi):"
echo "     👉 http://$PRIMARY_IP:8000/"
echo "     🔒 http://$PRIMARY_IP:8000/admin"
echo ""
echo "  ⚠️  Mobile Connection Checklist:"
echo "     1. Phone must be on the same Wi-Fi network as this PC."
echo "     2. You MUST include ':8000' at the end of the address."
echo "     3. If connection times out, grant firewall access for port 8000:"
echo "        sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT"
echo "        (or: sudo ufw allow 8000/tcp)"
echo "=========================================================="
echo "Press Ctrl+C to stop the server at any time."
echo ""

exec "$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --workers 1
