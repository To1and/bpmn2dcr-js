#!/bin/bash

# bpmn2dcr-js Startup Script
# This script starts both the Python backend and Vite frontend servers

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3001

# PID file to track backend process
BACKEND_PID_FILE="/tmp/bpmn2dcr_backend.pid"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║              🚀 Starting bpmn2dcr-js                      ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"

    # Kill backend process if PID file exists
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}   Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill $BACKEND_PID 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # Kill any remaining processes on the ports
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM EXIT

# Check if ports are already in use
echo -e "${BLUE}📡 Checking ports...${NC}"

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $BACKEND_PORT is already in use. Killing existing process...${NC}"
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is already in use. Killing existing process...${NC}"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo -e "${GREEN}✅ Ports are available${NC}"
echo ""

# Check if dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v16 or higher.${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Set Python command (python3 or python)
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

# Check pip
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo -e "${RED}❌ pip is not installed. Please install pip.${NC}"
    exit 1
fi

# Set pip command (pip3 or pip)
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
else
    PIP_CMD="pip"
fi

if [ ! -d "bpmn2dcr-pycore" ]; then
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites found${NC}"
echo ""

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Node modules not found. Installing...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Node dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Node dependencies${NC}"
        exit 1
    fi
    echo ""
else
    echo -e "${GREEN}✅ Node dependencies found${NC}"
fi

# Check and install Python dependencies if needed
echo -e "${BLUE}📦 Checking Python dependencies...${NC}"
cd bpmn2dcr-pycore

# Try to import required modules
$PYTHON_CMD -c "import fastapi, uvicorn, pydantic" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}📦 Python dependencies missing. Installing...${NC}"
    $PIP_CMD install -r requirements.txt
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Python dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Python dependencies${NC}"
        cd ..
        exit 1
    fi
else
    echo -e "${GREEN}✅ Python dependencies found${NC}"
fi

cd ..
echo ""

# Start backend server
echo -e "${BLUE}🐍 Starting Python backend server...${NC}"
cd bpmn2dcr-pycore

# Start backend in background and save PID
$PYTHON_CMD -m uvicorn server:app --reload --port $BACKEND_PORT > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"

cd ..

# Wait for backend to start
echo -e "${YELLOW}   Waiting for backend to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server started (PID: $BACKEND_PID)${NC}"
        echo -e "${GREEN}   Backend: http://localhost:$BACKEND_PORT${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Backend failed to start. Check /tmp/backend.log for details${NC}"
        tail -20 /tmp/backend.log
        cleanup
        exit 1
    fi
    sleep 1
done

echo ""

# Start frontend server
echo -e "${BLUE}⚛️  Starting Vite frontend server...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🌐 Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}   🔧 Backend:  http://localhost:$BACKEND_PORT${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start frontend (this will run in foreground)
npm run dev

# This will only execute if npm run dev exits normally
cleanup
