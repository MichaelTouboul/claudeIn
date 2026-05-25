#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null || true
  wait $SERVER_PID $CLIENT_PID 2>/dev/null || true
  docker compose down
  echo "Done."
}
trap cleanup EXIT INT TERM

# 1. Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d --wait

# 2. Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

# 3. Start server
echo "Starting server..."
export PG_PORT=5433
cd "$ROOT/server"
npx tsx watch src/index.ts &
SERVER_PID=$!
cd "$ROOT"

# Wait for server to be ready
echo "Waiting for server..."
until curl -sf http://localhost:3456/api/health > /dev/null 2>&1; do
  sleep 0.5
done
echo "Server ready."

# 4. Start client
echo "Starting client..."
cd "$ROOT/client"
npx vite --host &
CLIENT_PID=$!
cd "$ROOT"

# Wait for client to be ready
sleep 2

# 5. Open browser
echo "Opening browser..."
open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || true

echo ""
echo "==================================="
echo "  Agent Manager running"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3456"
echo "  Press Ctrl+C to stop"
echo "==================================="

wait
