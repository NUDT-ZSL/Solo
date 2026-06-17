import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import ControlPanel from './ui/ControlPanel';
import Ecosystem, { type EcosystemStats } from './ecosystem/Ecosystem';

const SAND_HEIGHT = 60;
const PANEL_WIDTH = 240;
const MIN_CANVAS_WIDTH = 600;
const MIN_CANVAS_HEIGHT = 400;

function calcCanvasSize() {
  const availWidth = window.innerWidth - PANEL_WIDTH - 80;
  const availHeight = window.innerHeight - 180;
  return {
    width: Math.max(MIN_CANVAS_WIDTH, Math.min(availWidth, 1200)),
    height: Math.max(MIN_CANVAS_HEIGHT, Math.min(availHeight, 800)),
  };
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ecosystemRef = useRef<Ecosystem | null>(null);
  const animationRef = useRef<number>(0);
  const waveOffsetRef = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasSizeRef = useRef(calcCanvasSize());
  const speedRef = useRef<number>(1);

  const [stats, setStats] = useState<EcosystemStats>({
    fishCount: 0,
    predatorCount: 0,
    algaeCount: 0,
    stabilityScore: 100,
    events: [],
  });
  const [canvasSize, setCanvasSize] = useState(calcCanvasSize());
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const handleResize = useCallback(() => {
    const newSize = calcCanvasSize();
    canvasSizeRef.current = newSize;
    setCanvasSize(newSize);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = newSize.width;
      canvas.height = newSize.height;
    }

    if (ecosystemRef.current) {
      ecosystemRef.current.canvasWidth = newSize.width;
      ecosystemRef.current.canvasHeight = newSize.height;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;

    const ecosystem = new Ecosystem(cw, ch, SAND_HEIGHT);
    ecosystemRef.current = ecosystem;

    ecosystem.setStatsCallback((newStats) => {
      setStats(newStats);
    });

    ecosystem.setSpawnPositionCallback(() => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        return {
          x: rect.left - canvasRect.left + rect.width / 2,
          y: rect.top - canvasRect.top + 100,
        };
      }
      return { x: cw / 2, y: ch / 2 };
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        ecosystem.reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const drawBackground = (w: number, h: number) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#001F3F');
      gradient.addColorStop(1, '#003366');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#D4A574';
      ctx.fillRect(0, h - SAND_HEIGHT, w, SAND_HEIGHT);

      ctx.beginPath();
      ctx.moveTo(0, h - SAND_HEIGHT);
      for (let x = 0; x <= w; x += 10) {
        const y = h - SAND_HEIGHT + Math.sin(x * 0.05) * 3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = '#C4956A';
      ctx.fill();
    };

    const drawWaves = (w: number) => {
      waveOffsetRef.current += 0.02;
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      
      for (let waveLayer = 0; waveLayer < 3; waveLayer++) {
        const baseY = 20 + waveLayer * 15;
        const amplitude = 8 + waveLayer * 3;
        const frequency = 0.015 + waveLayer * 0.003;
        const offset = waveOffsetRef.current + waveLayer * 0.5;

        ctx.beginPath();
        ctx.moveTo(0, baseY);

        for (let x = 0; x <= w; x += 5) {
          const y = baseY + Math.sin(x * frequency + offset) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();

        const waveGradient = ctx.createLinearGradient(0, 0, 0, baseY + amplitude * 2);
        waveGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
        waveGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = waveGradient;
        ctx.fill();
      }

      ctx.restore();
    };

    const drawHUD = (currentSpeed: number) => {
      ctx.save();
      ctx.font = '16px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';

      const padding = 20;
      const lineHeight = 28;
      let y = padding + 20;

      ctx.fillText(`小鱼: ${stats.fishCount}`, padding, y);
      y += lineHeight;
      ctx.fillText(`大鱼: ${stats.predatorCount}`, padding, y);
      y += lineHeight;
      ctx.fillText(`海藻: ${stats.algaeCount}`, padding, y);
      y += lineHeight;

      const scoreText = `稳定性: ${stats.stabilityScore}/100`;
      const isLowScore = stats.stabilityScore < 30;

      if (isLowScore) {
        const flash = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(255, 0, 0, ${flash})`;
        ctx.lineWidth = 3;
        const textWidth = ctx.measureText(scoreText).width;
        ctx.strokeRect(padding - 5, y - 20, textWidth + 10, 28);
      }

      ctx.fillStyle = isLowScore ? '#FF0000' : '#FFFFFF';
      ctx.fillText(scoreText, padding, y);
      y += lineHeight;

      ctx.fillStyle = currentSpeed > 3 ? '#FFA500' : '#00D4FF';
      ctx.fillText(`速度: ${currentSpeed.toFixed(1)}x`, padding, y);

      ctx.restore();
    };

    const drawBoomFlash = (w: number, h: number) => {
      if (ecosystem.isBoomFlashActive()) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    };

    const render = () => {
      const w = canvasSizeRef.current.width;
      const h = canvasSizeRef.current.height;

      ctx.clearRect(0, 0, w, h);

      drawBackground(w, h);
      drawWaves(w);

      const currentSpeed = speedRef.current;
      const fullUpdates = Math.floor(currentSpeed);
      const fractionalUpdate = currentSpeed - fullUpdates;
      for (let i = 0; i < fullUpdates; i++) {
        ecosystem.update();
      }
      if (fractionalUpdate > 0 && Math.random() < fractionalUpdate) {
        ecosystem.update();
      }
      ecosystem.draw(ctx);

      drawHUD(currentSpeed);
      drawBoomFlash(w, h);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleSpawnFish = () => {
    ecosystemRef.current?.spawnFish(5);
  };

  const handleSpawnPredator = () => {
    ecosystemRef.current?.spawnPredator(5);
  };

  const handleSpawnAlgae = () => {
    ecosystemRef.current?.spawnAlgae(5);
  };

  const handleReset = () => {
    ecosystemRef.current?.reset();
  };

  const handleSpeedChange = (speed: number) => {
    setSpeedMultiplier(speed);
    speedRef.current = speed;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a1a',
      padding: '20px',
      gap: '20px',
      boxSizing: 'border-box',
    }}>
      <h1 style={{
        color: '#00D4FF',
        fontFamily: 'monospace',
        fontSize: '28px',
        margin: 0,
        textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
      }}>
        🌊 海底生态模拟 🌊
      </h1>
      
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
      }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            borderRadius: '12px',
            boxShadow: '0 0 40px rgba(0, 100, 200, 0.3)',
            border: '2px solid rgba(0, 212, 255, 0.3)',
            display: 'block',
          }}
        />
        
        <div ref={panelRef}>
          <ControlPanel
            fishCount={stats.fishCount}
            predatorCount={stats.predatorCount}
            algaeCount={stats.algaeCount}
            stabilityScore={stats.stabilityScore}
            speedMultiplier={speedMultiplier}
            onSpawnFish={handleSpawnFish}
            onSpawnPredator={handleSpawnPredator}
            onSpawnAlgae={handleSpawnAlgae}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
          />
        </div>
      </div>

      <div style={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        fontSize: '12px',
        textAlign: 'center',
        maxWidth: '800px',
      }}>
        <p style={{ margin: '5px 0' }}>
          <strong>游戏说明：</strong>投放小鱼、大鱼和海藻，观察它们的捕食和繁殖行为。
        </p>
        <p style={{ margin: '5px 0' }}>
          大鱼吃小鱼（每吃3条长大），小鱼吃海藻（每10秒1株），海藻每15秒繁殖。
        </p>
        <p style={{ margin: '5px 0' }}>
          维持 小鱼:大鱼:海藻 ≈ 5:1:10 的比例可获得高稳定性评分。
        </p>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
