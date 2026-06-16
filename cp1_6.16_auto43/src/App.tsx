import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameState, MAP_WIDTH, MAP_HEIGHT, WIN_MINERALS } from './game/GameEngine';
import { PlayerController } from './player/PlayerController';
import { Leaderboard, LeaderboardDisplayEntry } from './player/Leaderboard';
import { GameCanvas } from './ui/GameCanvas';
import { HoverPanel } from './ui/HoverPanel';
import { LeaderboardDisplay } from './ui/LeaderboardDisplay';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardDisplayEntry[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const gameEngineRef = useRef<GameEngine | null>(null);
  const playerControllerRef = useRef<PlayerController | null>(null);
  const leaderboardRef = useRef<Leaderboard | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const engine = new GameEngine();
    const controller = new PlayerController(engine);
    const leaderboard = new Leaderboard();

    gameEngineRef.current = engine;
    playerControllerRef.current = controller;
    leaderboardRef.current = leaderboard;

    engine.onUpdate((state) => {
      setGameState(state);
      leaderboard.updateFallbackFromPlayers(
        state.players.map((p) => ({
          id: p.id,
          name: p.name,
          mineralCount: p.mineralCount,
          color: p.color,
        }))
      );
    });

    leaderboard.onUpdate((entries) => {
      setLeaderboardEntries(entries);
    });

    const initGame = async () => {
      await engine.initializeGame(['玩家1', '玩家2', '玩家3']);
      const localPlayerId = engine.getLocalPlayerId();
      leaderboard.setLocalPlayerId(localPlayerId);
      controller.initialize(engine.getPlayers().map((p) => p.id));
      setGameState(engine.getState());
      setIsInitialized(true);
    };

    initGame();

    return () => {
      engine.destroy();
      controller.destroy();
      leaderboard.destroy();
    };
  }, []);

  useEffect(() => {
    if (canvasContainerRef.current) {
      const updateRect = () => {
        const canvas = canvasContainerRef.current?.querySelector('canvas');
        if (canvas) {
          setCanvasRect(canvas.getBoundingClientRect());
        }
      };
      updateRect();
      window.addEventListener('resize', updateRect);
      return () => window.removeEventListener('resize', updateRect);
    }
  }, [isInitialized]);

  const handleStart = useCallback(() => {
    gameEngineRef.current?.startCountdown();
  }, []);

  const handleReset = useCallback(() => {
    gameEngineRef.current?.resetGame();
  }, []);

  const handleMouseMove = useCallback((x: number, y: number) => {
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: null, y: null });
  }, []);

  const status = gameState?.status;
  const countdown = gameState?.countdown ?? 0;
  const winner = gameState?.winner;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0B0C10 0%, #1F2833 100%)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div ref={canvasContainerRef} style={{ position: 'relative' }}>
        {isInitialized && (
          <GameCanvas
            gameState={gameState}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </div>

      {isInitialized && gameState && (
        <HoverPanel
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          players={gameState.players}
          minerals={gameState.minerals}
          pirates={gameState.pirates}
          canvasRect={canvasRect}
        />
      )}

      {isInitialized && <LeaderboardDisplay entries={leaderboardEntries} />}

      {status === 'countdown' && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#E74C3C',
            fontSize: '72px',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(231, 76, 60, 0.8)',
            animation: 'countdownPulse 0.5s ease-in-out infinite',
          }}
        >
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #0F2027 0%, #203A43 50%, #0F2027 100%)',
          padding: '12px 24px',
          borderRadius: '12px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {status === 'idle' && (
          <button
            onClick={handleStart}
            style={{
              background: '#1ABC9C',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🚀 开始游戏
          </button>
        )}

        {(status === 'playing' || status === 'countdown') && (
          <div
            style={{
              color: '#C5C6C7',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '14px',
            }}
          >
            玩家1: WASD | 玩家2: 方向键 | 玩家3: IJKL
          </div>
        )}

        <button
          onClick={handleReset}
          style={{
            background: '#E74C3C',
            color: '#FFFFFF',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🔄 重置
        </button>
      </div>

      {winner && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              color: '#FFD700',
              fontSize: '60px',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 'bold',
              textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
              animation: 'slideUp 0.5s ease',
              marginBottom: '32px',
            }}
          >
            🏆 {winner.name} 获胜！
          </div>
          <div
            style={{
              color: '#C5C6C7',
              fontSize: '24px',
              fontFamily: "'Orbitron', sans-serif",
              marginBottom: '32px',
            }}
          >
            采集了 {winner.mineralCount} 个矿物
          </div>
          <button
            onClick={handleReset}
            style={{
              background: '#E74C3C',
              color: '#FFFFFF',
              border: 'none',
              padding: '16px 48px',
              borderRadius: '12px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔄 再来一局
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#66FCF1',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(102, 252, 241, 0.5)',
        }}
      >
        ⭐ 太空采矿竞速 ⭐
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes countdownPulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.2); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default App;
