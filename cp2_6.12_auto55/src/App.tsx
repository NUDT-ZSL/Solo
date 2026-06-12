import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScenarioScene } from './components/ScenarioScene';
import { ControlPanel } from './components/ControlPanel';
import { LegendPanel } from './components/LegendPanel';
import { useAppStore } from './store/useAppStore';

function AnimationLoop() {
  const { isPlaying, playSpeed, currentTime, endTime, startTime, advanceTime } = useAppStore();
  const lastTimeRef = useRef(performance.now());

  useFrame((state, delta) => {
    if (isPlaying) {
      advanceTime(delta);
    }
  });

  return null;
}

function App() {
  const { loadCities, isPlaying } = useAppStore();
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const stars = useRef(
    Array.from({ length: 100 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 2 + 1,
    }))
  ).current;

  return (
    <div className="w-screen h-screen overflow-hidden relative"
         style={{
           background: 'linear-gradient(180deg, #0a1628 0%, #1a1f2e 50%, #0f1420 100%)',
         fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
         WebkitFontSmoothing: 'antialiased',
         MozOsxFontSmoothing: 'grayscale',
         fontSmooth: 'always',
         textRendering: 'optimizeLegibility',
         WebkitTextSizeAdjust: '100%',
         msTextSizeAdjust: '100%',
       }}>
      <div
        ref={starsRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ overflow: 'hidden' }}
      >
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `twinkle ${star.twinkleSpeed}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Canvas
        camera={{ position: [0, 80, 120], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <color attach="background" args={['#0a1628']} />
        <fog attach="fog" args={['#0a1628', 150, 350]} />
        <ScenarioScene />
        <AnimationLoop />
      </Canvas>

      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-white/90 text-xl font-semibold tracking-wide">
          3D气象数据可视化沙盘
        </h1>
        <p className="text-white/40 text-xs mt-1">
          拖拽旋转 · 滚轮缩放 · 时间轴播放
        </p>
      </div>

      <LegendPanel />
      <ControlPanel />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }

        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        canvas {
          display: block;
        }

        select option {
          background: #1a1f2e;
          color: white;
        }

        @media (max-width: 1280px) and (min-width: 1024px) {
          /* 中等屏幕：图例转为底部抽屉（暂用右侧折叠） */
        }

        @media (max-width: 768px) {
          /* 小屏幕：时间轴简化 */
        }
      `}</style>
    </div>
  );
}

export default App;
