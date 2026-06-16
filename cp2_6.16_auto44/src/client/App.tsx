import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameBoard from './GameBoard';
import {
  GameState,
  WSMessage,
  PLAYER1_KEYS,
  PLAYER2_KEYS,
  ArrowDirection,
  Player,
  GAME_CONFIG,
} from '../shared/types';

const createInitialGameState = (): GameState => ({
  phase: 'waiting',
  player1: {
    id: 'p1',
    player: 'player1',
    health: GAME_CONFIG.MAX_HEALTH,
    maxHealth: GAME_CONFIG.MAX_HEALTH,
    combo: 0,
    maxCombo: 0,
    isHit: false,
    isSpecialAttacking: false,
    connected: true,
    ready: false,
  },
  player2: {
    id: 'p2',
    player: 'player2',
    health: GAME_CONFIG.MAX_HEALTH,
    maxHealth: GAME_CONFIG.MAX_HEALTH,
    combo: 0,
    maxCombo: 0,
    isHit: false,
    isSpecialAttacking: false,
    connected: true,
    ready: false,
  },
  arrows: [],
  timeRemaining: GAME_CONFIG.GAME_DURATION,
  currentDifficulty: 0,
  winner: null,
  screenShake: false,
  fullscreenFlash: false,
});

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [damageFlash, setDamageFlash] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastArrowTimeP1 = useRef<number>(0);
  const lastArrowTimeP2 = useRef<number>(0);
  const arrowsRef = useRef<GameState['arrows']>([]);

  const generateArrowLocal = useCallback((player: Player) => {
    const directions: ArrowDirection[] = ['up', 'down', 'left', 'right'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    return {
      id: Math.random().toString(36).substr(2, 9),
      direction,
      player,
      y: GAME_CONFIG.ARROW_START_Y,
      speed: GAME_CONFIG.BASE_SPEED,
      hit: false,
      missed: false,
    };
  }, []);

  const getDifficultyForTime = useCallback((timeRemaining: number): number => {
    const elapsed = GAME_CONFIG.GAME_DURATION - timeRemaining;
    if (elapsed < 20) return 0;
    if (elapsed < 40) return 1;
    return 2;
  }, []);

  const shouldGenerateArrow = useCallback((lastTime: number, difficulty: number, now: number): boolean => {
    const interval = GAME_CONFIG.DIFFICULTY_INTERVALS[Math.min(difficulty, 2)];
    return now - lastTime >= interval;
  }, []);

  const judgeHitLocal = useCallback((arrowY: number): 'perfect' | 'good' | 'miss' | null => {
    const distance = Math.abs(arrowY - 80);
    if (distance <= GAME_CONFIG.PERFECT_WINDOW) return 'perfect';
    if (distance <= GAME_CONFIG.GOOD_WINDOW) return 'good';
    if (distance <= GAME_CONFIG.MISS_WINDOW) return 'miss';
    return null;
  }, []);

  const startGame = useCallback(() => {
    const initialState = createInitialGameState();
    initialState.phase = 'playing';
    initialState.player1.ready = true;
    initialState.player2.ready = true;
    setGameState(initialState);
    arrowsRef.current = [];
    lastUpdateRef.current = Date.now();
    lastArrowTimeP1.current = Date.now();
    lastArrowTimeP2.current = Date.now();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_game',
        payload: {}
      }));
    }
  }, []);

  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setGameState(createInitialGameState());
    arrowsRef.current = [];
    setPressedKeys(new Set());

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reset_game',
        payload: {}
      }));
    }
  }, []);

  const handleKeyPress = useCallback((player: Player, direction: ArrowDirection) => {
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const attacker = player === 'player1' ? { ...prev.player1 } : { ...prev.player2 };
      const defender = player === 'player1' ? { ...prev.player2 } : { ...prev.player1 };

      const playerArrows = arrowsRef.current.filter(
        a => a.player === player && !a.hit && !a.missed
      );

      const targetArrow = playerArrows
        .filter(a => a.direction === direction)
        .sort((a, b) => Math.abs(a.y - 80) - Math.abs(b.y - 80))[0];

      if (!targetArrow) return prev;

      const result = judgeHitLocal(targetArrow.y);
      if (!result) return prev;

      let newArrows = [...arrowsRef.current];
      let screenShake = false;
      let fullscreenFlash = false;

      if (result !== 'miss') {
        attacker.combo++;
        attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);

        const isSpecial = attacker.combo >= GAME_CONFIG.SPECIAL_COMBO_THRESHOLD;
        let damage = result === 'perfect'
          ? Math.floor(GAME_CONFIG.HIT_DAMAGE * 1.5)
          : GAME_CONFIG.HIT_DAMAGE;

        if (isSpecial) {
          damage += GAME_CONFIG.SPECIAL_DAMAGE;
          attacker.isSpecialAttacking = true;
          screenShake = true;
          fullscreenFlash = true;

          setTimeout(() => {
            setGameState(p => ({
              ...p,
              [player]: { ...p[player], isSpecialAttacking: false },
              screenShake: false,
            }));
          }, 500);

          setTimeout(() => {
            setGameState(p => ({ ...p, fullscreenFlash: false }));
          }, 300);
        }

        defender.health = Math.max(0, defender.health - damage);
        defender.isHit = true;
        defender.combo = 0;

        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 200);

        setTimeout(() => {
          setGameState(p => ({
            ...p,
            [player === 'player1' ? 'player2' : 'player1']: {
              ...p[player === 'player1' ? 'player2' : 'player1'],
              isHit: false,
            },
          }));
        }, 200);

        newArrows = newArrows.map(a =>
          a.id === targetArrow.id ? { ...a, hit: true, hitResult: result } : a
        );
      } else {
        attacker.combo = 0;
        attacker.health = Math.max(0, attacker.health - GAME_CONFIG.MISS_DAMAGE);
        attacker.isHit = true;

        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 200);

        setTimeout(() => {
          setGameState(p => ({
            ...p,
            [player]: { ...p[player], isHit: false },
          }));
        }, 200);

        newArrows = newArrows.map(a =>
          a.id === targetArrow.id ? { ...a, hit: true, missed: true, hitResult: 'miss' } : a
        );
      }

      arrowsRef.current = newArrows;

      let newPhase = prev.phase as 'waiting' | 'playing' | 'finished';
      let winner = prev.winner;

      if (defender.health <= 0 || attacker.health <= 0) {
        newPhase = 'finished';
        winner = attacker.health > defender.health
          ? player
          : player === 'player1' ? 'player2' : 'player1';
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = null;
        }
      }

      return {
        ...prev,
        player1: player === 'player1' ? attacker : defender,
        player2: player === 'player2' ? attacker : defender,
        arrows: newArrows,
        phase: newPhase,
        winner,
        screenShake,
        fullscreenFlash,
      };
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        payload: { player, direction, timestamp: Date.now() }
      }));
    }
  }, [judgeHitLocal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const key = e.key.toLowerCase();

      if (gameState.phase === 'waiting') {
        if (e.code === 'Space') {
          e.preventDefault();
          setGameState(prev => {
            if (prev.player1.ready && prev.player2.ready) {
              return prev;
            }
            return {
              ...prev,
              player1: { ...prev.player1, ready: true },
              player2: { ...prev.player2, ready: true },
            };
          });

          setTimeout(() => {
            startGame();
          }, 500);
          return;
        }
      }

      if (gameState.phase === 'finished') {
        if (e.code === 'Space') {
          e.preventDefault();
          resetGame();
          return;
        }
      }

      if (gameState.phase === 'playing') {
        if (PLAYER1_KEYS[key]) {
          e.preventDefault();
          setPressedKeys(prev => new Set(prev).add(key));
          handleKeyPress('player1', PLAYER1_KEYS[key]);
          setTimeout(() => {
            setPressedKeys(prev => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }, 100);
        }

        if (PLAYER2_KEYS[e.key]) {
          e.preventDefault();
          setPressedKeys(prev => new Set(prev).add(e.key));
          handleKeyPress('player2', PLAYER2_KEYS[e.key]);
          setTimeout(() => {
            setPressedKeys(prev => {
              const next = new Set(prev);
              next.delete(e.key);
              return next;
            });
          }, 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, handleKeyPress, startGame, resetGame]);

  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    let timerInterval: NodeJS.Timeout | null = null;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setGameState(prev => {
        if (prev.phase !== 'playing') return prev;

        const difficulty = getDifficultyForTime(prev.timeRemaining);
        let newArrows = [...arrowsRef.current];

        if (shouldGenerateArrow(lastArrowTimeP1.current, difficulty, now)) {
          newArrows.push(generateArrowLocal('player1'));
          lastArrowTimeP1.current = now;
        }

        if (shouldGenerateArrow(lastArrowTimeP2.current, difficulty, now)) {
          newArrows.push(generateArrowLocal('player2'));
          lastArrowTimeP2.current = now;
        }

        newArrows = newArrows.map(arrow => {
          if (arrow.hit || arrow.missed) return arrow;
          const newY = arrow.y - arrow.speed * deltaTime;

          if (newY < 80 - GAME_CONFIG.MISS_WINDOW && !arrow.hit) {
            const defender = arrow.player === 'player1' ? 'player1' : 'player2';
            setGameState(p => {
              const defenderState = { ...p[defender] };
              defenderState.health = Math.max(0, defenderState.health - GAME_CONFIG.MISS_DAMAGE);
              defenderState.isHit = true;
              defenderState.combo = 0;

              setDamageFlash(true);
              setTimeout(() => setDamageFlash(false), 200);

              setTimeout(() => {
                setGameState(pp => ({
                  ...pp,
                  [defender]: { ...pp[defender], isHit: false },
                }));
              }, 200);

              return { ...p, [defender]: defenderState };
            });

            return { ...arrow, y: newY, missed: true, hit: true };
          }

          return { ...arrow, y: newY };
        }).filter(a => a.y > -50);

        arrowsRef.current = newArrows;

        return {
          ...prev,
          arrows: newArrows,
          currentDifficulty: difficulty,
        };
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    timerInterval = setInterval(() => {
      setGameState(prev => {
        if (prev.phase !== 'playing') return prev;

        const newTime = prev.timeRemaining - 1;

        if (newTime <= 0) {
          if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
            gameLoopRef.current = null;
          }

          const winner = prev.player1.health > prev.player2.health
            ? 'player1'
            : prev.player2.health > prev.player1.health
              ? 'player2'
              : Math.random() > 0.5 ? 'player1' : 'player2';

          return {
            ...prev,
            phase: 'finished',
            timeRemaining: 0,
            winner,
          };
        }

        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [gameState.phase, generateArrowLocal, getDifficultyForTime, shouldGenerateArrow]);

  useEffect(() => {
    try {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to game server');
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          if (message.type === 'game_state') {
            const serverState = message.payload as GameState;
            arrowsRef.current = serverState.arrows;
            setGameState(serverState);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from game server');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.log('Running in local mode without server');
    }
  }, []);

  const renderWaitingScreen = () => (
    <div className="waiting-screen">
      <h1 className="game-title">幻音战场</h1>
      <p className="waiting-text">等待对手...</p>

      <div className="connection-status">
        <div className="status-indicator">
          <div className={`status-dot ${gameState.player1.connected ? 'connected' : ''} ${gameState.player1.ready ? 'ready' : ''}`}></div>
          <span style={{ color: 'var(--player1-color)' }}>玩家1 {gameState.player1.ready ? '(已准备)' : ''}</span>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${gameState.player2.connected ? 'connected' : ''} ${gameState.player2.ready ? 'ready' : ''}`}></div>
          <span style={{ color: 'var(--player2-color)' }}>玩家2 {gameState.player2.ready ? '(已准备)' : ''}</span>
        </div>
      </div>

      <div className="controls-info">
        <div className="control-panel player1">
          <h3>玩家1 - WASD</h3>
          <div className="key-bindings">
            <div className="key empty"></div>
            <div className={`key ${pressedKeys.has('w') ? 'pressed' : ''}`}>W</div>
            <div className="key empty"></div>
            <div className={`key ${pressedKeys.has('a') ? 'pressed' : ''}`}>A</div>
            <div className={`key ${pressedKeys.has('s') ? 'pressed' : ''}`}>S</div>
            <div className={`key ${pressedKeys.has('d') ? 'pressed' : ''}`}>D</div>
          </div>
        </div>

        <div className="control-panel player2">
          <h3>玩家2 - 方向键</h3>
          <div className="key-bindings">
            <div className="key empty"></div>
            <div className={`key ${pressedKeys.has('ArrowUp') ? 'pressed' : ''}`}>↑</div>
            <div className="key empty"></div>
            <div className={`key ${pressedKeys.has('ArrowLeft') ? 'pressed' : ''}`}>←</div>
            <div className={`key ${pressedKeys.has('ArrowDown') ? 'pressed' : ''}`}>↓</div>
            <div className={`key ${pressedKeys.has('ArrowRight') ? 'pressed' : ''}`}>→</div>
          </div>
        </div>
      </div>

      <p className="start-hint">按 空格键 开始游戏</p>
    </div>
  );

  const renderResultScreen = () => {
    const isPlayer1Winner = gameState.winner === 'player1';
    const confettiColors = ['#00f5d4', '#f72585', '#fca311', '#3a86ff', '#ff006e'];

    return (
      <div className="result-screen">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}

        <h1 className="result-title winner">
          {isPlayer1Winner ? '玩家1 胜利！' : '玩家2 胜利！'}
        </h1>

        <p className={`result-subtitle ${isPlayer1Winner ? '' : 'encouragement'}`}>
          {isPlayer1Winner ? '精彩的对决！' : '再接再厉！'}
        </p>

        <div className="result-stats">
          <div className="stat-card player1">
            <h3>玩家1</h3>
            <div className="stat-value">{gameState.player1.health}</div>
            <div className="stat-label">剩余血量</div>
            <div className="stat-value" style={{ fontSize: '32px', marginTop: '16px' }}>
              {gameState.player1.maxCombo}
            </div>
            <div className="stat-label">最高连击</div>
          </div>

          <div className="stat-card player2">
            <h3>玩家2</h3>
            <div className="stat-value">{gameState.player2.health}</div>
            <div className="stat-label">剩余血量</div>
            <div className="stat-value" style={{ fontSize: '32px', marginTop: '16px' }}>
              {gameState.player2.maxCombo}
            </div>
            <div className="stat-label">最高连击</div>
          </div>
        </div>

        <button className="restart-btn" onClick={resetGame}>
          再来一局
        </button>
      </div>
    );
  };

  return (
    <div className={`app ${gameState.screenShake ? 'screen-shake' : ''}`}>
      <div className={`fullscreen-flash ${gameState.fullscreenFlash ? 'active' : ''}`}></div>
      <div className={`damage-flash ${damageFlash ? 'active' : ''}`}></div>

      {gameState.phase === 'waiting' && renderWaitingScreen()}
      {gameState.phase === 'playing' && <GameBoard gameState={gameState} />}
      {gameState.phase === 'finished' && renderResultScreen()}
    </div>
  );
};

export default App;
