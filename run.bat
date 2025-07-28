
start "BPMN2DCR Backend" cmd /k "cd bpmn2dcr-pycore && python server.py"

start "BPMN2DCR Frontend" cmd /k "npm run dev"
