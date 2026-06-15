import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { PhysicsEngine } from './physics/Physics';
import type { BlockData, BlockMaterial, Particle, HistoryAction, SimulationState } from './types';
import {
  CELL_SIZE,
  MAX_HISTORY_SIZE,
  MAX_PARTICLES,
  MATERIAL_CONFIGS,
} from './types';
import './App.css';

const generateId = () => Math.random().toString(36).substring(2, 11);

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<BlockMaterial>('wood');
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const [history, setHistory] = useState<HistoryAction[]>([]);

  const physicsRef = useRef<PhysicsEngine | null>(null);
  const particleAnimFrameRef = useRef<number | null>(null);
  const blocksRef = useRef<BlockData[]>([]);

  blocksRef.current = blocks;

  const occupiedGrid = useMemo(() => {
    const grid = new Set<string>();
    for (const block of blocks) {
      grid.add(`${block.gridX},${block.gridY}`);
    }
    return grid;
  }, [blocks]);

  useEffect(() => {
    physicsRef.current = new PhysicsEngine({
      onPositionUpdate: (positions) => {
        setBlocks((prev) =>
          prev.map((block) => {
            const pos = positions.get(block.id);
            if (pos) {
              return { ...block, x: pos.x - CELL_SIZE / 2, y: pos.y - CELL_SIZE / 2, angle: pos.angle };
            }
            return block;
          })
        );
      },
      onCollision: (newParticles) => {
        setParticles((prev) => {
          const combined = [...prev, ...newParticles];
          if (combined.length > MAX_PARTICLES) {
            return combined.slice(-MAX_PARTICLES);
          }
          return combined;
        });
      },
      onStable: () => {
        setSimulationState('stable');
      },
    });

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroy();
        physicsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (simulationState !== 'simulating') return;

    const lastTimeRef = { current: performance.now() };

    const updateParticles = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1,
            life: p.life - delta,
          }))
          .filter((p) => p.life > 0);
        return updated;
      });

      particleAnimFrameRef.current = requestAnimationFrame(updateParticles);
    };

    particleAnimFrameRef.current = requestAnimationFrame(updateParticles);

    return () => {
      if (particleAnimFrameRef.current !== null) {
        cancelAnimationFrame(particleAnimFrameRef.current);
        particleAnimFrameRef.current = null;
      }
    };
  }, [simulationState]);

  useEffect(() => {
    if (simulationState !== 'simulating') return;

    const interval = setInterval(() => {
      setParticles((prev) => prev.filter((p) => p.life > 0));
    }, 500);

    return () => clearInterval(interval);
  }, [simulationState]);

  const addHistory = useCallback((action: HistoryAction) => {
    setHistory((prev) => {
      const next = [...prev, action];
      if (next.length > MAX_HISTORY_SIZE) {
        return next.slice(next.length - MAX_HISTORY_SIZE);
      }
      return next;
    });
  }, []);

  const handleLeftClick = useCallback(
    (gridX: number, gridY: number) => {
      if (simulationState === 'simulating') return;
      if (occupiedGrid.has(`${gridX},${gridY}`)) return;

      const id = generateId();
      const x = gridX * CELL_SIZE;
      const y = gridY * CELL_SIZE;
      const config = MATERIAL_CONFIGS[selectedMaterial];

      const newBlock: BlockData = {
        id,
        material: selectedMaterial,
        gridX,
        gridY,
        x,
        y,
        angle: 0,
      };

      if (physicsRef.current) {
        const added = physicsRef.current.addBlock({
          ...newBlock,
          x: x + CELL_SIZE / 2,
          y: y + CELL_SIZE / 2,
        });
        if (!added) return;
      }

      setBlocks((prev) => [...prev, newBlock]);
      addHistory({ type: 'add', block: newBlock });
      setSimulationState('idle');
    },
    [simulationState, selectedMaterial, occupiedGrid, addHistory]
  );

  const handleRightClick = useCallback(
    (gridX: number, gridY: number) => {
      if (simulationState === 'simulating') return;

      const blockToRemove = blocks.find(
        (b) => b.gridX === gridX && b.gridY === gridY
      );
      if (!blockToRemove) return;

      if (physicsRef.current) {
        const removed = physicsRef.current.removeBlock(blockToRemove.id);
        if (!removed) return;
      }

      setBlocks((prev) => prev.filter((b) => b.id !== blockToRemove.id));
      addHistory({ type: 'remove', block: blockToRemove });
      setSimulationState('idle');
    },
    [simulationState, blocks, addHistory]
  );

  const handleUndo = useCallback(() => {
    if (simulationState === 'simulating') return;
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    if (lastAction.type === 'add') {
      if (physicsRef.current) {
        physicsRef.current.removeBlock(lastAction.block.id);
      }
      setBlocks((prev) => prev.filter((b) => b.id !== lastAction.block.id));
    } else {
      if (physicsRef.current) {
        physicsRef.current.addBlock({
          ...lastAction.block,
          x: lastAction.block.x + CELL_SIZE / 2,
          y: lastAction.block.y + CELL_SIZE / 2,
        });
      }
      setBlocks((prev) => [...prev, lastAction.block]);
    }
    setSimulationState('idle');
  }, [simulationState, history]);

  const handleClear = useCallback(() => {
    if (simulationState === 'simulating') return;

    if (physicsRef.current) {
      physicsRef.current.reset();
    }
    setBlocks([]);
    setParticles([]);
    setHistory([]);
    setSimulationState('idle');
  }, [simulationState]);

  const handleStartSimulation = useCallback(() => {
    if (blocks.length === 0) return;
    if (simulationState === 'simulating') return;

    setSimulationState('simulating');
    setParticles([]);
    if (physicsRef.current) {
      physicsRef.current.start();
    }
  }, [blocks.length, simulationState]);

  const handlePauseSimulation = useCallback(() => {
    if (simulationState !== 'simulating') return;

    setSimulationState('idle');
    if (physicsRef.current) {
      physicsRef.current.stop();
    }
  }, [simulationState]);

  const handleSelectMaterial = useCallback((material: BlockMaterial) => {
    setSelectedMaterial(material);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">BlockForge</h1>
      </header>
      <main className="main-content">
        <Toolbar
          selectedMaterial={selectedMaterial}
          onSelectMaterial={handleSelectMaterial}
          simulationState={simulationState}
          onStartSimulation={handleStartSimulation}
          onPauseSimulation={handlePauseSimulation}
          onClear={handleClear}
          onUndo={handleUndo}
          canUndo={history.length > 0}
        />
        <div className="canvas-wrapper">
          <Canvas
            blocks={blocks}
            particles={particles}
            isSimulating={simulationState === 'simulating'}
            onLeftClick={handleLeftClick}
            onRightClick={handleRightClick}
          />
          <div className="info-bar">
            <span>方块数量: {blocks.length}</span>
            <span>粒子数量: {particles.length}</span>
            <span>
              状态:{' '}
              {simulationState === 'idle' && '空闲'}
              {simulationState === 'simulating' && '模拟中'}
              {simulationState === 'stable' && '已稳定'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
