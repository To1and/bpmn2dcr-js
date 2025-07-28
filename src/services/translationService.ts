import { TranslationService, TranslationResponse } from '../types';

class BPMN2DCRTranslationService implements TranslationService {
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async translateBPMNToDCR(bpmnXml: string): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bpmn_xml: bpmnXml }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        dcrXml: data.dcr_xml,
        graph: data.graph
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
      const response = await fetch(`${this.apiBaseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default BPMN2DCRTranslationService;