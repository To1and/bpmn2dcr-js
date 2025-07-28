// Types for BPMN to DCR translation
export interface BPMNElement {
  id: string;
  type: string;
  name?: string;
  [key: string]: any;
}

export interface DCREvent {
  id: string;
  label: string;
  included: boolean;
  executed: boolean;
  pending: boolean;
}

export interface DCRRelation {
  source: string;
  target: string;
  type: 'condition' | 'response' | 'include' | 'exclude' | 'milestone';
}

export interface DCRGraph {
  events: DCREvent[];
  relations: DCRRelation[];
  marking: {
    executed: Set<string>;
    included: Set<string>;
    pending: Set<string>;
  };
}

export interface TranslationResponse {
  success: boolean;
  dcrXml?: string;
  error?: string;
  graph?: DCRGraph;
}

export interface TranslationService {
  translateBPMNToDCR(bpmnXml: string): Promise<TranslationResponse>;
}