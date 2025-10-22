# bpmn2dcr-js

A real-time BPMN to DCR graph translation and simulation tool with a web-based interface.

## Overview

bpmn2dcr-js converts Business Process Model and Notation (BPMN) diagrams to Dynamic Condition Response (DCR) graphs through an automated translation engine. The tool provides a split-pane interface where users can create or import BPMN models and immediately view the corresponding DCR graph representation.

## Features

- **Real-time Translation**: Instant conversion from BPMN models to DCR graphs
- **Gateway Support**: Full support for XOR, AND, and OR gateway patterns
- **Interactive Editors**:
  - BPMN editor with drag-and-drop capabilities (powered by bpmn-js)
  - DCR graph visualization and simulation (powered by dcr-modeler)
- **Import/Export**: Support for BPMN and DCR XML formats
- **Simulation Mode**: Click events to simulate DCR graph execution
- **Split-Pane Interface**: Simultaneous view of BPMN and DCR models

## Prerequisites

- Node.js (v16 or higher)
- npm
- Python 3.8+
- pip

## Installation

### 1. Install Frontend Dependencies

```bash
npm install
```

This will install all required dependencies for both the main project and the dcr-modeler library.

### 2. Install Backend Dependencies

```bash
cd bpmn2dcr-pycore
pip install -r requirements.txt
cd ..
```

## Running the Application

You can start the application in two ways:

### Option 1: Using the Start Script (Recommended)

```bash
./run.sh
```

This will start both frontend and backend servers automatically.

### Option 2: Manual Start (Two Terminals)

**Terminal 1 - Backend Server:**
```bash
cd bpmn2dcr-pycore
python -m uvicorn server:app --reload --port 8000
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3001
```

The backend API will be available at `http://localhost:8000`

## Usage

1. **Create or Import BPMN**: Use the top pane to create a BPMN diagram or import an existing one
2. **View DCR Translation**: The bottom pane automatically displays the translated DCR graph
3. **Simulate Execution**: Click on events in the DCR graph to simulate execution
4. **Export**: Download the translated DCR graph as XML

## License

MIT License
