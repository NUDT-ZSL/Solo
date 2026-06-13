import React, { useState, useRef, useCallback, useEffect } from 'react';
import GravityEngine from './physics/GravityEngine';
import LevelManager from './engine/LevelManager';
import type { LevelStatus } from './engine/LevelManager';
import GameCanvas from './components/GameCanvas';
import { FuelBar, LevelInfo, InfoPanel, GameButtons } from './components/ui';
import type { PhysicsState, Vec2, CelestialBody } from './physics/GravityEngine';

type GameView = 'menu' | 'playing' | 'victory';

type GravityVector = { body: CelestialBody; fx: number; fy: number; mag: number };

export default function App() {
  const [gameView, setGameView] = useState<GameView>('menu');
  const [physicsState, setPhysicsState] = useState<PhysicsState | null>(null);
  const [levelNumber, setLevelNumber] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Vec2 | null>(null);
  const [dragEnd, setDragEnd] = useState<Vec2 | null>(null);
  const [predictedTrajectory, setPredictedTrajectory] = useState<Vec2[]>([]);
  const [gravityVectors, setGravityVectors] = useState<GravityVector[]>([]);
  const [explosionActive, setExplosionActive] = useState(false);
  const [explosionPos, setExplosionPos] = useState<Vec2 | null>(null);
  const [victoryActive, setVictoryActive] = useState(false);

  const engineRef = useRef<GravityEngine | null>(null);
  const levelMgrRef = useRef<LevelManager | null>(null);
  const loopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameViewRef = useRef(gameView);

  useEffect(() => {
    gameViewRef.current = gameView;
  }, [gameView]);

  const getDimensions = useCallback(() => {
    if (containerRef.current) {
      return { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight };
    }
    return { width: 1024, height: 768 };
  }, []);

  const loadCurrentLevel = useCallback(() => {
    const engine = engineRef.current;
    const mgr = levelMgrRef.current;
    if (!engine || !mgr) return;
    const dim = getDimensions();
    const level = mgr.getCurrentLevel();
    engine.loadLevel({
      bodies: level.bodies,
      wormhole: level.wormhole,
      probeStart: level.probeStart,
      fuel: level.fuel,
      width: dim.width,
      height: dim.height,
    });
    setPhysicsState(engine.getState());
    setLevelNumber(mgr.getCurrentLevelNumber());
    setElapsedTime(0);
    setExplosionActive(false);
    setExplosionPos(null);
    setVictoryActive(false);
    setPredictedTrajectory([]);
    setGravityVectors([]);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [getDimensions]);

  const startGame = useCallback(() => {
    const dim = getDimensions();
    const engine = new GravityEngine(dim.width, dim.height);
    const mgr = new LevelManager(dim.width, dim.height);
    engineRef.current = engine;
    levelMgrRef.current = mgr;
    setGameView('playing');
    setTimeout(() => loadCurrentLevel(), 0);
  }, [getDimensions, loadCurrentLevel]);

  const resetLevel = useCallback(() => {
    const engine = engineRef.current;
    const mgr = levelMgrRef.current;
    if (!engine || !mgr) return;
    const level = mgr.getCurrentLevel();
    const dim = getDimensions();
    engine.loadLevel({
      bodies: level.bodies,
      wormhole: level.wormhole,
      probeStart: level.probeStart,
      fuel: level.fuel,
      width: dim.width,
      height: dim.height,
    });
    setPhysicsState(engine.getState());
    setElapsedTime(0);
    setExplosionActive(false);
    setExplosionPos(null);
    setPredictedTrajectory([]);
    setGravityVectors([]);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [getDimensions]);

  const goToMenu = useCallback(() => {
    setGameView('menu');
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = 0;
    }
    setPhysicsState(null);
    setVictoryActive(false);
  }, []);

  const handleLaunch = useCallback((vx: number, vy: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.launch(vx, vy);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setPredictedTrajectory([]);
  }, []);

  useEffect(() => {
    if (gameView !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      const dt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
        : 0.016;
      lastTimeRef.current = timestamp;

      const engine = engineRef.current;
      const mgr = levelMgrRef.current;
      if (!engine || !mgr) {
        loopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const state = engine.update(dt);
      setPhysicsState(state);
      setElapsedTime((prev) => prev + dt);

      if (state.probe.launched && state.probe.alive) {
        setGravityVectors(engine.getGravityVectors());
      }

      if (state.probe.launched && state.probe.alive) {
        const status: LevelStatus = mgr.checkStatus(
          state.probe.x,
          state.probe.y,
          state.probe.alive,
          state.probe.fuel,
          state.wormhole
        );

        if (status === 'won') {
          if (mgr.isVictory()) {
            setVictoryActive(true);
            setTimeout(() => setGameView('victory'), 800);
          } else {
            mgr.advanceLevel();
            setTimeout(() => loadCurrentLevel(), 800);
          }
        } else if (status === 'lost' || status === 'fuel_out') {
          setExplosionActive(true);
          setExplosionPos({ x: state.probe.x, y: state.probe.y });
          setTimeout(() => resetLevel(), 1500);
        }
      }

      loopRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = 0;
    loopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
      }
    };
  }, [gameView, loadCurrentLevel, resetLevel]);

  const getEventPos = useCallback((e: React.MouseEvent | MouseEvent): Vec2 => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (gameViewRef.current === 'menu') {
        startGame();
        return;
      }
      if (gameViewRef.current === 'victory') {
        goToMenu();
        return;
      }
      if (gameViewRef.current !== 'playing') return;
      if (!engineRef.current) return;

      const pos = getEventPos(e);
      const engine = engineRef.current;
      const state = engine.getState();
      if (state.probe.launched) return;

      setIsDragging(true);
      setDragStart(pos);
      setDragEnd(pos);
    },
    [startGame, goToMenu, getEventPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const pos = getEventPos(e);
      setDragEnd(pos);

      if (dragStart && engineRef.current) {
        const dx = dragStart.x - pos.x;
        const dy = dragStart.y - pos.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 10) {
          const speed = Math.min(mag * 1.5, 400);
          const vx = (dx / mag) * speed;
          const vy = (dy / mag) * speed;
          const traj = engineRef.current.predictTrajectory(vx, vy);
          setPredictedTrajectory(traj);
        }
      }
    },
    [isDragging, dragStart, getEventPos]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 10) {
      const speed = Math.min(mag * 1.5, 400);
      handleLaunch((dx / mag) * speed, (dy / mag) * speed);
    } else {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, dragStart, dragEnd, handleLaunch]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minWidth: 800,
        background: '#0f172a',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <GameCanvas
        physicsState={physicsState}
        predictedTrajectory={predictedTrajectory}
        gravityVectors={gravityVectors}
        isDragging={isDragging}
        dragStart={dragStart}
        dragEnd={dragEnd}
        gameView={gameView}
        explosionActive={explosionActive}
        explosionPos={explosionPos}
        victoryActive={victoryActive}
        onReset={resetLevel}
        onMenu={goToMenu}
        onLaunch={handleLaunch}
      />

      {gameView === 'playing' && physicsState && (
        <>
          {physicsState.probe.launched && physicsState.probe.alive && (
            <FuelBar fuel={physicsState.probe.fuel} maxFuel={physicsState.probe.maxFuel} />
          )}
          <LevelInfo levelNumber={levelNumber} elapsedTime={elapsedTime} />
          <InfoPanel gravityVectors={gravityVectors} />
          <GameButtons onReset={resetLevel} onMenu={goToMenu} />
        </>
      )}
    </div>
  );
}
