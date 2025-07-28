# bpmn2dcr-js

A real-time BPMN to DCR graph translation and simulation tool with web-based interface.

## Overview

bpmn2dcr-js converts Business Process Model and Notation (BPMN) diagrams to Dynamic Condition Response (DCR) graphs through an automated translation engine. The tool provides a split-pane interface where users can create or import BPMN models and immediately view the corresponding DCR graph representation.

## Features

- Real-time translation from BPMN models to DCR graphs
- Support for XOR, AND, and OR gateway patterns
- Interactive BPMN editor with drag-and-drop capabilities
- DCR graph visualization and simulation
- Import/export functionality for BPMN and DCR formats


## Installation and Setup

**Prerequisites:**
- Docker

**Setup Steps:**

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bpmn2dcr-js.git
cd bpmn2dcr-js
```

2. Build and run with Docker:
```bash
docker build -t bpmn2dcr-js .
docker run -p 80:80 -p 8000:8000 bpmn2dcr-js
```

3. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:8000



## License

MIT License