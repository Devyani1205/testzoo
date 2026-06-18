#!/bin/bash
# TestZoo — Quick Start Script
# Run from the testzoo/ directory

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ___         _   ____             "
echo " |_ _|___  __|_|_|_  /___  ___    "
echo "  | |/ _ \/ __| __|/ // _ \/ _ \  "
echo "  |_|\___/\__ | |/___|___/\___/   "
echo -e "${NC}"
echo -e "${GREEN}TestZoo — Diagnostic Test Marketplace${NC}"
echo ""

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install Python 3.11+"; exit 1
fi
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 20+"; exit 1
fi

echo -e "${YELLOW}[1/4] Setting up backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
pip install -r requirements.txt -q

echo -e "${YELLOW}[2/4] Creating .env from testzoo.env...${NC}"
cd ..
if [ ! -f "backend/.env" ]; then
    cp testzoo.env backend/.env
fi

echo -e "${YELLOW}[3/4] Seeding database...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
python -m app.seed_data 2>/dev/null || echo "  (seed skipped — DB may already have data)"

echo -e "${YELLOW}[4/4] Starting servers...${NC}"
cd ..

# Start backend
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start MCP servers
python -m app.mcp.mcp_catalog_server &
python -m app.mcp.mcp_orders_whatsapp_server &
python -m app.mcp.mcp_payment_wallet_server &
python -m app.mcp.mcp_doctor_dashboard_server &
python -m app.mcp.mcp_patient_server &
cd ..

# Start frontend
cd frontend
if [ ! -d "node_modules" ]; then npm install -q; fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ TestZoo is running!${NC}"
echo ""
echo "  🌐 Frontend:      http://localhost:3000"
echo "  🔌 API:           http://localhost:8000"
echo "  📚 API Docs:      http://localhost:8000/docs"
echo ""
echo "  🔬 MCP Servers:"
echo "     Catalog:       http://localhost:8001"
echo "     Orders+WA:     http://localhost:8002"
echo "     Payments:      http://localhost:8003"
echo "     Dashboard:     http://localhost:8004"
echo "     Patient:       http://localhost:8005"
echo ""
echo "  👨‍⚕️ Doctor login:  dr.mehta@testzoo.demo / Doctor@123"
echo "  🧑 Patient login: patient.ravi@testzoo.demo / Patient@123"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

wait
