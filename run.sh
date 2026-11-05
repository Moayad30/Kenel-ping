#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "      🚀 Kernel Ping | كيرنال بينغ - بيئة التطوير        "
echo "=========================================================="

# Check Python Venv
if [ ! -d "$DIR/venv" ]; then
    echo "❌ Virtual environment not found at $DIR/venv"
    exit 1
fi

# Ensure chimes exist
python3 "$DIR/backend/generate_chimes.py" 2>/dev/null || true

# Kill background child processes on exit
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

echo "🔊 [1/2] تشغيل خادم الباك إند FastAPI على المنفذ 8000..."
"$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 &

echo "🎨 [2/2] تشغيل خادم الواجهة Vite على المنفذ 5173..."
cd "$DIR/frontend"
NODE_OPTIONS="--dns-result-order=ipv4first" npm run dev &

echo ""
echo "=========================================================="
echo "  ✅ واجهة الأعضاء العامة: http://localhost:5173/"
echo "  🔒 لوحة الإدارة المخفية:  http://localhost:5173/admin"
echo "  ⚡ موثق الـ API المباشر: http://localhost:8000/docs"
echo "=========================================================="
echo "اضغط Ctrl+C لإيقاف الخوادم في أي وقت."

wait

