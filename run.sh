#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "          🚀 Kernel Ping - Development Environment        "
echo "=========================================================="

# Check Python Virtual Environment
if [ ! -d "$DIR/venv" ]; then
    echo "❌ Virtual environment not found at $DIR/venv"
    exit 1
fi

# Ensure chimes exist
python3 "$DIR/backend/generate_chimes.py" 2>/dev/null || true

# Kill background child processes on exit
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

echo "🔊 [1/2] Starting FastAPI backend server on port 8000..."
"$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 &

echo "🎨 [2/2] Starting Vite frontend server on port 5173..."
cd "$DIR/frontend"
NODE_OPTIONS="--dns-result-order=ipv4first" npm run dev &

echo ""
echo "=========================================================="
echo "  ✅ Public Member Workspace: https://localhost:5173/ (or http://localhost:5173)"
echo "  🔒 Admin Control Center:    https://localhost:5173/admin"
echo "  📱 Mobile Access (HTTPS):   https://<SERVER_IP>:5173/admin"
echo "  ⚡ Interactive API Docs:    http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop all servers at any time."

wait
