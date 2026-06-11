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
  const itemRef = useRef<HTMLDivElement>(null);

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

  const handleResizeStart = useCallback((e: React.MouseEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(edge);
    resizeStartX.current = e.clientX;
    resizeStartTime.current = line.startTime;
    resizeEndTime.current = line.endTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!itemRef.current) return;
      
      const rect = itemRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - resizeStartX.current;
      const timeRange = resizeEndTime.current - resizeStartTime.current;
      const deltaTime = (deltaX / rect.width) * timeRange;
      const roundedDelta = roundToStep(deltaTime, 0.1);

      if (edge === 'left') {
        const newStartTime = clamp(
          resizeStartTime.current + roundedDelta,
          0,
          resizeEndTime.current - 0.2
        );
        onUpdateTime(line.id, newStartTime, resizeEndTime.current);
      } else {
        const newEndTime = clamp(
          resizeEndTime.current + roundedDelta,
          resizeStartTime.current + 0.2,
          Number.MAX_SAFE_INTEGER
        );
        onUpdateTime(line.id, resizeStartTime.current, newEndTime);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [line.id, line.startTime, line.endTime, onUpdateTime]);

  drag(drop(itemRef));

  return (
    <div
      ref={itemRef}
      className={`lyric-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(line.id)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="lyric-tooltip">
        {formatTimeLong(line.startTime)} - {formatTimeLong(line.endTime)}
      </div>
      
      <div
        className={`resize-handle resize-handle-left ${isResizing === 'left' ? 'active' : ''}`}
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      
      <div
        className={`resize-handle resize-handle-right ${isResizing === 'right' ? 'active' : ''}`}
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      
      <div className="lyric-text">{line.text}</div>
      <div className="lyric-time">
        {formatTimeLong(line.startTime)} → {formatTimeLong(line.endTime)}
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
