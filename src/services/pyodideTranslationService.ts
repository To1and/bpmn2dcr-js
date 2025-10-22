import { loadPyodide, PyodideInterface } from 'pyodide';
import { TranslationService, TranslationResponse } from '../types';

// Import Python files as raw strings
import bpmnParserCode from '../python/bpmn_parser.py?raw';
import translationEngineCode from '../python/translation_engine.py?raw';
import dcrGeneratorCode from '../python/dcr_generator.py?raw';

class PyodideTranslationService implements TranslationService {
  private pyodide: PyodideInterface | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  // Public initialize method
  async initialize(): Promise<void> {
    if (this.pyodide) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      this.pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      });

      // Write Python modules to Pyodide's virtual filesystem
      this.pyodide.FS.writeFile('/bpmn_parser.py', bpmnParserCode);
      this.pyodide.FS.writeFile('/translation_engine.py', translationEngineCode);
      this.pyodide.FS.writeFile('/dcr_generator.py', dcrGeneratorCode);

      // Import modules
      await this.pyodide.runPythonAsync(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')

import bpmn_parser
import translation_engine
import dcr_generator
      `);

      this.isInitializing = false;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  async translateBPMNToDCR(bpmnXml: string): Promise<TranslationResponse> {
    try {
      // Ensure Pyodide is initialized
      if (!this.pyodide) {
        await this.initialize();
      }

      if (!this.pyodide) {
        throw new Error('Pyodide not initialized');
      }

      // Store BPMN XML in Pyodide namespace
      this.pyodide.globals.set('bpmn_xml', bpmnXml);

      // Execute translation
      const result = await this.pyodide.runPythonAsync(`
import tempfile
import os
from bpmn_parser import BPMNParser
from translation_engine import TranslationEngine
from dcr_generator import DCRGenerator

# Create temporary file for BPMN XML
temp_bpmn_fd, temp_bpmn_path = tempfile.mkstemp(suffix='.bpmn')
try:
    # Write BPMN XML to temp file
    with os.fdopen(temp_bpmn_fd, 'w') as f:
        f.write(bpmn_xml)

    # Parse BPMN
    parser = BPMNParser(temp_bpmn_path)
    bpmn_process, errors = parser.parse_and_validate()

    if errors:
        result = {
            'success': False,
            'error': 'BPMN validation failed: ' + '; '.join(errors)
        }
    else:
        # Translate to DCR
        engine = TranslationEngine(bpmn_process)
        dcr_graph = engine.translate()

        # Generate DCR XML
        generator = DCRGenerator(dcr_graph)
        temp_dcr_fd, temp_dcr_path = tempfile.mkstemp(suffix='.dcr.xml')
        try:
            os.close(temp_dcr_fd)
            generator.to_xml(temp_dcr_path)

            # Read DCR XML
            with open(temp_dcr_path, 'r', encoding='utf-8') as f:
                dcr_xml = f.read()

            # Convert DCR graph to frontend format
            events = []
            relations = []

            for event_id, event_data in dcr_graph.events.items():
                events.append({
                    'id': event_id,
                    'label': event_data.label,
                    'included': True,
                    'executed': False,
                    'pending': False
                })

            for relation in dcr_graph.relations:
                relations.append({
                    'source': relation.source_id,
                    'target': relation.target_id,
                    'type': relation.relation_type
                })

            result = {
                'success': True,
                'dcrXml': dcr_xml,
                'graph': {
                    'events': events,
                    'relations': relations,
                    'marking': {
                        'executed': [],
                        'included': [e['id'] for e in events],
                        'pending': []
                    }
                }
            }
        finally:
            if os.path.exists(temp_dcr_path):
                os.unlink(temp_dcr_path)
finally:
    if os.path.exists(temp_bpmn_path):
        os.unlink(temp_bpmn_path)

result
      `);

      // Convert Python dict to JavaScript object
      const jsResult = result.toJs({ dict_converter: Object.fromEntries });

      return {
        success: jsResult.success,
        dcrXml: jsResult.dcrXml,
        error: jsResult.error,
        graph: jsResult.graph ? {
          events: jsResult.graph.events,
          relations: jsResult.graph.relations,
          marking: {
            executed: new Set(jsResult.graph.marking.executed),
            included: new Set(jsResult.graph.marking.included),
            pending: new Set(jsResult.graph.marking.pending),
          }
        } : undefined,
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      return this.pyodide !== null;
    } catch {
      return false;
    }
  }

  // Get initialization status for UI feedback
  isReady(): boolean {
    return this.pyodide !== null && !this.isInitializing;
  }
}

export default PyodideTranslationService;
