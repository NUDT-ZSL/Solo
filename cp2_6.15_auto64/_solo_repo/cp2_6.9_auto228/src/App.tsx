import React, { useState, useEffect, useCallback, useRef } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import Timeline from './Timeline';
import Animate from './Animate';
import { Frame, Layer, Stroke, ToolState, ToolType, User, ExportConfig, Point } from './types';

const generateId = () => Math.random().toString(36).substring(2, 11);
const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

const PRESET_COLORS = [
  '#FFFFFF', '#000000', '#FF4444', '#FF8800',
  '#FFDD00', '#00FF88', '#00E5FF', '#4488FF',
  '#8844FF', '#FF44AA', '#8B4513', '#808080'
];

const createDefaultLayer = (order: number): Layer => ({
  id: generateId(),
  name: `图层 ${order + 1}`,
  visible: true,
  strokes: [],
  order
});

const createDefaultFrame = (): Frame => ({
  id: generateId(),
  layers: [createDefaultLayer(0)],
  timestamp: Date.now()
});

const App: React.FC = () => {
  const [frames, setFrames] = useState<Frame[]>([createDefaultFrame()]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [toolState, setToolState] = useState<ToolState>({
    tool: 'brush',
    color: '#00E5FF',
    size: 4,
    opacity: 1
  });
  const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [showExport, setShowExport] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'gif',
    fps: 15,
    resolution: '720p'
  });
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const currentUserRef = useRef<User>({
    id: generateId(),
    name: `用户${Math.floor(Math.random() * 1000)}`,
    color: randomColor(),
    x: 0,
    y: 0
  });

  useEffect(() => {
    if (frames.length > 0 && !activeLayerId) {
      const firstLayer = frames[currentFrameIndex]?.layers[0];
      if (firstLayer) {
        setActiveLayerId(firstLayer.id);
      }
    }
  }, [frames, currentFrameIndex, activeLayerId]);

  useEffect(() => {
    const updateWsStatus = (status: 'connected' | 'disconnected' | 'connecting', text: string) => {
      setWsStatus(status);
      const dot = document.getElementById('ws-dot');
      const txt = document.getElementById('ws-text');
      if (dot) {
        dot.className = `ws-status-dot ${status}`;
      }
      if (txt) {
        txt.textContent = text;
      }
    };

    updateWsStatus('connecting', '连接中...');

    try {
      const ws = new WebSocket('ws://localhost:8080');
      wsRef.current = ws;

      ws.onopen = () => {
        updateWsStatus('connected', '已连接');
        ws.send(JSON.stringify({ type: 'join', user: currentUserRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'users':
              setRemoteUsers(data.users.filter((u: User) => u.id !== currentUserRef.current.id));
              break;
            case 'stroke':
              handleRemoteStroke(data.stroke);
              break;
            case 'cursor':
              setRemoteUsers(prev =>
                prev.map(u => u.id === data.user.id ? { ...u, x: data.user.x, y: data.user.y } : u)
              );
              break;
          }
        } catch (e) {
          console.warn('Invalid WS message:', e);
        }
      };

      ws.onclose = () => updateWsStatus('disconnected', '已断开（离线模式）');
      ws.onerror = () => updateWsStatus('disconnected', '连接失败（离线模式）');
    } catch (e) {
      updateWsStatus('disconnected', '离线模式');
    }

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleRemoteStroke = useCallback((stroke: Stroke) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      const targetLayer = frame.layers.find(l => l.strokes.some(s => s.userId === stroke.userId))
        || frame.layers[0];
      if (targetLayer) {
        targetLayer.strokes = [...targetLayer.strokes, stroke];
      }
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });
  }, [currentFrameIndex]);

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      const layer = frame.layers.find(l => l.id === activeLayerId);
      if (layer) {
        layer.strokes = [...layer.strokes, stroke];
      }
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stroke', stroke }));
    }
  }, [currentFrameIndex, activeLayerId]);

  const handleCursorMove = useCallback((x: number, y: number) => {
    currentUserRef.current.x = x;
    currentUserRef.current.y = y;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', user: currentUserRef.current }));
    }
  }, []);

  const handleToolChange = (tool: ToolType) => setToolState(prev => ({ ...prev, tool }));
  const handleColorChange = (color: string) => setToolState(prev => ({ ...prev, color }));
  const handleSizeChange = (size: number) => setToolState(prev => ({ ...prev, size }));
  const handleOpacityChange = (opacity: number) => setToolState(prev => ({ ...prev, opacity }));

  const addFrame = () => {
    setFrames(prev => {
      const newFrame = createDefaultFrame();
      return [...prev, newFrame];
    });
    setCurrentFrameIndex(prev => prev + 1);
  };

  const duplicateFrame = (index: number) => {
    setFrames(prev => {
      const srcFrame = prev[index];
      const newFrame: Frame = {
        ...createDefaultFrame(),
        layers: srcFrame.layers.map(l => ({
          ...l,
          id: generateId(),
          strokes: l.strokes.map(s => ({ ...s, id: generateId() }))
        }))
      };
      const newFrames = [...prev];
      newFrames.splice(index + 1, 0, newFrame);
      return newFrames;
    });
    setCurrentFrameIndex(index + 1);
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) return;
    setFrames(prev => prev.filter((_, i) => i !== index));
    setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, frames.length - 2)));
  };

  const addLayer = () => {
    if (frames[currentFrameIndex].layers.length >= 5) return;
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      const newLayer = createDefaultLayer(frame.layers.length);
      frame.layers = [...frame.layers, newLayer];
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });
    setActiveLayerId(frames[currentFrameIndex].layers.length > 0
      ? frames[currentFrameIndex].layers[frames[currentFrameIndex].layers.length - 1]?.id || null
      : null);
  };

  const toggleLayerVisibility = (layerId: string) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      frame.layers = frame.layers.map(l =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });
  };

  const renameLayer = (layerId: string, name: string) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      frame.layers = frame.layers.map(l =>
        l.id === layerId ? { ...l, name } : l
      );
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });
  };

  const reorderLayers = (fromIndex: number, toIndex: number) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const frame = { ...newFrames[currentFrameIndex] };
      const layers = [...frame.layers];
      const [removed] = layers.splice(fromIndex, 1);
      layers.splice(toIndex, 0, removed);
      frame.layers = layers.map((l, i) => ({ ...l, order: i }));
      newFrames[currentFrameIndex] = frame;
      return newFrames;
    });
  };

  const handleExport = (blob: Blob, type: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadowtrace-${Date.now()}.${type === 'gif' ? 'gif' : 'mp4'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const currentFrame = frames[currentFrameIndex];

  return (
    <div className="app-container">
      <button
        className="mobile-menu-btn left btn-icon"
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <button
        className="mobile-menu-btn right btn-icon"
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      <div className={`panel panel-left ${leftPanelOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          影迹画廊
        </div>
        <div className="panel-content">
          <Toolbar
            toolState={toolState}
            presetColors={PRESET_COLORS}
            onToolChange={handleToolChange}
            onColorChange={handleColorChange}
            onSizeChange={handleSizeChange}
            onOpacityChange={handleOpacityChange}
            onAddFrame={addFrame}
            onExport={() => setShowExport(true)}
          />
        </div>
      </div>

      <div className="panel-center">
        <Canvas
          frame={currentFrame}
          activeLayerId={activeLayerId}
          toolState={toolState}
          remoteUsers={remoteUsers}
          currentUserId={currentUserRef.current.id}
          onStrokeComplete={handleStrokeComplete}
          onCursorMove={handleCursorMove}
          onColorPicked={handleColorChange}
        />
      </div>

      <div className={`panel panel-right ${rightPanelOpen ? 'open' : ''}`}>
        <div className="panel-content">
          <Timeline
            frames={frames}
            currentFrameIndex={currentFrameIndex}
            activeLayerId={activeLayerId}
            onFrameSelect={setCurrentFrameIndex}
            onFrameAdd={addFrame}
            onFrameDuplicate={duplicateFrame}
            onFrameDelete={deleteFrame}
            onLayerSelect={setActiveLayerId}
            onLayerAdd={addLayer}
            onLayerVisibilityToggle={toggleLayerVisibility}
            onLayerRename={renameLayer}
            onLayerReorder={reorderLayers}
          />
        </div>
      </div>

      {showExport && (
        <Animate
          frames={frames}
          config={exportConfig}
          onConfigChange={setExportConfig}
          onComplete={handleExport}
          onCancel={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default App;
