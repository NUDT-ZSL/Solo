import { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, Car, Track, GuardRail } from '../game/engine';
import { InputManager } from '../game/input';
import { AIController } from '../game/ai';

interface GameCanvasProps {}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 600;

function GameCanvas({}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const aiRef = useRef<AIController | null>(null);
  const animationRef = useRef<number>(0);
  const [gameState, setGameState] = useState<'waiting' | 'racing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const startGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
      setGameState('racing');
      setWinner(null);
      setShowUpload(false);
      setUploaded(false);
    }
  }, []);

  const restartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetGame();
      if (aiRef.current) {
        aiRef.current.setTrack(engineRef.current.track);
      }
      setGameState('waiting');
      setWinner(null);
      setShowUpload(false);
      setUploaded(false);
    }
  }, []);

  const handleSubmitScore = useCallback(async () => {
    if (!engineRef.current || !playerName.trim()) return;
    
    const car = engineRef.current.cars[0];
    const timeSeconds = car.totalTime / 1000;
    
    try {
      await fetch('http://localhost:3001/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          playerName: playerName.trim(),
          time: timeSeconds
        })
      });
      setUploaded(true);
    } catch (e) {
      console.error('Failed to upload score:', e);
    }
  }, [playerName]);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    
    const input = new InputManager();
    inputRef.current = input;
    
    const ai = new AIController(engine.track);
    aiRef.current = ai;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      input.handleKeyDown(e.code);
      
      if (e.code === 'Space' && gameState === 'waiting') {
        startGame();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      input.handleKeyUp(e.code);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationRef.current);
    };
  }, [startGame, gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2);
      lastTime = currentTime;
      
      const engine = engineRef.current;
      const input = inputRef.current;
      const ai = aiRef.current;
      
      if (engine && input) {
        const inputs = [
          input.getInput(0),
          input.getInput(1)
        ];
        
        if (!input.isPlayer2Active() && ai) {
          inputs[1] = ai.getInput(engine.cars[1]);
        }
        
        engine.update(inputs, deltaTime);
        
        if (engine.gameState === 'finished' && gameState === 'racing') {
          setGameState('finished');
          setWinner(engine.winner);
          setShowUpload(true);
        }
      }
      
      render(ctx);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameState]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    renderPlayerView(ctx, engine, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    renderPlayerView(ctx, engine, 1, VIEW_WIDTH + 2, VIEW_WIDTH, VIEW_HEIGHT);
    
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(VIEW_WIDTH, 0, 2, VIEW_HEIGHT);
  };

  const renderPlayerView = (
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    playerIndex: number,
    offsetX: number,
    viewWidth: number,
    viewHeight: number
  ) => {
    const car = engine.cars[playerIndex];
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, 0, viewWidth, viewHeight);
    ctx.clip();
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(offsetX, 0, viewWidth, viewHeight);
    
    const camX = car.x - viewWidth / 2;
    const camY = car.y - viewHeight / 2;
    
    ctx.save();
    ctx.translate(offsetX - camX, -camY);
    
    drawTrack(ctx, engine.track);
    drawStartLine(ctx, engine.track);
    
    for (const c of engine.cars) {
      drawCar(ctx, c);
    }
    
    ctx.restore();
    
    drawHUD(ctx, engine, playerIndex, offsetX);
    
    ctx.restore();
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, track: Track) => {
    if (track.centerline.length < 2) return;
    
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = track.trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(track.centerline[0].x, track.centerline[0].y);
    for (let i = 1; i < track.centerline.length; i++) {
      ctx.lineTo(track.centerline[i].x, track.centerline[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    drawGuardRails(ctx, track.guardRails);
  };

  const drawGuardRails = (ctx: CanvasRenderingContext2D, guardRails: GuardRail[]) => {
    for (const rail of guardRails) {
      ctx.save();
      ctx.translate(rail.x, rail.y);
      ctx.rotate(rail.angle);
      ctx.fillStyle = rail.color;
      ctx.fillRect(-rail.width / 2, -rail.height / 2, rail.width, rail.height);
      ctx.restore();
    }
  };

  const drawStartLine = (ctx: CanvasRenderingContext2D, track: Track) => {
    const perpX = -Math.sin(track.startAngle);
    const perpY = Math.cos(track.startAngle);
    
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#9b59b6';
    
    ctx.beginPath();
    const halfWidth = 40;
    ctx.moveTo(
      track.startLine.x - perpX * halfWidth,
      track.startLine.y - perpY * halfWidth
    );
    ctx.lineTo(
      track.startLine.x + perpX * halfWidth,
      track.startLine.y + perpY * halfWidth
    );
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#9b59b6';
    ctx.stroke();
    
    ctx.restore();
  };

  const drawCar = (ctx: CanvasRenderingContext2D, car: Car) => {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    if (car.flashTimer > 0) {
      ctx.fillStyle = '#ef4444';
    } else {
      ctx.fillStyle = car.color;
    }
    
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.lineTo(-size * 0.4, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };

  const drawHUD = (
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    playerIndex: number,
    offsetX: number
  ) => {
    const car = engine.cars[playerIndex];
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`速度: ${Math.abs(car.speed).toFixed(1)} px/f`, offsetX + 10, 25);
    
    ctx.fillStyle = '#fbbf24';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    
    const time = engine.getCurrentLapTime(playerIndex);
    const seconds = Math.floor(time / 1000);
    const ms = Math.floor((time % 1000) / 10);
    const timeStr = `${seconds}.${ms.toString().padStart(2, '0')}`;
    
    ctx.fillText(timeStr, offsetX + VIEW_WIDTH / 2, 40);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`圈数: ${car.lap} / ${engine.maxLaps}`, offsetX + VIEW_WIDTH / 2, 65);
  };

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH + 2}
        height={CANVAS_HEIGHT}
        style={styles.canvas}
      />
      
      {gameState === 'waiting' && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <h2 style={styles.title}>准备开始</h2>
            <p style={styles.subtitle}>按空格键开始游戏</p>
            <p style={styles.hint}>玩家1: WASD控制 | 玩家2: 方向键控制</p>
            <button style={styles.startButton} onClick={startGame}>
              开始比赛
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'finished' && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <h2 style={styles.winnerText}>
              {winner === 0 ? '玩家1' : '玩家2'} 获胜！
            </h2>
            <p style={styles.timeText}>
              用时: {(engineRef.current?.cars[winner ?? 0].totalTime ?? 0) / 1000}秒
            </p>
            
            {showUpload && !uploaded && (
              <div style={styles.uploadSection}>
                <input
                  type="text"
                  placeholder="输入你的名字"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  style={styles.nameInput}
                />
                <button style={styles.uploadButton} onClick={handleSubmitScore}>
                  上传成绩
                </button>
              </div>
            )}
            
            {uploaded && (
              <p style={styles.uploadedText}>成绩已上传！</p>
            )}
            
            <button style={styles.restartButton} onClick={restartGame}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  canvas: {
    display: 'block',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    animation: 'fadeIn 0.5s ease-in-out'
  },
  overlayContent: {
    textAlign: 'center',
    color: 'white'
  },
  title: {
    fontSize: '40px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#ffffff'
  },
  subtitle: {
    fontSize: '18px',
    marginBottom: '8px',
    color: '#94a3b8'
  },
  hint: {
    fontSize: '14px',
    marginBottom: '24px',
    color: '#64748b'
  },
  startButton: {
    padding: '12px 32px',
    fontSize: '18px',
    fontWeight: 600,
    borderRadius: '12px',
    backgroundColor: '#38bdf8',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  winnerText: {
    fontSize: '40px',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#ffffff',
    animation: 'fadeIn 0.5s ease-in-out'
  },
  timeText: {
    fontSize: '20px',
    marginBottom: '24px',
    color: '#94a3b8'
  },
  uploadSection: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  nameInput: {
    padding: '10px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #4a5568',
    backgroundColor: '#1e293b',
    color: 'white',
    outline: 'none',
    width: '200px',
    textAlign: 'center'
  },
  uploadButton: {
    padding: '8px 24px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    cursor: 'pointer'
  },
  uploadedText: {
    color: '#10b981',
    marginBottom: '20px',
    fontSize: '16px'
  },
  restartButton: {
    padding: '12px 32px',
    fontSize: '18px',
    fontWeight: 600,
    borderRadius: '12px',
    backgroundColor: '#38bdf8',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default GameCanvas;
