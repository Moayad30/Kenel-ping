#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "    🚀 Kernel Ping | كيرنال بينغ - وضع الإنتاج الكامل   "
echo "=========================================================="

# Build frontend if dist doesn't exist
if [ ! -d "$DIR/frontend/dist" ]; then
    echo "📦 بناء الواجهة الأمامية للإنتاج..."
    cd "$DIR/frontend"
    npm run build
    cd "$DIR"
fi

echo "🔊 تشغيل خادم Kernel Ping الموحد على المنفذ 8000..."
echo "  🌐 الواجهة العامة: http://0.0.0.0:8000/"
echo "  🔒 لوحة الإدارة:   http://0.0.0.0:8000/admin"

exec "$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --workers 1

