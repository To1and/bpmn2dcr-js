#!/bin/bash

# bpmn2dcr-js Startup Script
# This script starts the frontend development server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Port
FRONTEND_PORT=3001

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║              🚀 Starting bpmn2dcr-js                      ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down server...${NC}"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM EXIT

# Check if port is already in use
echo -e "${BLUE}📡 Checking port...${NC}"

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is already in use. Killing existing process...${NC}"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo -e "${GREEN}✅ Port is available${NC}"
echo ""

# Check if dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v16 or higher.${NC}"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites found${NC}"
echo ""

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Node modules not found. Installing...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
    echo ""
else
    # Check if critical packages are installed
    if [ ! -d "node_modules/pyodide" ] || [ ! -d "node_modules/react" ] || [ ! -d "node_modules/vite" ]; then
        echo -e "${YELLOW}📦 Some dependencies are missing. Installing...${NC}"
        npm install
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi
        echo ""
    else
        echo -e "${GREEN}✅ Dependencies found${NC}"
    fi
fi

echo ""

# Start frontend server
echo -e "${BLUE}⚛️  Starting Vite frontend server...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🌐 Application: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}   🐍 Python code runs in your browser via Pyodide${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the server${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start frontend (this will run in foreground)
npm run dev

# This will only execute if npm run dev exits normally
cleanup
