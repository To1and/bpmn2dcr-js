import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import BPMNEditor from './components/BPMNEditor';
import DCRSimulator from './components/DCRSimulator';
import ResizableSplitter from './components/ResizableSplitter';
import LoadingOverlay from './components/LoadingOverlay';
import PyodideTranslationService from './services/pyodideTranslationService';


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
  overflow: hidden;
  ${props => props.$ratio === 0 ? 'display: none;' : ''}
`;

const PlaceholderSection = styled.div<{ $ratio: number }>`
  flex: ${props => props.$ratio};
  position: relative;
  background: #f5f5f5;
  overflow: hidden;
  ${props => props.$ratio === 0 ? 'display: none;' : ''}
`;

const App: React.FC = () => {
  const [dcrXml, setDcrXml] = useState<string | undefined>(undefined);
  const [isTranslating, setIsTranslating] = useState(false);
  const [topRatio, setTopRatio] = useState(1);
  const [bottomRatio, setBottomRatio] = useState(1);
  const [isInitializingPyodide, setIsInitializingPyodide] = useState(true);
  const translationService = React.useMemo(() => new PyodideTranslationService(), []);

  // Initialize Pyodide on mount
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await translationService.initialize();
        setIsInitializingPyodide(false);
      } catch (error) {
        console.error('Failed to initialize Pyodide:', error);
        setIsInitializingPyodide(false);
        toast.error('Failed to load Python engine. Please refresh the page.');
      }
    };

    initPyodide();
  }, [translationService]);

  const handleBPMNChange = useCallback(async (bpmnXml: string) => {
    if (bpmnXml.length > 0) {
      setIsTranslating(true);
      try {
        const result = await translationService.translateBPMNToDCR(bpmnXml);
        if (result.success) {
          if (result.dcrXml) {
            setDcrXml(result.dcrXml);
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

  
  const handleResize = useCallback((ratio: number) => {
    
    setTopRatio(ratio);
    setBottomRatio(1 - ratio);
  }, []);

  const handleMaximizeTop = useCallback(() => {
    
    setTopRatio(1);
    setBottomRatio(0);
  }, []);

  const handleMaximizeBottom = useCallback(() => {
    
    setTopRatio(0);
    setBottomRatio(1);
  }, []);

  const handleCenter = useCallback(() => {
    setTopRatio(1);
    setBottomRatio(1);
  }, []);


  return (
    <AppContainer>
      {isInitializingPyodide && <LoadingOverlay />}

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