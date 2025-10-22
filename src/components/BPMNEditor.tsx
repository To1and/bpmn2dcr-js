import React, { useEffect, useRef, useState, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import styled from 'styled-components';

// Import BPMN CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const BPMNContainer = styled.div`
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  position: relative;
  
  .bjs-container {
    height: 100%;
  }
`;

const ToolbarContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1001;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  margin-top: 8px;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin: 4px;
  
  &:hover:not(:disabled) {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }
  
  &:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }
  
  &:first-child {
    margin-top: 8px;
  }
  
  &:last-child {
    margin-bottom: 8px;
  }
`;

const IconButton = styled.button<{ disabled?: boolean }>`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  svg {
    width: 20px;
    height: 20px;
    color: #374151;
    transition: all 0.3s ease;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.05);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    
    svg {
      color: #2563eb;
      transform: scale(1.1);
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
    transition: all 0.1s ease;
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    
    svg {
      color: #9ca3af;
    }
  }
  
  /* Ripple effect */
  &:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.2);
    transform: translate(-50%, -50%);
    transition: all 0.3s ease;
    z-index: -1;
  }
  
  &:hover:not(:disabled):before {
    width: 100%;
    height: 100%;
  }
`;


const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17,8 12,3 7,8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

interface BPMNEditorProps {
  onModelChange?: (xml: string) => void;
  onError?: (error: string) => void;
  onLoadSuccess?: (message: string) => void;
}

// 空BPMN图的XML模板
const emptyBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_1tehbe7" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.37.0" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.7.0">
  <bpmn:process id="Process_1" isExecutable="true" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;


const BPMNEditor: React.FC<BPMNEditorProps> = ({ onModelChange, onError, onLoadSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [presetModels, setPresetModels] = useState<{ name: string; file: string }[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // 自动检测预置的BPMN模型
  const loadPresetModelsList = useCallback(async () => {
    try {
      // 先尝试直接检查已知的文件列表
      const knownModels = [
        'AND Gateway.bpmn',
        'Nested Gateway.bpmn', 
        'OR Gateway.bpmn',
        'XOR Gateway.bpmn'
      ];
      
      const validModels = [];
      
      for (const filename of knownModels) {
        try {
          const response = await fetch(`/models/${filename}`, { method: 'HEAD' });
          if (response.ok) {
            const name = filename.replace('.bpmn', '');
            validModels.push({ name, file: `/models/${filename}` });
          }
        } catch (error) {
          console.warn(`Model file not accessible: ${filename}`);
        }
      }
      
      if (validModels.length > 0) {
        console.log(`Found ${validModels.length} valid models:`, validModels.map(m => m.name));
        setPresetModels(validModels);
        return;
      }
      
      // 如果直接检查失败，尝试目录列表检测
      console.log('Trying directory listing approach...');
      const response = await fetch('/models/');
      if (response.ok) {
        const html = await response.text();
        console.log('Directory response received, parsing...');
        
        // 解析HTML中的.bpmn文件链接
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a[href]'))
          .map(link => (link as HTMLAnchorElement).href)
          .filter(href => href.endsWith('.bpmn'))
          .map(href => {
            const filename = href.split('/').pop() || '';
            const name = filename.replace('.bpmn', '');
            return { name, file: `/models/${filename}` };
          });
        
        console.log('Parsed links:', links);
        
        if (links.length > 0) {
          setPresetModels(links);
          return;
        }
      }
    } catch (error) {
      console.warn('Auto-detection failed:', error);
    }
    
    // 如果所有方法都失败，使用空列表
    console.log('All detection methods failed, no models will be shown');
    setPresetModels([]);
  }, []);

  // Debounced model change handler
  const debouncedModelChange = useCallback((xml: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      onModelChange?.(xml);
    }, 20); // 200ms delay for better performance
  }, [onModelChange]);

  // 第一步：加载预置模型列表
  useEffect(() => {
    loadPresetModelsList();
  }, [loadPresetModelsList]);

  // 第二步：初始化BPMN Modeler
  useEffect(() => {
    if (!containerRef.current) {
      console.log('Container not ready');
      return;
    }

    console.log('Initializing BPMN Modeler...');
    
    const modeler = new BpmnModeler({
      container: containerRef.current
    });

    modelerRef.current = modeler;

    // 确保模型器完全初始化后再加载空BPMN图
    setTimeout(() => {
      console.log('Loading empty BPMN diagram...');
      
      if (!modelerRef.current) {
        console.error('Modeler was destroyed before import');
        return;
      }
      
      modeler.importXML(emptyBpmnXml)
        .then((result) => {
          console.log('Empty BPMN diagram loaded successfully:', result);
          setIsReady(true);
          
          // Ensure the canvas is properly resized
          try {
            const canvas = modeler.get('canvas') as any;
            if (canvas && canvas.zoom) {
              canvas.zoom('fit-viewport');
            }
          } catch (error) {
            console.warn('Canvas zoom failed:', error);
          }
          
          // Set up change listeners
          const eventBus = modeler.get('eventBus') as any;
          
          const handleChange = () => {
            if (!modelerRef.current) return;
            
            modeler.saveXML({ format: true })
              .then(({ xml }) => {
                console.log('Model changed, will update after delay...');
                // Only trigger debounced update for actual user changes (not initial load)
                if (!isInitialLoadRef.current && xml) {
                  debouncedModelChange(xml);
                }
              })
              .catch((err) => {
                console.error('Error saving XML:', err);
                onError?.(err.message);
              });
          };

          // Listen for various change events
          eventBus.on('commandStack.changed', handleChange);
          
          // Mark initial load as complete
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 1000);
        })
  }, 100); // 给模型器一些时间来完全初始化

    return () => {
      console.log('Destroying BPMN Modeler...');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (modeler) {
        modeler.destroy();
      }
    };
  }, [onError]); // Remove debouncedModelChange from dependencies to prevent re-initialization

  const handleDownload = async () => {
    if (!modelerRef.current) return;
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.bpmn';
        a.click();
        URL.revokeObjectURL(url);
        onLoadSuccess?.('BPMN diagram downloaded successfully');
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !modelerRef.current) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const xml = e.target?.result as string;
        if (!modelerRef.current) {
          onError?.('Modeler not ready');
          return;
        }
        
        // Reset initial load flag for file imports
        isInitialLoadRef.current = true;
        
        modelerRef.current.importXML(xml)
          .then(() => {
            console.log('File loaded successfully');
            onLoadSuccess?.(`Successfully loaded ${file.name}`);
            
            // Immediately trigger translation after file import
            if (onModelChange) {
              onModelChange(xml);
            }
            
            // Mark initial load as complete after import
            setTimeout(() => {
              isInitialLoadRef.current = false;
            }, 1000);
          })
          .catch((err) => {
            console.error('File load error:', err);
            onError?.(`Failed to load ${file.name}: ${err.message}`);
            
            // 如果文件加载失败，回退到空图
            if (modelerRef.current) {
              modelerRef.current.createDiagram()
                .then(() => {
                  console.log('Created empty diagram as fallback after file load error');
                  setTimeout(() => {
                    isInitialLoadRef.current = false;
                  }, 1000);
                })
                .catch((createErr) => {
                  console.error('Failed to create empty diagram after file error:', createErr);
                });
            }
          });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 加载预置模型
  const loadPresetModel = async (modelFile: string, modelName: string) => {
    if (!modelerRef.current) return;
    
    try {
      const response = await fetch(modelFile);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${modelName}: ${response.statusText}`);
      }
      
      const xml = await response.text();
      
      // Reset initial load flag for preset model imports
      isInitialLoadRef.current = true;
      
      await modelerRef.current.importXML(xml);
      console.log(`Preset model loaded successfully: ${modelName}`);
      onLoadSuccess?.(`Successfully loaded ${modelName}`);
      
      // Immediately trigger translation after preset model import
      if (onModelChange) {
        onModelChange(xml);
      }
      
      // Mark initial load as complete after import
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 1000);
      
      // Close the menu
      setIsMenuOpen(false);
      
    } catch (err) {
      console.error('Preset model load error:', err);
      onError?.(`Failed to load ${modelName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // 处理菜单外部点击
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.dropdown-container')) {
      setIsMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen, handleClickOutside]);

  return (
    <BPMNContainer>
      <ToolbarContainer>
        <IconButton 
          onClick={handleUpload} 
          disabled={!isReady}
          title="Upload BPMN diagram"
        >
          <UploadIcon />
        </IconButton>
        <IconButton 
          onClick={handleDownload} 
          disabled={!isReady}
          title="Download BPMN diagram"
        >
          <DownloadIcon />
        </IconButton>
        <DropdownContainer className="dropdown-container">
          <IconButton 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            disabled={!isReady}
            title="Load preset BPMN models"
          >
            <MenuIcon />
          </IconButton>
          <DropdownMenu $isOpen={isMenuOpen}>
            {presetModels.length > 0 ? (
              presetModels.map((model) => (
                <DropdownItem
                  key={model.name}
                  onClick={() => loadPresetModel(model.file, model.name)}
                >
                  {model.name}
                </DropdownItem>
              ))
            ) : (
              <DropdownItem disabled>
                No preset models found
              </DropdownItem>
            )}
          </DropdownMenu>
        </DropdownContainer>
      </ToolbarContainer>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </BPMNContainer>
  );
};

export default BPMNEditor;