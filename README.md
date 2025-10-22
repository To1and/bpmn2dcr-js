<!--
 * @Author: Yue Zhou
 * @Date: 2025-10-23 01:05:23
 * @LastEditors: Yue Zhou
 * @LastEditTime: 2025-10-23 01:11:34
-->
# bpmn2dcr-js

A real-time BPMN to DCR graph translation and simulation tool with a **pure frontend** web-based interface.

**Live Demo**: https://to1and.github.io/bpmn2dcr-js/

## Overview

bpmn2dcr-js converts Business Process Model and Notation (BPMN) diagrams to Dynamic Condition Response (DCR) graphs through an automated translation engine. The tool provides a split-pane interface where users can create or import BPMN models and immediately view the corresponding DCR graph representation.

## Prerequisites

Before running the application, ensure you have the following installed:

- Node.js (v16 or higher)
- npm

## Quick Start

The easiest way to start the application is using the provided start scripts:

**Linux/macOS:**

```bash
./run.sh
```

**Windows:**

```cmd
run.bat
```

That's it! The script will:

1. Check if Node.js and npm are installed
2. Automatically install dependencies (if not already installed)
3. Start the development server
4. Open the application at <http://localhost:3001>

**Note**: The first time you use the application, Pyodide will download Python runtime (~10MB) in the background. Subsequent uses will be faster.

## Manual Installation (Optional)

If you prefer to install dependencies manually:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the Application

Open your browser and navigate to:

```
http://localhost:3001
```

## Deployment

Since this is a pure frontend application, you can easily deploy it to any static hosting service:

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Usage

1. **Create or Import BPMN**: Use the top pane to create a BPMN diagram or import an existing one
2. **View DCR Translation**: The bottom pane automatically displays the translated DCR graph
3. **Simulate Execution**: Click on events in the DCR graph to simulate execution
4. **Export**: Download the translated DCR graph as XML

## License

MIT License
