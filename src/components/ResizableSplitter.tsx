import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

const SplitterContainer = styled.div<{ $isActive: boolean }>`
  height: 8px;
  background: ${props => props.$isActive ? '#f5f5f5' : '#e0e0e0'};
  cursor: ns-resize;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-top: 1px solid #d0d0d0;
  border-bottom: 1px solid #d0d0d0;
  z-index: 1000;
  
  &:hover {
    background: #f5f5f5;
    border-color: #bbb;
    z-index: 1001;
  }
`;

const IndicatorContainer = styled.div<{ $visible: boolean }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: all 0.2s ease;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  z-index: 102; /* 按钮容器层级最高 */
`;

const ArrowButton = styled.button`
  width: 40px;
  height: 14px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.95);
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: normal;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  &:hover {
    background: rgba(248, 248, 248, 0.98);
    border-color: #999;
    color: #444;
    transform: scale(1.02);
  }
  
  &:active {
    transform: scale(0.98);
    background: rgba(240, 240, 240, 0.98);
  }
`;

const CenterButton = styled.button`
  width: 40px;
  height: 14px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.95);
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: normal;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  &:hover {
    background: rgba(248, 248, 248, 0.98);
    border-color: #999;
    color: #444;
    transform: scale(1.02);
  }
  
  &:active {
    transform: scale(0.98);
    background: rgba(240, 240, 240, 0.98);
  }
`;

const DragHandle = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  width: 40px;
  height: 2px;
  background: ${props => props.$isDragging ? '#999' : 'rgba(0,0,0,0.2)'};
  border-radius: 1px;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 101;
`;

interface ResizableSplitterProps {
  onResize?: (topRatio: number) => void;
  onMaximizeTop?: () => void;
  onMaximizeBottom?: () => void;
  onCenter?: () => void;
  initialRatio?: number;
  topRatio?: number;
  bottomRatio?: number;
}

const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  onResize,
  onMaximizeTop,
  onMaximizeBottom,
  onCenter,
  initialRatio = 0.5,
  topRatio = 1,
  bottomRatio = 1
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const initialRatioRef = useRef<number>(initialRatio);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 如果点击的是按钮，不启动拖拽
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    
    setIsDragging(true);
    dragStartY.current = e.clientY;
    initialRatioRef.current = initialRatio;
    
    e.preventDefault();
  }, [initialRatio]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY.current;
    const windowHeight = window.innerHeight;
    const deltaRatio = deltaY / windowHeight;
    
    let newRatio = initialRatioRef.current + deltaRatio;
    newRatio = Math.max(0.1, Math.min(0.9, newRatio)); // 限制在10%-90%之间
    
    onResize?.(newRatio);
  }, [isDragging, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMaximizeTop = useCallback(() => {
    onMaximizeTop?.();
  }, [onMaximizeTop]);

  const handleMaximizeBottom = useCallback(() => {
    onMaximizeBottom?.();
  }, [onMaximizeBottom]);

  const handleCenter = useCallback(() => {
    onCenter?.();
  }, [onCenter]);

  return (
    <SplitterContainer
      ref={splitterRef}
      $isActive={isHovered || isDragging}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      <DragHandle $isDragging={isDragging} />
      
      <IndicatorContainer $visible={isHovered && !isDragging}>
        {/* 当上半部分被隐藏时，只显示恢复按钮 */}
        {topRatio === 0 ? (
          <ArrowButton
            onClick={handleCenter}
            title="Restore BPMN Editor"
          >
            ▼
          </ArrowButton>
        ) : 
        /* 当下半部分被隐藏时，只显示恢复按钮 */
        bottomRatio === 0 ? (
          <ArrowButton
            onClick={handleCenter}
            title="Restore DCR Simulator"
          >
            ▲
          </ArrowButton>
        ) : 
        /* 正常状态显示所有三个按钮 */
        (
          <>
            <ArrowButton
              onClick={handleMaximizeBottom}
              title="Maximize DCR Simulator"
            >
              ▲
            </ArrowButton>
            
            <CenterButton
              onClick={handleCenter}
              title="Reset to 50/50 split"
            >
              ═
            </CenterButton>
            
            <ArrowButton
              onClick={handleMaximizeTop}
              title="Maximize BPMN Editor"
            >
              ▼
            </ArrowButton>
          </>
        )}
      </IndicatorContainer>
    </SplitterContainer>
  );
};

export default ResizableSplitter;