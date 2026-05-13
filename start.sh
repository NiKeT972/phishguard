#!/usr/bin/env bash
# PhishGuard — Startup Script (Linux / Mac)
# Team: DATA MAVERICKS | KLEOS 4.0

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ____  _     _     _       ____                     _ "
echo " |  _ \| |__ (_)___| |__   / ___|_   _  __ _ _ __ __| |"
echo " | |_) | '_ \| / __| '_ \ | |  _| | | |/ _\` | '__/ _\` |"
echo " |  __/| | | | \__ \ | | || |_| | |_| | (_| | | | (_| |"
echo " |_|   |_| |_|_|___/_| |_| \____|_\__,_|\__,_|_|  \__,_|"
echo ""
echo "  India's AI-powered scam shield | Team: DATA MAVERICKS"
echo -e "${NC}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# ─── Backend setup ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/4] Setting up Python backend...${NC}"
cd "$BACKEND_DIR"

if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo -e "${RED}Error: Python not found. Install Python 3.9+${NC}"
    exit 1
fi

echo "      Installing Python dependencies..."
$PYTHON -m pip install -r requirements.txt -q

# ─── Frontend setup ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/4] Setting up React frontend...${NC}"
cd "$FRONTEND_DIR"

if ! command -v npm &>/dev/null; then
    echo -e "${RED}Error: Node.js / npm not found. Install Node.js 16+${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "      Installing npm dependencies..."
    npm install --silent
fi

# ─── Start backend ────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Starting backend on port 8000...${NC}"
cd "$BACKEND_DIR"
$PYTHON -m uvicorn main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!
echo -e "      Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "      Waiting for backend to start..."
for i in {1..20}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo -e "${GREEN}      ✅ Backend is ready!${NC}"
        break
    fi
    sleep 1
done

# ─── Start frontend ────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Starting frontend on port 3000...${NC}"
cd "$FRONTEND_DIR"
BROWSER=none npm start &
FRONTEND_PID=$!

sleep 4

# ─── Open browser ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   PhishGuard is ready!                     ║${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}║   App:  http://localhost:3000              ║${NC}"
echo -e "${GREEN}║   API:  http://localhost:8000              ║${NC}"
echo -e "${GREEN}║   Docs: http://localhost:8000/docs         ║${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Try to open browser
if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:3000
elif command -v open &>/dev/null; then
    open http://localhost:3000
fi

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Done. Goodbye!${NC}"
    exit 0
}
trap cleanup INT TERM

wait
