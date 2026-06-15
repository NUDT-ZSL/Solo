import { useState, useCallback, useEffect, useMemo } from 'react';
import { WorldManager, BlockType } from './game/WorldManager';
import { PlayerController } from './game/PlayerController';
import { GameEngine, EngineStats } from './game/GameEngine';
import GameCanvas from './ui/GameCanvas';
import Toolbar from './ui/Toolbar';
import WorldControls from './ui/WorldControls';

interface Toast {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function App() {
  const [currentBlock, setCurrentBlock] = useState<number>(BlockType.GRASS);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [currentWorldId, setCurrentWorldId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [stats, setStats] = useState<EngineStats>({
    fps: 0,
    blockCount: 0,
    mouseGridX: -1,
    mouseGridY: -1,
  });

  const world = useMemo(() => new WorldManager(40, 40), []);
  const player = useMemo(() => new PlayerController(world, 32), [world]);

  const handleEngineReady = useCallback((engineInstance: GameEngine) => {
    setEngine(engineInstance);
  }, []);

  const handleStatsUpdate = useCallback((newStats: EngineStats) => {
    setStats(newStats);
  }, []);

  const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 6) {
      setCurrentBlock(num);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBlockChange = useCallback((block: number) => {
    setCurrentBlock(block);
  }, []);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1e1e2e',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              animation: 'slideDown 0.3s ease',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: 'center',
          paddingTop: '20px',
          marginBottom: '10px',
        }}
      >
        <h1
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '2px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          🏰 PixelRealm
        </h1>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '12px',
            margin: '4px 0 0 0',
          }}
        >
          像素沙盒世界构建器
        </p>
      </div>

      <Toolbar
        currentBlock={currentBlock}
        onBlockChange={handleBlockChange}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
      />

      <WorldControls
        world={world}
        player={player}
        engine={engine}
        currentWorldId={currentWorldId}
        onWorldIdChange={setCurrentWorldId}
        onShowToast={handleShowToast}
      />

      <GameCanvas
        world={world}
        player={player}
        onEngineReady={handleEngineReady}
        onStatsUpdate={handleStatsUpdate}
        currentBlock={currentBlock}
        showGrid={showGrid}
      />

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px 24px',
          display: 'flex',
          gap: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            鼠标坐标
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {stats.mouseGridX >= 0 && stats.mouseGridY >= 0
              ? `(${stats.mouseGridX}, ${stats.mouseGridY})`
              : '(--, --)'}
          </div>
        </div>
        <div
          style={{
            width: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            方块总数
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {stats.blockCount}
          </div>
        </div>
        <div
          style={{
            width: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            帧率
          </div>
          <div
            style={{
              color: stats.fps >= 50 ? '#10b981' : stats.fps >= 30 ? '#f59e0b' : '#ef4444',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {stats.fps} FPS
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        * {
          user-select: none;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        button {
          font-family: inherit;
        }
        
        input {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
