import { useState, useCallback } from 'react';
import GradientCanvas from './GradientCanvas';
import ColorPickerPanel from './ColorPickerPanel';
import type { ColorNode, GradientType } from './types';

const DEFAULT_NODES: ColorNode[] = [
  { id: 'node-1', color: '#FF6B6B', x: 0, y: 50 },
  { id: 'node-2', color: '#4ECDC4', x: 100, y: 50 },
];

export default function App() {
  const [colorNodes, setColorNodes] = useState<ColorNode[]>(DEFAULT_NODES);
  const [angle, setAngle] = useState(0);
  const [gradientType, setGradientType] = useState<GradientType>('linear');

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setColorNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, x, y } : n))
      );
    },
    []
  );

  return (
    <div
      className="app-container"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0f0f23',
        display: 'flex',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div
        className="app-canvas-area"
        style={{
          width: '70%',
          height: '100%',
          padding: 20,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <GradientCanvas
          colorNodes={colorNodes}
          angle={angle}
          gradientType={gradientType}
          onPositionChange={handlePositionChange}
        />
      </div>
      <div
        className="app-divider"
        style={{
          width: '2px',
          background: '#2a2a4e',
          flexShrink: 0,
        }}
      />
      <div
        className="app-panel-area"
        style={{
          width: '30%',
          height: '100%',
          background: '#1a1a2e',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <ColorPickerPanel
          colorNodes={colorNodes}
          angle={angle}
          gradientType={gradientType}
          onColorNodesChange={setColorNodes}
          onAngleChange={setAngle}
          onGradientTypeChange={setGradientType}
        />
      </div>
    </div>
  );
}
