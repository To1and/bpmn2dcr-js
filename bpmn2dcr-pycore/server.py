from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import tempfile
import os
import sys

# Add the bpmn2dcr-pycore directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'bpmn2dcr-pycore'))

from bpmn_parser import BPMNParser
from translation_engine import TranslationEngine
from dcr_generator import DCRGenerator

app = FastAPI(title="BPMN2DCR Translation Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BPMNTranslationRequest(BaseModel):
    bpmn_xml: str

class DCREvent(BaseModel):
    id: str
    label: str
    included: bool = True
    executed: bool = False
    pending: bool = False

class DCRRelation(BaseModel):
    source: str
    target: str
    type: str  # 'condition', 'response', 'include', 'exclude', 'milestone'

class DCRGraph(BaseModel):
    events: list[DCREvent]
    relations: list[DCRRelation]
    marking: dict

class TranslationResponse(BaseModel):
    success: bool
    dcr_xml: str = None
    graph: DCRGraph = None
    error: str = None

def dcr_graph_to_frontend_format(dcr_graph) -> DCRGraph:
    """Convert internal DCR graph format to frontend format"""
    try:
        events = []
        relations = []
        
        # Extract events from the DCR graph
        if hasattr(dcr_graph, 'events'):
            for event_id, event_data in dcr_graph.events.items():
                events.append(DCREvent(
                    id=event_id,
                    label=getattr(event_data, 'label', event_id),
                    included=True,  # Default to included
                    executed=False,
                    pending=False
                ))
        
        # Extract relations from the DCR graph
        if hasattr(dcr_graph, 'relations'):
            for relation in dcr_graph.relations:
                relations.append(DCRRelation(
                    source=relation.source_id,
                    target=relation.target_id,
                    type=relation.relation_type
                ))
        
        # Create initial marking
        marking = {
            "executed": list(),
            "included": [event.id for event in events],
            "pending": list()
        }
        
        return DCRGraph(
            events=events,
            relations=relations,
            marking=marking
        )
    except Exception as e:
        print(f"Error converting DCR graph: {e}")
        # Return a minimal graph if conversion fails
        return DCRGraph(
            events=[],
            relations=[],
            marking={"executed": [], "included": [], "pending": []}
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "BPMN2DCR Translation Service"}

@app.post("/translate", response_model=TranslationResponse)
async def translate_bpmn_to_dcr(request: BPMNTranslationRequest):
    """Translate BPMN XML to DCR format"""
    try:
        # Create a temporary file for the BPMN XML
        with tempfile.NamedTemporaryFile(mode='w', suffix='.bpmn', delete=False) as temp_file:
            temp_file.write(request.bpmn_xml)
            temp_bpmn_path = temp_file.name

        try:
            # Parse and validate the BPMN model
            parser = BPMNParser(temp_bpmn_path)
            bpmn_process, errors = parser.parse_and_validate()

            if errors:
                error_message = "BPMN validation failed: " + "; ".join(errors)
                return TranslationResponse(
                    success=False,
                    error=error_message
                )

            # Translate BPMN to DCR
            engine = TranslationEngine(bpmn_process)
            dcr_graph = engine.translate()

            # Generate DCR XML
            generator = DCRGenerator(dcr_graph)
            
            # Create temporary file for DCR XML output
            with tempfile.NamedTemporaryFile(mode='w', suffix='.dcr.xml', delete=False) as dcr_temp_file:
                dcr_temp_path = dcr_temp_file.name
            
            generator.to_xml(dcr_temp_path)
            
            # Read the generated DCR XML
            with open(dcr_temp_path, 'r', encoding='utf-8') as dcr_file:
                dcr_xml = dcr_file.read()

            # Convert DCR graph to frontend format
            frontend_graph = dcr_graph_to_frontend_format(dcr_graph)

            # Clean up temporary files
            os.unlink(dcr_temp_path)

            return TranslationResponse(
                success=True,
                dcr_xml=dcr_xml,
                graph=frontend_graph
            )

        finally:
            # Clean up temporary BPMN file
            os.unlink(temp_bpmn_path)

    except Exception as e:
        error_message = f"Translation failed: {str(e)}"
        print(f"Error in translation: {e}")
        return TranslationResponse(
            success=False,
            error=error_message
        )

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "BPMN2DCR Translation Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "translate": "/translate"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)