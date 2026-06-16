import React, { useState, useCallback, useEffect, useRef } from 'react';
import Canvas, { type ToolType, type Annotation, type StickyNote, type DrawingLine, type ArrowLine, type CollaboratorCursor } from './components/Canvas';
import Toolbar from './components/Toolbar';
import { hashUuidToColor, generateNickname } from './utils/drawingEngine';
import { v4 as uuidv4 } from 'uuid';

const MAX_UNDO = 10;

interface HistoryEntry {
  annotations: Annotation[];
}

const simulateCollaborators = (): CollaboratorCursor[] => {
  const uuids = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  return uuids.map(id => ({
    id,
    name: generateNickname(id),
    color: hashUuidToColor(id),
    x: 1000 + Math.random() * 3000,
    y: 800 + Math.random() * 2000,
  }));
};

const toolNames: Record<ToolType, string> = {
  pen: '画笔',
  sticky: '便签',
  arrow: '箭头',
  eraser: '橡皮擦',
};

const App: React.FC = () => {
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#3498DB');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [fadingOutIds, setFadingOutIds] = useState<string[]>([]);
  const [fadingInIds, setFadingInIds] = useState<string[]>([]);
  const [blinkingIds, setBlinkingIds] = useState<string[]>([]);
  const [collaborators] = useState<CollaboratorCursor[]>(simulateCollaborators);

  const collaboratorsRef = useRef(collaborators);

  useEffect(() => {
    const interval = setInterval(() => {
      collaboratorsRef.current = collaboratorsRef.current.map(c => ({
        ...c,
        x: c.x + (Math.random() - 0.5) * 40,
        y: c.y + (Math.random() - 0.5) * 40,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const pushHistory = useCallback((currentAnnotations: Annotation[]) => {
    setHistory(prev => {
      const newHistory = [...prev, { annotations: currentAnnotations }];
      if (newHistory.length > MAX_UNDO) newHistory.shift();
      return newHistory;
    });
    setRedoStack([]);
  }, []);

  const handleAddLine = useCallback((line: DrawingLine) => {
    setAnnotations(prev => {
      pushHistory(prev);
      return [...prev, line];
    });
  }, [pushHistory]);

  const handleAddSticky = useCallback((sticky: StickyNote) => {
    setAnnotations(prev => {
      pushHistory(prev);
      return [...prev, sticky];
    });
  }, [pushHistory]);

  const handleAddArrow = useCallback((arrow: ArrowLine) => {
    setAnnotations(prev => {
      pushHistory(prev);
      return [...prev, arrow];
    });
  }, [pushHistory]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setBlinkingIds(prev => [...prev, id]);
    setTimeout(() => {
      setBlinkingIds(prev => prev.filter(bid => bid !== id));
      setAnnotations(prev => {
        pushHistory(prev);
        return prev.filter(a => a.id !== id);
      });
    }, 300);
  }, [pushHistory]);

  const handleUpdateAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const lastEntry = history[history.length - 1];

    const currentIds = annotations.map(a => a.id);
    const removedIds = currentIds.filter(id => !lastEntry.annotations.some(a => a.id === id));
    if (removedIds.length > 0) {
      setFadingOutIds(removedIds);
      setTimeout(() => {
        setFadingOutIds(prev => prev.filter(id => !removedIds.includes(id)));
      }, 200);
    }

    setRedoStack(prev => [...prev, { annotations }]);
    setAnnotations(lastEntry.annotations);
    setHistory(prev => prev.slice(0, -1));
  }, [history, annotations]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const lastEntry = redoStack[redoStack.length - 1];

    const restoredIds = lastEntry.annotations.map(a => a.id).filter(id => !annotations.some(a => a.id === id));
    if (restoredIds.length > 0) {
      setFadingInIds(restoredIds);
      setTimeout(() => {
        setFadingInIds(prev => prev.filter(id => !restoredIds.includes(id)));
      }, 200);
    }

    setHistory(prev => [...prev, { annotations }]);
    setAnnotations(lastEntry.annotations);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, annotations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Toolbar tool={tool} color={color} onToolChange={setTool} onColorChange={handleColorChange} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 5,
            background: 'rgba(255,255,255,0.9)',
            padding: '6px 12px',
            borderRadius: 6,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: color,
            }}
          />
          <span style={{ fontSize: 13, color: '#2C3E50', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {toolNames[tool]}
          </span>
        </div>

        <Canvas
          annotations={annotations}
          tool={tool}
          color={color}
          collaborators={collaboratorsRef.current}
          onAddLine={handleAddLine}
          onAddSticky={handleAddSticky}
          onAddArrow={handleAddArrow}
          onDeleteAnnotation={handleDeleteAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          fadingOutIds={fadingOutIds}
          fadingInIds={fadingInIds}
          blinkingIds={blinkingIds}
        />
      </div>

      <div
        style={{
          width: 200,
          height: '100vh',
          background: 'rgba(44,62,80,0.8)',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ color: '#ECF0F1', fontSize: 13, fontWeight: 600, marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
          协作者
        </div>
        {collaborators.map(c => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: c.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {c.name.charAt(0)}
            </div>
            <span style={{ color: '#ECF0F1', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}>
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
