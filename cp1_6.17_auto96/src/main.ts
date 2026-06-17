import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ControlPanel from './ui/ControlPanel';
import Ecosystem, { type EcosystemStats } from './ecosystem/Ecosystem';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SAND_HEIGHT = 60;

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ecosystemRef = useRef<Ecosystem | null>(null);
  const animationRef = useRef<number>(0);
  const waveOffsetRef = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<EcosystemStats>({
    fishCount: 0,
    predatorCount: 0,
    algaeCount: 0,
    stabilityScore: 100,
    events: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ecosystem = new Ecosystem(CANVAS_WIDTH, CANVAS_HEIGHT, SAND_HEIGHT);
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
      return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        ecosystem.reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#001F3F');
      gradient.addColorStop(1, '#003366');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#D4A574';
      ctx.fillRect(0, CANVAS_HEIGHT - SAND_HEIGHT, CANVAS_WIDTH, SAND_HEIGHT);

      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - SAND_HEIGHT);
      for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
        const y = CANVAS_HEIGHT - SAND_HEIGHT + Math.sin(x * 0.05) * 3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = '#C4956A';
      ctx.fill();
    };

    const drawWaves = () => {
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

        for (let x = 0; x <= CANVAS_WIDTH; x += 5) {
          const y = baseY + Math.sin(x * frequency + offset) * amplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(CANVAS_WIDTH, 0);
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

    const drawHUD = () => {
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

      ctx.restore();
    };

    const drawBoomFlash = () => {
      if (ecosystem.isBoomFlashActive()) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawBackground();
      drawWaves();

      ecosystem.update();
      ecosystem.draw(ctx);

      drawHUD();
      drawBoomFlash();

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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            borderRadius: '12px',
            boxShadow: '0 0 40px rgba(0, 100, 200, 0.3)',
            border: '2px solid rgba(0, 212, 255, 0.3)',
          }}
        />
        
        <div ref={panelRef}>
          <ControlPanel
            fishCount={stats.fishCount}
            predatorCount={stats.predatorCount}
            algaeCount={stats.algaeCount}
            stabilityScore={stats.stabilityScore}
            onSpawnFish={handleSpawnFish}
            onSpawnPredator={handleSpawnPredator}
            onSpawnAlgae={handleSpawnAlgae}
            onReset={handleReset}
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
