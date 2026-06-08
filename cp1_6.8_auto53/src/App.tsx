import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PaperEngine } from './PaperEngine';
import { usePaperState } from './hooks/usePaperState';
import { UIOverlay } from './UIOverlay';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PaperEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    modules,
    connections,
    selectedModuleId,
    activeTool,
    addModule,
    removeModule,
    updateModule,
    addConnection,
    removeConnection,
    selectModule,
    setActiveTool,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePaperState();

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });

    const engine = new PaperEngine(canvasRef.current, {
      width: rect.width,
      height: rect.height,
      onModuleMoved: (id, x, y) => updateModule(id, { x, y }),
      onModuleRotated: (id, angle) => updateModule(id, { angle }),
      onConnectionMade: (fromId, toId) => addConnection(fromId, toId),
      onModuleSelected: (id) => selectModule(id),
    });

    engineRef.current = engine;

    const handleResize = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width: r.width, height: r.height });
      engine.resize(r.width, r.height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.syncState(modules, connections, selectedModuleId, activeTool);
  }, [modules, connections, selectedModuleId, activeTool]);

  const handleAddModule = useCallback((type: 'square' | 'triangle' | 'diamond') => {
    const cx = canvasSize.width / 2 + (Math.random() - 0.5) * 200;
    const cy = canvasSize.height / 2 + (Math.random() - 0.5) * 200;
    addModule({
      type,
      x: cx,
      y: cy,
      angle: 0,
      scale: 1,
    });
  }, [canvasSize, addModule]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedModuleId) {
      removeModule(selectedModuleId);
    }
  }, [selectedModuleId, removeModule]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} />
      <UIOverlay
        activeTool={activeTool}
        selectedModule={selectedModuleId ? modules.find((m) => m.id === selectedModuleId) ?? null : null}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setActiveTool}
        onAddModule={handleAddModule}
        onDeleteSelected={handleDeleteSelected}
        onUndo={undo}
        onRedo={redo}
        moduleCount={modules.length}
        connectionCount={connections.length}
      />
    </div>
  );
};

export default App;
