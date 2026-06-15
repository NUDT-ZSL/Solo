import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { MapRenderer } from './render/MapRenderer';
import { GameRenderer } from './render/GameRenderer';
import { UIRenderer } from './render/UIRenderer';
import { GameState, InputState, Role, Rect, Vector2 } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const gameEngineRef = useRef<GameEngine | null>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const uiRendererRef = useRef<UIRenderer | null>(null);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [fps, setFps] = useState(60);
  
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    crouch: false,
    onWall: false,
    skill: false
  });
  
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    onStartBtn: boolean;
    onRestartBtn: boolean;
    startBtnClicked: boolean;
    restartBtnClicked: boolean;
  }>({
    x: 0,
    y: 0,
    targetX: 400,
    targetY: 300,
    onStartBtn: false,
    onRestartBtn: false,
    startBtnClicked: false,
    restartBtnClicked: false
  });
  
  const startBtnRef = useRef<Rect | null>(null);
  const restartBtnRef = useRef<Rect | null>(null);
  const roleRef = useRef<Role>(Role.STALKER);
  const animationFrameRef = useRef<number>(0);
  const lastSkillPressRef = useRef<boolean>(false);

  const initGame = useCallback(() => {
    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine();
      gameEngineRef.current.setStateChangeCallback((state) => {
        setGameState(state);
      });
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!mapRendererRef.current) {
      mapRendererRef.current = new MapRenderer(ctx);
    } else {
      mapRendererRef.current.setContext(ctx);
    }
    
    if (!gameRendererRef.current) {
      gameRendererRef.current = new GameRenderer(ctx);
    } else {
      gameRendererRef.current.setContext(ctx);
    }
    
    if (!uiRendererRef.current) {
      uiRendererRef.current = new UIRenderer(ctx);
    } else {
      uiRendererRef.current.setContext(ctx);
    }
    
    setGameState(gameEngineRef.current.getState());
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      if (mapRendererRef.current) mapRendererRef.current.setContext(ctx);
      if (gameRendererRef.current) gameRendererRef.current.setContext(ctx);
      if (uiRendererRef.current) uiRendererRef.current.setContext(ctx);
    }
  }, []);

  useEffect(() => {
    initGame();
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initGame, handleResize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.sprint = true;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          inputRef.current.crouch = true;
          break;
        case 'KeyE':
          inputRef.current.onWall = !inputRef.current.onWall;
          break;
        case 'KeyQ':
          if (!lastSkillPressRef.current) {
            inputRef.current.skill = true;
          }
          lastSkillPressRef.current = true;
          break;
        case 'KeyR':
          if (roleRef.current === Role.STALKER) {
            roleRef.current = Role.HUNTER;
          } else {
            roleRef.current = Role.STALKER;
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.sprint = false;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          inputRef.current.crouch = false;
          break;
        case 'KeyQ':
          lastSkillPressRef.current = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCanvasCoords(e);
      mouseRef.current.x = coords.x;
      mouseRef.current.y = coords.y;
      
      if (startBtnRef.current) {
        const btn = startBtnRef.current;
        mouseRef.current.onStartBtn = 
          coords.x >= btn.x && coords.x <= btn.x + btn.w &&
          coords.y >= btn.y && coords.y <= btn.y + btn.h;
      } else {
        mouseRef.current.onStartBtn = false;
      }
      
      if (restartBtnRef.current) {
        const btn = restartBtnRef.current;
        mouseRef.current.onRestartBtn = 
          coords.x >= btn.x && coords.x <= btn.x + btn.w &&
          coords.y >= btn.y && coords.y <= btn.y + btn.h;
      } else {
        mouseRef.current.onRestartBtn = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const coords = getCanvasCoords(e);
      
      if (mouseRef.current.onStartBtn) {
        mouseRef.current.startBtnClicked = true;
        return;
      }
      
      if (mouseRef.current.onRestartBtn) {
        mouseRef.current.restartBtnClicked = true;
        return;
      }
      
      if (gameStarted && gameState) {
        const engine = gameEngineRef.current;
        if (engine) {
          const mapSize = engine.getMapSize();
          const canvas = canvasRef.current;
          if (canvas) {
            const viewport = calculateViewport(canvas.clientWidth, canvas.clientHeight, mapSize.width, mapSize.height);
            const worldX = (coords.x - viewport.offsetX) / viewport.scale;
            const worldY = (coords.y - viewport.offsetY) / viewport.scale;
            
            if (worldX >= 0 && worldX <= mapSize.width && worldY >= 0 && worldY <= mapSize.height) {
              mouseRef.current.targetX = worldX;
              mouseRef.current.targetY = worldY;
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (mouseRef.current.startBtnClicked) {
        mouseRef.current.startBtnClicked = false;
        if (mouseRef.current.onStartBtn) {
          startGame();
        }
      }
      
      if (mouseRef.current.restartBtnClicked) {
        mouseRef.current.restartBtnClicked = false;
        if (mouseRef.current.onRestartBtn) {
          restartGame();
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [gameStarted, gameState]);

  const calculateViewport = (canvasWidth: number, canvasHeight: number, mapWidth: number, mapHeight: number) => {
    const scaleX = canvasWidth / mapWidth;
    const scaleY = canvasHeight / mapHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (canvasWidth - mapWidth * scale) / 2;
    const offsetY = (canvasHeight - mapHeight * scale) / 2;
    
    return { scale, offsetX, offsetY };
  };

  const startGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start();
      setGameStarted(true);
    }
  };

  const restartGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.reset();
    }
  };

  useEffect(() => {
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const render = () => {
      const canvas = canvasRef.current;
      const engine = gameEngineRef.current;
      const mapRenderer = mapRendererRef.current;
      const gameRenderer = gameRendererRef.current;
      const uiRenderer = uiRendererRef.current;
      
      if (!canvas || !engine || !mapRenderer || !gameRenderer || !uiRenderer) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      ctx.clearRect(0, 0, width, height);

      const state = engine.getState();
      const mapSize = engine.getMapSize();
      const viewport = calculateViewport(width, height, mapSize.width, mapSize.height);

      if (!gameStarted || !state.isRunning) {
        if (!gameStarted) {
          const btn = uiRenderer.renderStartScreen(
            width,
            height,
            mouseRef.current.x,
            mouseRef.current.y,
            mouseRef.current.onStartBtn,
            mouseRef.current.startBtnClicked
          );
          startBtnRef.current = btn;
        } else if (state.stats.gameOver) {
          mapRenderer.render(state.map, viewport.offsetX, viewport.offsetY, viewport.scale);
          gameRenderer.renderSonarWaves(state.sonarWaves, viewport.offsetX, viewport.offsetY, viewport.scale);
          gameRenderer.renderSonarFeedback(state.sonarFeedback, viewport.offsetX, viewport.offsetY, viewport.scale);
          gameRenderer.renderHunter(state.hunter, viewport.offsetX, viewport.offsetY, viewport.scale);
          gameRenderer.renderStalker(state.stalker, viewport.offsetX, viewport.offsetY, viewport.scale, true);
          
          const btn = uiRenderer.renderGameOverPanel(
            width,
            height,
            state.stats,
            restartGame,
            mouseRef.current.x,
            mouseRef.current.y,
            mouseRef.current.onRestartBtn,
            mouseRef.current.restartBtnClicked
          );
          restartBtnRef.current = btn;
        }
        
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      startBtnRef.current = null;
      restartBtnRef.current = null;

      const target: Vector2 = {
        x: mouseRef.current.targetX,
        y: mouseRef.current.targetY
      };
      
      engine.update(inputRef.current, target);
      inputRef.current.skill = false;

      mapRenderer.render(state.map, viewport.offsetX, viewport.offsetY, viewport.scale);
      
      gameRenderer.renderSonarWaves(state.sonarWaves, viewport.offsetX, viewport.offsetY, viewport.scale);
      gameRenderer.renderSonarFeedback(state.sonarFeedback, viewport.offsetX, viewport.offsetY, viewport.scale);

      if (roleRef.current === Role.HUNTER) {
        gameRenderer.renderHunter(state.hunter, viewport.offsetX, viewport.offsetY, viewport.scale);
        gameRenderer.renderStalker(state.stalker, viewport.offsetX, viewport.offsetY, viewport.scale, false);
      } else {
        gameRenderer.renderStalker(state.stalker, viewport.offsetX, viewport.offsetY, viewport.scale, true);
        gameRenderer.renderHunter(state.hunter, viewport.offsetX, viewport.offsetY, viewport.scale);
        gameRenderer.renderStalkerView(state.stalker, width, height);
      }

      gameRenderer.renderShadowEffect(
        state.shadowEffect.active,
        state.shadowEffect.startTime,
        state.shadowEffect.duration,
        width,
        height
      );

      gameRenderer.renderHitFlash(state.hitFlash, width, height);

      uiRenderer.renderFPS(10, height - 15, engine.getFPS());
      uiRenderer.renderRoleIndicator(10, 25, roleRef.current);

      const padding = 15;
      if (roleRef.current === Role.HUNTER) {
        uiRenderer.renderHunterStatus(padding, padding + 40, state);
      } else {
        uiRenderer.renderStalkerStatus(
          padding,
          padding + 40,
          state.stalker.health,
          state.stalker.shield,
          state.stalker.isCrouching,
          state.stalker.isOnWall
        );
      }

      mapRenderer.renderMinimap(
        width - 115,
        padding,
        100,
        state.map,
        state.hunter.position,
        roleRef.current === Role.STALKER ? state.stalker.position : null,
        state.sonarFeedback,
        state.timeRemaining,
        state.totalTime
      );

      const skillIconX = width - 80;
      const skillIconY = height - 80;
      
      if (roleRef.current === Role.STALKER) {
        uiRenderer.renderSkillIcon(
          skillIconX,
          skillIconY,
          50,
          engine.getShadowCloneCooldownPercent(),
          engine.canUseShadowClone(),
          state.shadowEffect.active,
          '影遁',
          'Q'
        );
      }

      const crosshairVisible = gameStarted && state.isRunning;
      if (crosshairVisible) {
        gameRenderer.renderCrosshair(
          mouseRef.current.x,
          mouseRef.current.y,
          state.hitFlash > 50
        );
      }

      if (state.stats.gameOver) {
        const btn = uiRenderer.renderGameOverPanel(
          width,
          height,
          state.stats,
          restartGame,
          mouseRef.current.x,
          mouseRef.current.y,
          mouseRef.current.onRestartBtn,
          mouseRef.current.restartBtnClicked
        );
        restartBtnRef.current = btn;
      }

      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 500) {
        const currentFps = (frameCount * 1000) / (now - lastFpsUpdate);
        setFps(currentFps);
        frameCount = 0;
        lastFpsUpdate = now;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: gameStarted ? 'none' : 'default',
          imageRendering: 'pixelated'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '11px',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        按 R 键切换视角角色 | 地图每次随机生成
      </div>
    </div>
  );
};

export default App;
