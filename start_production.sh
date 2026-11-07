#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "        🚀 Kernel Ping - Full Production Environment      "
echo "=========================================================="

# Build frontend if dist doesn't exist
if [ ! -d "$DIR/frontend/dist" ]; then
    echo "📦 Building production frontend assets..."
    cd "$DIR/frontend"
    npm run build
    cd "$DIR"
fi

echo "🔊 Starting unified Kernel Ping server on port 8000..."
echo "  🌐 Public Workspace: http://0.0.0.0:8000/"
echo "  🔒 Admin Console:    http://0.0.0.0:8000/admin"

exec "$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --workers 1
