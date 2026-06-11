import React, { useCallback, useRef, useState } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LyricLine } from './types';
import { useLyricsStore } from './store/useLyricsStore';
import { formatTimeLong } from './LyricsParser';
import { clamp, roundToStep } from './utils/time';

interface DragItem {
  type: string;
  index: number;
  id: string;
}

interface LyricItemProps {
  line: LyricLine;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdateTime: (id: string, startTime: number, endTime: number) => void;
}

const LyricItem: React.FC<LyricItemProps> = ({
  line,
  index,
  isSelected,
  onSelect,
  onReorder,
  onUpdateTime,
}) => {
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartTime = useRef(0);
  const resizeEndTime = useRef(0);
  const pixelsPerSecondRef = useRef(50);
  const itemRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef(0);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'LYRIC_ITEM',
    item: { type: 'LYRIC_ITEM', index, id: line.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: 'LYRIC_ITEM',
    hover: (item) => {
      if (!itemRef.current || item.index === index) return;
      onReorder(item.index, index);
      item.index = index;
    },
  });

  const calculatePixelsPerSecond = useCallback(() => {
    if (!itemRef.current) return 50;
    const duration = Math.max(line.endTime - line.startTime, 0.5);
    const rect = itemRef.current.getBoundingClientRect();
    const cssWidth = rect.width;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledWidth = cssWidth / devicePixelRatio;
    return Math.max(30, scaledWidth / duration);
  }, [line.startTime, line.endTime]);

  const applyResizeDelta = useCallback((edge: 'left' | 'right', lineId: string) => {
    if (pendingDeltaRef.current === 0) {
      rafRef.current = null;
      return;
    }

    const deltaTime = roundToStep(pendingDeltaRef.current / pixelsPerSecondRef.current, 0.1);
    pendingDeltaRef.current = 0;

    if (edge === 'left') {
      const newStartTime = clamp(
        resizeStartTime.current + deltaTime,
        0,
        resizeEndTime.current - 0.2
      );
      onUpdateTime(lineId, newStartTime, resizeEndTime.current);
    } else {
      const newEndTime = clamp(
        resizeEndTime.current + deltaTime,
        resizeStartTime.current + 0.2,
        Number.MAX_SAFE_INTEGER
      );
      onUpdateTime(lineId, resizeStartTime.current, newEndTime);
    }

    rafRef.current = requestAnimationFrame(() => applyResizeDelta(edge, lineId));
  }, [onUpdateTime]);

  const handleResizeMove = useCallback((clientX: number, edge: 'left' | 'right') => {
    const deltaX = clientX - resizeStartX.current;
    pendingDeltaRef.current = deltaX;
    
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => applyResizeDelta(edge, line.id));
    }
  }, [applyResizeDelta, line.id]);

  const handleResizeEnd = useCallback((_edge: 'left' | 'right') => {
    setIsResizing(null);
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    pendingDeltaRef.current = 0;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (isResizing) {
      handleResizeMove(e.clientX, isResizing);
    }
  }, [isResizing, handleResizeMove]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      handleResizeEnd(isResizing);
    }
  }, [isResizing, handleResizeEnd]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (isResizing && e.touches.length > 0) {
      handleResizeMove(e.touches[0].clientX, isResizing);
    }
  }, [isResizing, handleResizeMove]);

  const handleTouchEnd = useCallback(() => {
    if (isResizing) {
      handleResizeEnd(isResizing);
    }
  }, [isResizing, handleResizeEnd]);

  const startResize = useCallback((clientX: number, edge: 'left' | 'right') => {
    pixelsPerSecondRef.current = calculatePixelsPerSecond();
    resizeStartX.current = clientX;
    resizeStartTime.current = line.startTime;
    resizeEndTime.current = line.endTime;
    pendingDeltaRef.current = 0;
    setIsResizing(edge);
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [line.startTime, line.endTime, calculatePixelsPerSecond, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    startResize(e.clientX, edge);
  }, [startResize]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    if (e.touches.length > 0) {
      startResize(e.touches[0].clientX, edge);
    }
  }, [startResize]);

  drag(dragHandleRef);
  drop(itemRef);

  return (
    <div
      ref={itemRef}
      className={`lyric-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(line.id)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <div
        ref={dragHandleRef}
        style={{
          position: 'absolute',
          left: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'grab',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          lineHeight: 1,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="拖拽调整顺序"
      >
        ⋮⋮
      </div>

      <div
        className={`resize-handle resize-handle-left ${isResizing === 'left' ? 'active' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStart={(e) => handleResizeTouchStart(e, 'left')}
        onTouchStartCapture={(e) => e.stopPropagation()}
        style={{
          left: 0,
          width: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ew-resize',
          zIndex: 10,
          touchAction: 'none',
        }}
        title="拖拽调整开始时间"
      >
        <div style={{
          width: '4px',
          height: '28px',
          backgroundColor: isResizing === 'left' ? 'var(--accent-color)' : 'rgba(233, 69, 96, 0.4)',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease, height 0.2s ease',
        }} />
      </div>

      <div
        className={`resize-handle resize-handle-right ${isResizing === 'right' ? 'active' : ''}`}
        onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStart={(e) => handleResizeTouchStart(e, 'right')}
        onTouchStartCapture={(e) => e.stopPropagation()}
        style={{
          right: 0,
          width: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ew-resize',
          zIndex: 10,
          touchAction: 'none',
        }}
        title="拖拽调整结束时间"
      >
        <div style={{
          width: '4px',
          height: '28px',
          backgroundColor: isResizing === 'right' ? 'var(--accent-color)' : 'rgba(233, 69, 96, 0.4)',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease, height 0.2s ease',
        }} />
      </div>

      <div className="lyric-tooltip">
        {formatTimeLong(line.startTime)} → {formatTimeLong(line.endTime)}
        {' '}| 时长: {(line.endTime - line.startTime).toFixed(1)}s | 步长: 0.1s
      </div>

      <div className="lyric-text" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
        {line.text}
      </div>
      <div className="lyric-time">
        {formatTimeLong(line.startTime)} → {formatTimeLong(line.endTime)}
        <span style={{ marginLeft: '8px', color: 'var(--accent-color)' }}>
          {(line.endTime - line.startTime).toFixed(1)}s
        </span>
      </div>
    </div>
  );
};

interface TimelineEditorProps {
  onEditStyle?: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = () => {
  const lyricsData = useLyricsStore((state) => state.lyricsData);
  const selectedLineId = useLyricsStore((state) => state.selectedLineId);
  const selectLine = useLyricsStore((state) => state.selectLine);
  const reorderLyricLines = useLyricsStore((state) => state.reorderLyricLines);
  const updateLyricLine = useLyricsStore((state) => state.updateLyricLine);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderLyricLines(fromIndex, toIndex);
  }, [reorderLyricLines]);

  const handleUpdateTime = useCallback((id: string, startTime: number, endTime: number) => {
    updateLyricLine(id, {
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
    });
  }, [updateLyricLine]);

  const handleSelect = useCallback((id: string) => {
    selectLine(id);
  }, [selectLine]);

  if (!lyricsData) {
    return null;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="timeline-panel">
        <div className="panel-header">
          <h2>时间轴编辑器</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            共 {lyricsData.lines.length} 行 · {formatTimeLong(lyricsData.totalDuration)}
          </span>
        </div>
        
        <div className="lyrics-list">
          {lyricsData.lines.map((line, index) => (
            <LyricItem
              key={line.id}
              line={line}
              index={index}
              isSelected={selectedLineId === line.id}
              onSelect={handleSelect}
              onReorder={handleReorder}
              onUpdateTime={handleUpdateTime}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};
