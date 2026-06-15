import { useState, useRef, useEffect, useCallback } from 'react';
import Canvas, { CanvasHandle } from './components/Canvas';
import ControlPanel from './components/ControlPanel';
import { AircraftState, WindNode, Vector2D } from './utils/physics';
import { v4 as uuidv4 } from 'uuid';

interface Config {
  _id: string;
  name: string;
  nodes: WindNode[];
  aircraftStart: { x: number; y: number; angle: number };
  createdAt: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function App() {
  const canvasRef = useRef<CanvasHandle>(null);
  const [fps, setFps] = useState(60);
  const [fpsFrames, setFpsFrames] = useState(0);
  const [fpsLastTime, setFpsLastTime] = useState(Date.now());

  const [aircraftState, setAircraftState] = useState<AircraftState>({
    position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
    angle: 0,
    thrust: 0,
  });

  const [windForce, setWindForce] = useState<Vector2D>({ x: 0, y: 0 });

  const [nodes, setNodes] = useState<WindNode[]>([
    {
      id: uuidv4(),
      position: { x: 250, y: 200 },
      radius: 100,
      direction: Math.PI / 4,
      strength: 3,
    },
    {
      id: uuidv4(),
      position: { x: 550, y: 400 },
      radius: 80,
      direction: -Math.PI / 3,
      strength: 2,
    },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH);

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = window.innerWidth - 220 - 32;
      const availableHeight = window.innerHeight - 48 - 32;
      const maxWidth = Math.min(CANVAS_WIDTH, availableWidth);
      const scaledByHeight = (availableHeight / CANVAS_HEIGHT) * CANVAS_WIDTH;
      const finalWidth = Math.max(600, Math.min(maxWidth, scaledByHeight));
      setCanvasWidth(finalWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - fpsLastTime) / 1000;
      setFps(Math.round(fpsFrames / delta));
      setFpsFrames(0);
      setFpsLastTime(now);
    }, 500);

    return () => clearInterval(interval);
  }, [fpsFrames, fpsLastTime]);

  const handleAircraftStateChange = useCallback((state: AircraftState) => {
    setAircraftState(state);
    setFpsFrames((f) => f + 1);
  }, []);

  const handleWindForceChange = useCallback((force: Vector2D) => {
    setWindForce(force);
  }, []);

  const handleAddNode = (nodeData: Omit<WindNode, 'id'>) => {
    const newNode: WindNode = {
      ...nodeData,
      id: uuidv4(),
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const handleUpdateNode = (id: string, updates: Partial<WindNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const handleReset = () => {
    canvasRef.current?.resetAircraft();
  };

  const handleLoadConfig = (config: Config) => {
    setNodes(config.nodes || []);
    setSelectedNodeId(null);
    const startPos = config.aircraftStart || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, angle: 0 };
    setAircraftState({
      position: { x: startPos.x, y: startPos.y },
      velocity: { x: 0, y: 0 },
      angle: startPos.angle,
      thrust: 0,
    });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        overflow: 'hidden',
      }}
    >
      <nav
        style={{
          height: 48,
          minHeight: 48,
          backgroundColor: '#0a0f1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
          <span style={{ color: '#3b82f6' }}>Wind</span>Sim
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#94a3b8' }}>
          FPS: <span style={{ color: fps >= 55 ? '#10b981' : fps >= 30 ? '#facc15' : '#ef4444' }}>{fps}</span>
        </div>
      </nav>

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
        }}
      >
        <ControlPanel
          aircraftState={aircraftState}
          windForce={windForce}
          selectedNode={selectedNode}
          nodes={nodes}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onReset={handleReset}
          onLoadConfig={handleLoadConfig}
          onUpdateNode={handleUpdateNode}
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              width: canvasWidth,
              maxWidth: '100%',
              transition: 'width 0.2s ease',
            }}
          >
            <Canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              aircraftState={aircraftState}
              onAircraftStateChange={handleAircraftStateChange}
              onWindForceChange={handleWindForceChange}
            />
            <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              WASD 控制飞行 | 点击风场节点选中 | 画布尺寸 {CANVAS_WIDTH}x{CANVAS_HEIGHT}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
