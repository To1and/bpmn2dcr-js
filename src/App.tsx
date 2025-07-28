import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import BPMNEditor from './components/BPMNEditor';
import DCRSimulator from './components/DCRSimulator';
import ResizableSplitter from './components/ResizableSplitter';
import BPMN2DCRTranslationService from './services/translationService';


const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const EditorSection = styled.div<{ $ratio: number }>`
  flex: ${props => props.$ratio};
  position: relative;
  overflow: hidden; /* 防止内容溢出 */
  ${props => props.$ratio === 0 ? 'display: none;' : ''}
`;

const PlaceholderSection = styled.div<{ $ratio: number }>`
  flex: ${props => props.$ratio};
  position: relative;
  background: #f5f5f5;
  overflow: hidden; /* 防止内容溢出 */
  ${props => props.$ratio === 0 ? 'display: none;' : ''}
`;

const App: React.FC = () => {
  const [dcrXml, setDcrXml] = useState<string | undefined>(undefined);
  const [isTranslating, setIsTranslating] = useState(false);
  const [topRatio, setTopRatio] = useState(1); // 上半部分的flex比例
  const [bottomRatio, setBottomRatio] = useState(1); // 下半部分的flex比例
  const translationService = new BPMN2DCRTranslationService();

  const handleBPMNChange = useCallback(async (bpmnXml: string) => {
    console.log('BPMN model updated, length:', bpmnXml.length);
    
    if (bpmnXml.length > 0) {
      setIsTranslating(true);
      try {
        const result = await translationService.translateBPMNToDCR(bpmnXml);
        if (result.success) {
          if (result.dcrXml) {
            setDcrXml(result.dcrXml);
            console.log('DCR XML received from translation service');
          }
        } else {
          console.error('Translation failed:', result.error);
          setDcrXml(undefined);
        }
      } catch (error) {
        console.error('Translation error:', error);
        setDcrXml(undefined);
      } finally {
        setIsTranslating(false);
      }
    } else {
      setDcrXml(undefined);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const handleLoadSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  // 分割线相关回调函数
  const handleResize = useCallback((ratio: number) => {
    // ratio 是上半部分应该占据的比例 (0-1)
    setTopRatio(ratio);
    setBottomRatio(1 - ratio);
  }, []);

  const handleMaximizeTop = useCallback(() => {
    // 下箭头：使上半部分（BPMN Editor）全屏
    setTopRatio(1);
    setBottomRatio(0);
  }, []);

  const handleMaximizeBottom = useCallback(() => {
    // 上箭头：使下半部分（DCR Simulator）全屏
    setTopRatio(0);
    setBottomRatio(1);
  }, []);

  const handleCenter = useCallback(() => {
    setTopRatio(1);
    setBottomRatio(1);
  }, []);


  return (
    <AppContainer>
      <MainContent>
        <EditorSection $ratio={topRatio}>
          <BPMNEditor 
            onModelChange={handleBPMNChange}
            onError={handleError}
            onLoadSuccess={handleLoadSuccess}
          />
        </EditorSection>

        <ResizableSplitter
          onResize={handleResize}
          onMaximizeTop={handleMaximizeTop}
          onMaximizeBottom={handleMaximizeBottom}
          onCenter={handleCenter}
          initialRatio={topRatio / (topRatio + bottomRatio)}
          topRatio={topRatio}
          bottomRatio={bottomRatio}
        />

        <PlaceholderSection $ratio={bottomRatio}>
          <DCRSimulator 
            dcrXml={dcrXml}
            onError={handleError}
            isLoading={isTranslating}
          />
        </PlaceholderSection>
      </MainContent>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AppContainer>
  );
};

export default App;