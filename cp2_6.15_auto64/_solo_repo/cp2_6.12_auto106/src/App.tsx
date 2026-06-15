import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CityEngine } from './engine/cityEngine';
import { Renderer } from './engine/renderer';
import { BuildingType, GameStats, SaveData } from './engine/types';
import UIContainer from './components/UIContainer';
import EventManager from './components/EventManager';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CityEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const saveIntervalRef = useRef<number>(0);

  const [stats, setStats] = useState<GameStats>({
    population: 0,
    tax: 0,
    satisfaction: 70,
    energy: 100,
    maxEnergy: 100,
    safety: 80,
    greenery: 60,
    traffic: 90,
  });
  const [timeOfDay, setTimeOfDay] = useState<number>(6);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [eventOpen, setEventOpen] = useState<boolean>(false);

  const handleResize = useCallback(() => {
    if (!rendererRef.current || !canvasRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    rendererRef.current.resize(width, height);
  }, []);

  const gameLoop = useCallback(() => {
    const now = performance.now();
    const delta = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    if (engineRef.current && rendererRef.current) {
      engineRef.current.update(delta);
      rendererRef.current.render();

      setStats(engineRef.current.getStats());
      setTimeOfDay(engineRef.current.getTimeOfDay());
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !rendererRef.current || !engineRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const grid = rendererRef.current.screenToGrid(
      e.clientX - rect.left,
      e.clientY - rect.top
    );

    const gridSize = engineRef.current.getGridSize();
    if (grid.x >= 0 && grid.x < gridSize && grid.y >= 0 && grid.y < gridSize) {
      setSelectedCell({ x: grid.x, y: grid.y });
    }
  }, []);

  const handleBuild = useCallback((x: number, y: number, type: BuildingType) => {
    if (!engineRef.current || !rendererRef.current) return;
    const success = engineRef.current.buildAt(x, y, type);
    if (success) {
      rendererRef.current.addParticles(x, y, 'build', 15);
    }
  }, []);

  const handleUpgrade = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;
    engineRef.current.upgradeRoad(x, y);
  }, []);

  const handleRepair = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;
    engineRef.current.repairBuilding(x, y);
  }, []);

  const handleTriggerEvent = useCallback((type: string) => {
    setEventOpen(true);
  }, []);

  const handleSelectCell = useCallback((x: number | null, y: number | null) => {
    if (x === null || y === null) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ x, y });
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const saveData = engineRef.current.save();
      await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ saveId: 'default', data: saveData }),
      });
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, []);

  const handleLoad = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const response = await fetch('/api/load?saveId=default');
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          engineRef.current.load(result.data as SaveData);
        }
      }
    } catch (error) {
      console.error('Failed to load:', error);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CityEngine();
    const renderer = new Renderer(canvas);

    renderer.setEngine(engine);

    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.resize(width, height);

    engineRef.current = engine;
    rendererRef.current = renderer;

    handleLoad();

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    saveIntervalRef.current = window.setInterval(handleSave, 30000);

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(saveIntervalRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameLoop, handleResize, handleSave, handleLoad]);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          overflow: hidden;
        }
        html, body, #root {
          width: 100%;
          height: 100%;
        }
        body {
          background: radial-gradient(ellipse at center, #1a0a2e 0%, #0d1b2a 100%);
        }
        canvas {
          display: block;
          width: 100vw;
          height: 100vh;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
      />

      {engineRef.current && rendererRef.current && (
        <>
          <UIContainer
            engine={engineRef.current}
            onBuild={handleBuild}
            onUpgrade={handleUpgrade}
            onRepair={handleRepair}
            onTriggerEvent={handleTriggerEvent}
            stats={stats}
            timeOfDay={timeOfDay}
            selectedCell={selectedCell}
            onSelectCell={handleSelectCell}
            renderer={rendererRef.current}
          />
          <EventManager
            engine={engineRef.current as any}
            renderer={rendererRef.current as any}
            isOpen={eventOpen}
            onClose={() => setEventOpen(false)}
          />
        </>
      )}
    </>
  );
};

export default App;
