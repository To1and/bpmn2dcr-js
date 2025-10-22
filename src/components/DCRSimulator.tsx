import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

// DCR dependencies - 动态导入
let DCRModeler: any = null;
let dcrEngine: any = null;
let dependenciesLoaded = false;

const loadDCRDependencies = async () => {
  if (dependenciesLoaded) return { success: true };
  
  try {
    const [modelerModule, engineModule] = await Promise.all([
      import('../../lib/dcr-modeler/index.js' as any),
      import('../lib/dcr-engine')
    ]);
    
    DCRModeler = modelerModule.default;
    dcrEngine = engineModule;
    dependenciesLoaded = true;
    
    console.log('✅ DCR dependencies loaded successfully');
    return { success: true };
  } catch (error) {
    console.warn('❌ Failed to load DCR dependencies:', error);
    return { success: false, error };
  }
};

// Styled components
const DCRContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  border: 1px solid #ddd;
  background: #f9f9f9;
`;

const ControlPanel = styled.div`
  width: 300px;
  border-right: 1px solid #ddd;
  background: #f5f5f5;
  padding: 16px;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const DCRVisualizationArea = styled.div`
  flex: 1;
  position: relative;
  background: white;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  /* 确保DCR canvas占满整个区域 */
  #dcr-canvas {
    width: 100% !important;
    height: 100% !important;
  }
  
  .djs-container {
    width: 100% !important;
    height: 100% !important;
  }
  
  .djs-canvas {
    width: 100% !important;
    height: 100% !important;
  }
  
  /* 遵循dcr-js的鼠标样式规范 - 仿真模式下的正确cursor设置 */
  &.simulating .djs-hit-all {
    cursor: pointer !important;
  }
  
  &.simulating .djs-element .djs-hit-stroke {
    cursor: default !important;
  }
  
  /* 确保默认状态下其他元素不会被意外设置为拖拽样式 */
  .djs-element {
    cursor: inherit;
  }
`;

const DCRToolbarContainer = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  gap: 12px;
`;

const DCRIconButton = styled.button<{ disabled?: boolean }>`
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

const DCRCanvasContainer = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  
  /* 直接设置canvas容器样式 */
  > div {
    width: 100% !important;
    height: 100% !important;
  }
`;


const PanelSection = styled.div`
  margin-bottom: 16px;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
`;

const StatusIndicator = styled.div<{ $status: string }>`
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  width: 120px;
  margin-left: auto;
  margin-right: auto;
  background: ${props => {
    switch (props.$status) {
      case 'accepting': return '#d4edda';
      case 'not-accepting': return '#f8d7da';
      case 'simulating': return '#fff3cd';
      case 'loading': return '#cce7ff';
      default: return '#e2e3e5';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'accepting': return '#155724';
      case 'not-accepting': return '#721c24';
      case 'simulating': return '#856404';
      case 'loading': return '#004085';
      default: return '#383d41';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'accepting': return '#c3e6cb';
      case 'not-accepting': return '#f5c6cb';
      case 'simulating': return '#ffeaa7';
      case 'loading': return '#bee5eb';
      default: return '#ced4da';
    }
  }};
`;

const TraceDisplay = styled.div`
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  
  .trace-item {
    padding: 2px 0;
    border-bottom: 1px solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #007bff;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #0056b3;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,123,255,0.3);
  }
  
  &:disabled {
    background: #6c757d;
    border-color: #6c757d;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// Icon components
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// Interfaces
interface DCRSimulatorProps {
  dcrXml?: string;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

enum SimulatingEnum {
  Default,
  Wild,
  Not
}

interface SimulationState {
  currentTrace: Array<{ activity: string; role: string }>;
  isSimulating: boolean;
  isAccepting: boolean;
  depsLoaded: boolean;
  modelerReady: boolean;
  currentTraceId: string;
  traceName: string;
}

const DCRSimulator: React.FC<DCRSimulatorProps> = ({ dcrXml, onError, isLoading }) => {
  const modelerRef = useRef<any>(null);
  const graphRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isSimulatingRef = useRef<SimulatingEnum>(SimulatingEnum.Default);
  const traceRef = useRef<{ traceId: string, trace: Array<{ activity: string; role: string }> } | null>(null);
  
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentTrace: [],
    isSimulating: false,
    isAccepting: false,
    depsLoaded: false,
    modelerReady: false,
    currentTraceId: "Trace 0",
    traceName: "Trace 0"
  });

  // 工具函数 - 直接从SimulatorState复制
  const traceString = useCallback((event: any): string => {
    const eventName = event.businessObject?.description;
    if (eventName == null || eventName === "") {
      return "Unnamed event";
    }
    return eventName.toString();
  }, []);

  const roleString = useCallback((event: any): string => {
    const eventRole = event.businessObject?.role;
    if (eventRole == null || eventRole === "") {
      return "";
    }
    return eventRole.toString();
  }, []);

  const logExecutionString = useCallback((event: any): string => {
    const eventName = event.businessObject?.description;
    if (eventName == null || eventName === "") {
      return "Executed Unnamed event";
    } else {
      return "Executed " + eventName;
    }
  }, []);

  // 执行事件 - 直接从SimulatorState复制
  const executeEvent = useCallback((eventElement: any, graph: any): { msg: string, executedEvent: string, role: string } => {
    if (!dcrEngine) {
      return { msg: "DCR engine not available", executedEvent: "", role: "" };
    }

    const event = eventElement.id;
    let eventName = eventElement.businessObject?.description;
    if (eventName == null || eventName === "") {
      eventName = "Unnamed event";
    }

    let group = graph.subProcessMap?.[event];
    if (!group) group = graph;

    const enabledResponse = dcrEngine.isEnabledS(event, graph, group);
    if (isSimulatingRef.current !== SimulatingEnum.Wild && !enabledResponse.enabled) {
      return { msg: enabledResponse.msg, executedEvent: "", role: "" };
    }
    
    dcrEngine.executeS(event, graph);
    return { 
      msg: logExecutionString(eventElement), 
      executedEvent: traceString(eventElement), 
      role: roleString(eventElement) 
    };
  }, [dcrEngine, logExecutionString, traceString, roleString]);

  // 自定义updateRendering方法，添加enabled CSS类支持
  const updateRenderingWithCursor = useCallback((graph: any) => {
    if (!modelerRef.current || !dcrEngine) return;
    
    // 调用原始updateRendering
    modelerRef.current.updateRendering(graph);
    
    // 动态添加/移除enabled CSS类
    const elementRegistry = modelerRef.current.get('elementRegistry');
    if (elementRegistry) {
      const allElements = elementRegistry.getAll();
      allElements.forEach((element: any) => {
        if (element.type === 'dcr:Event') {
          const isEnabled = dcrEngine.isEnabledS && dcrEngine.isEnabledS(element.id, graph, graph).enabled;
          const elementNode = document.querySelector(`[data-element-id="${element.id}"]`);
          if (elementNode) {
            if (isEnabled) {
              elementNode.classList.add('enabled');
            } else {
              elementNode.classList.remove('enabled');
            }
          }
        }
      });
    }
  }, [dcrEngine]);

  // 事件点击处理 - 直接从SimulatorState复制
  const eventClick = useCallback((event: any) => {
    if (event.element.type !== "dcr:Event" ||
        isSimulatingRef.current === SimulatingEnum.Not ||
        !traceRef.current ||
        !modelerRef.current ||
        !graphRef.current
    ) return;

    const response = executeEvent(event.element, graphRef.current.current);

    if (response.executedEvent !== "") {
      traceRef.current.trace.push({ activity: response.executedEvent, role: response.role });
      setSimulationState(prev => ({
        ...prev,
        currentTrace: [...traceRef.current!.trace],
        isAccepting: dcrEngine?.isAcceptingS(graphRef.current.current, graphRef.current.current) || false
      }));
    }
    // Removed toast warning for disabled events - silent click behavior
    updateRenderingWithCursor(graphRef.current.current);
  }, [executeEvent]);

  // 重置模拟 - 直接从SimulatorState复制
  const reset = useCallback(() => {
    if (graphRef.current && modelerRef.current && dcrEngine) {
      graphRef.current.current = { 
        ...graphRef.current.initial, 
        marking: dcrEngine.copyMarking(graphRef.current.initial.marking) 
      };
      modelerRef.current.updateRendering(graphRef.current.current);
      updateRenderingWithCursor(graphRef.current.current);
    }
  }, []);

  const resetSimulation = useCallback(() => {
    reset();
    if (traceRef.current) {
      traceRef.current.trace = [];
    }
    setSimulationState(prev => ({
      ...prev,
      currentTrace: [],
      isAccepting: dcrEngine?.isAcceptingS(graphRef.current?.current, graphRef.current?.current) || false
    }));
  }, [reset]);

  // 复制trace
  const copyTrace = useCallback(() => {
    const traceText = simulationState.currentTrace.map((t, index) => 
      `${index + 1}. ${t.activity}${t.role ? ` (${t.role})` : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(traceText).then(() => {
      console.log('📋 Trace copied to clipboard');
      toast.success('Trace copied to clipboard');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = traceText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Trace copied to clipboard');
    });
  }, [simulationState.currentTrace]);

  // 下载DCR Solution XML
  const handleDownloadDCR = useCallback(async () => {
    if (!modelerRef.current) {
      toast.error('DCR modeler not ready');
      return;
    }
    
    try {
      const { xml } = await modelerRef.current.saveDCRXML();
      if (xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dcr-solution.xml';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('DCR Solution XML downloaded successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      console.error('DCR download error:', err);
      toast.error(errorMessage);
    }
  }, []);

  // 第一步：加载DCR依赖
  useEffect(() => {
    loadDCRDependencies().then(result => {
      setSimulationState(prev => ({
        ...prev,
        depsLoaded: result.success
      }));
      
      if (!result.success) {
        onError?.(`Failed to load DCR dependencies: ${result.error instanceof Error ? result.error.message : 'Unknown error'}`);
      }
    });
  }, [onError]);

  // 第二步：初始化DCR Modeler - 使用override模式
  useEffect(() => {
    if (!simulationState.depsLoaded || !DCRModeler || !canvasRef.current || modelerRef.current) {
      return;
    }

    try {
      console.log('🚀 Initializing DCR Modeler in simulation mode...');
      
      // 创建DCR canvas容器
      canvasRef.current.innerHTML = '<div id="dcr-canvas"></div>';
      const canvasElement = canvasRef.current.querySelector('#dcr-canvas');
      
      if (!canvasElement) {
        throw new Error('Failed to create DCR canvas element');
      }

      // 初始化DCR Modeler - 使用override模式（基于SimulatorState实现）
      const modeler = new DCRModeler({
        container: canvasElement,
        // 模拟模式需要禁用编辑功能
        additionalModules: [{
          palette: ['value', null],
          paletteProvider: ['value', null],
          bendpoints: ['value', null],
          move: ['value', null],
          keyboard: ['value', null],
          keyboardMove: ['value', null],
          keyboardMoveSelection: ['value', null],
          keyboardBindings: ['value', null],
          labelEditing: ['value', null],
          labelEditingProvider: ['value', null],
        }],
      });

      modelerRef.current = modeler;
      
      setSimulationState(prev => ({
        ...prev,
        modelerReady: true
      }));

      console.log('✅ DCR Modeler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize DCR Modeler:', error);
      onError?.(`Failed to initialize DCR Modeler: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return () => {
      if (modelerRef.current) {
        try {
          modelerRef.current.destroy();
          modelerRef.current = null;
          graphRef.current = null;
          setSimulationState(prev => ({
            ...prev,
            modelerReady: false,
            isSimulating: false
          }));
        } catch (error) {
          console.warn('Warning: Error destroying DCR Modeler:', error);
        }
      }
    };
  }, [simulationState.depsLoaded, onError]);

  // 第三步：加载DCR XML并设置模拟模式 - 基于Modeler组件的override实现
  useEffect(() => {
    console.log('🔄 Third step useEffect triggered:', {
      hasModeler: !!modelerRef.current,
      modelerReady: simulationState.modelerReady,
      hasDcrXml: !!dcrXml,
      dcrXmlLength: dcrXml?.length || 0
    });
    
    if (!modelerRef.current || !simulationState.modelerReady) {
      console.log('⏸️ Skipping third step - conditions not met');
      return;
    }

    console.log('📊 Setting up simulation mode...');
    console.log('Debug info:', {
      hasDcrXml: !!dcrXml,
      dcrXmlLength: dcrXml?.length || 0,
      hasModeler: !!modelerRef.current,
      hasDcrEngine: !!dcrEngine,
      modelerMethods: modelerRef.current ? Object.keys(modelerRef.current) : []
    });
    
    // 首先创建或导入图形
    const setupGraph = async () => {
      try {
        if (dcrXml && modelerRef.current.importDCRPortalXML) {
          console.log('🔄 Importing DCR XML...');
          await modelerRef.current.importDCRPortalXML(dcrXml);
          console.log('✅ DCR XML loaded successfully');
        } else if (dcrXml && modelerRef.current.importXML) {
          console.log('🔄 Importing DCR XML using importXML...');
          await modelerRef.current.importXML(dcrXml);
          console.log('✅ DCR XML loaded via importXML');
        } else {
          console.log('🔄 Creating empty DCR diagram...');
          await modelerRef.current.createDiagram();
          console.log('✅ Empty DCR diagram created');
        }

        // 转换为DCR图形用于执行引擎 - 直接复用SimulatorState逻辑
        if (dcrEngine && modelerRef.current.getElementRegistry) {
          console.log('🔄 Converting to DCR graph...');
          const elementRegistry = modelerRef.current.getElementRegistry();
          console.log('Element registry:', elementRegistry);
          console.log('Registry elements:', elementRegistry ? elementRegistry.getAll() : 'No registry');
          
          // 检查是否有DCR事件元素，如果没有则跳过图形转换
          const allElements = elementRegistry ? elementRegistry.getAll() : [];
          const dcrEvents = allElements.filter(el => el.type === 'dcr:Event');
          
          if (dcrEvents.length > 0) {
            const graph = dcrEngine.moddleToDCR(elementRegistry);
            console.log('DCR graph created:', graph);
            
            // 应用nesting和autolayout
            console.log('🔄 Applying nesting and autolayout...');
            try {
              // 应用nesting - 自动分组共享关系的事件
              const nestingResult = dcrEngine.nestDCR(graph, 1); // 最少1个共享关系
              console.log('Nesting result:', nestingResult);
              
              // 选择是否使用nesting - 这里默认启用nesting
              const shouldNest = nestingResult.nestingIds.size > 0; // 如果有nesting则使用
              const graphToLayout = shouldNest ? nestingResult.nestedGraph : graph;
              const nestingData = shouldNest ? nestingResult : undefined;
              
              console.log('Applying autolayout with', shouldNest ? 'nesting' : 'no nesting');
              
              // 应用autolayout
              const layoutXml = await dcrEngine.layoutGraph(graphToLayout, nestingData);
              console.log('Layout XML generated, length:', layoutXml.length);
              
              // 导入布局后的XML到modeler
              await modelerRef.current.importXML(layoutXml);
              console.log('✅ Layout applied successfully');
              
              // 重新获取element registry（因为importXML后元素已更新）
              const updatedRegistry = modelerRef.current.getElementRegistry();
              const finalGraph = dcrEngine.moddleToDCR(updatedRegistry);
              
              graphRef.current = { 
                initial: finalGraph, 
                current: { ...finalGraph, marking: dcrEngine.copyMarking(finalGraph.marking) } 
              };

              // 设置模拟模式 - 基于Modeler组件的override实现
              modelerRef.current.setSimulating(true);
              
              // 重要：设置canvas类名为"simulating"以启用正确的鼠标样式
              const canvasElement = canvasRef.current.querySelector('#dcr-canvas');
              if (canvasElement) {
                canvasElement.classList.add('simulating');
              }
              
              modelerRef.current.updateRendering(finalGraph);
              updateRenderingWithCursor(finalGraph);

              // 设置事件监听器 - 直接复用SimulatorState的eventClick
              modelerRef.current.on('element.click', (e: any) => {
                eventClick(e);
                // 防止选择元素（模拟模式）
                const selection = modelerRef.current.get('selection');
                if (selection && selection.select) {
                  selection.select([]);
                }
              });

              // 初始化trace
              isSimulatingRef.current = SimulatingEnum.Default;
              traceRef.current = { traceId: "Trace 0", trace: [] };
              
              setSimulationState(prev => ({
                ...prev,
                isSimulating: true,
                isAccepting: dcrEngine.isAcceptingS(finalGraph, finalGraph),
                currentTrace: []
              }));

              console.log('🎮 Simulation mode activated with autolayout and nesting');
              
            } catch (layoutError) {
              console.error('❌ Layout/nesting failed, using original graph:', layoutError);
              
              // 如果layout失败，回退到原始图形
              graphRef.current = { 
                initial: graph, 
                current: { ...graph, marking: dcrEngine.copyMarking(graph.marking) } 
              };

              // 设置模拟模式 - 基于Modeler组件的override实现
              modelerRef.current.setSimulating(true);
              
              // 重要：设置canvas类名为"simulating"以启用正确的鼠标样式
              const canvasElement = canvasRef.current.querySelector('#dcr-canvas');
              if (canvasElement) {
                canvasElement.classList.add('simulating');
              }
              
              modelerRef.current.updateRendering(graph);
              updateRenderingWithCursor(graph);

              // 设置事件监听器 - 直接复用SimulatorState的eventClick
              modelerRef.current.on('element.click', (e: any) => {
                eventClick(e);
                // 防止选择元素（模拟模式）
                const selection = modelerRef.current.get('selection');
                if (selection && selection.select) {
                  selection.select([]);
                }
              });

              // 初始化trace
              isSimulatingRef.current = SimulatingEnum.Default;
              traceRef.current = { traceId: "Trace 0", trace: [] };
              
              setSimulationState(prev => ({
                ...prev,
                isSimulating: true,
                isAccepting: dcrEngine.isAcceptingS(graph, graph),
                currentTrace: []
              }));

              console.log('🎮 Simulation mode activated without layout');
            }
          } else {
            console.log('📝 Empty DCR diagram - no events to simulate');
            
            // 即使没有事件，也要设置基本的模拟模式
            if (modelerRef.current.setSimulating) {
              modelerRef.current.setSimulating(true);
            }
            
            const canvasElement = canvasRef.current.querySelector('#dcr-canvas');
            if (canvasElement) {
              canvasElement.classList.add('simulating');
            }
            
            setSimulationState(prev => ({
              ...prev,
              isSimulating: false, // 没有事件时不算真正的模拟
              isAccepting: false,
              currentTrace: []
            }));
            
            console.log('📝 Empty diagram ready for editing');
          }
        } else {
          console.error('❌ Missing dependencies for DCR graph conversion:', {
            hasDcrEngine: !!dcrEngine,
            hasElementRegistry: !!(modelerRef.current?.getElementRegistry)
          });
          throw new Error('Missing DCR Engine or ElementRegistry for graph conversion');
        }
      } catch (error) {
        console.error('❌ Failed to setup simulation:', error);
        onError?.(`Failed to setup simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    setupGraph();
  }, [dcrXml, simulationState.modelerReady, onError, eventClick]);


  return (
    <DCRContainer>
      <ControlPanel>
        <StatusIndicator $status={
          !simulationState.depsLoaded ? 'loading' :
          !simulationState.modelerReady ? 'loading' :
          !simulationState.isSimulating ? 'not-simulating' :
          simulationState.isAccepting ? 'accepting' : 'not-accepting'
        }>
          {!simulationState.depsLoaded ? 'Loading...' :
           !simulationState.modelerReady ? 'Loading...' :
           !simulationState.isSimulating ? 'Ready' :
           simulationState.isAccepting ? 'Accepting' : 'Not Accepting'
          }
        </StatusIndicator>

        <TraceDisplay>
          {simulationState.currentTrace.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              {simulationState.isSimulating ? 'Click on enabled events to execute them' : 'No events executed yet'}
            </div>
          ) : (
            simulationState.currentTrace.map((item, index) => (
              <div key={index} className="trace-item">
                <span style={{ fontWeight: 'bold', color: '#2563eb' }}>
                  {index + 1}.
                </span>{' '}
                {item.activity}
                {item.role && (
                  <span style={{ color: '#6b7280', fontSize: '11px' }}>
                    {' '}({item.role})
                  </span>
                )}
              </div>
            ))
          )}
        </TraceDisplay>

        <ActionButtons>
          <ActionButton 
            onClick={resetSimulation} 
            disabled={!simulationState.isSimulating}
          >
            Reset Simulation
          </ActionButton>
        </ActionButtons>
      </ControlPanel>
      
      <DCRVisualizationArea className="simulating">
        <DCRToolbarContainer>
          <DCRIconButton 
            onClick={handleDownloadDCR} 
            disabled={!simulationState.modelerReady}
            title="Download DCR Solution XML"
          >
            <DownloadIcon />
          </DCRIconButton>
        </DCRToolbarContainer>
        <DCRCanvasContainer 
          ref={canvasRef}
        />
      </DCRVisualizationArea>
    </DCRContainer>
  );
};

export default DCRSimulator;