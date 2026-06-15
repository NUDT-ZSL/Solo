import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Plant } from './Plant';
import { ControlPanel } from './UI';
import { usePlantStore } from './store';

export default function App() {
  const startGrowthAnimation = usePlantStore(
    (state) => state.startGrowthAnimation
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<{ count: number; lastTime: number; current: number }>({
    count: 0,
    lastTime: performance.now(),
    current: 60,
  });

  useEffect(() => {
    startGrowthAnimation();

    const measureFps = () => {
      fpsRef.current.count++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.current = fpsRef.current.count;
        fpsRef.current.count = 0;
        fpsRef.current.lastTime = now;
        (window as any).__currentFPS = fpsRef.current.current;
      }
      requestAnimationFrame(measureFps);
    };
    const animationId = requestAnimationFrame(measureFps);

    return () => cancelAnimationFrame(animationId);
  }, [startGrowthAnimation]);

  return (
    <div
      className="app-container"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0b0f19 0%, #1a2332 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, sans-serif;
          overflow: hidden;
        }
        
        .app-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .canvas-wrapper {
          width: 70%;
          height: 100%;
          position: relative;
        }
        
        .control-wrapper {
          position: fixed;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 100;
        }
        
        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
          }
          
          .canvas-wrapper {
            width: 100%;
            height: 60%;
          }
          
          .control-wrapper {
            position: relative;
            right: auto;
            top: auto;
            transform: none;
            width: 100%;
            height: 40%;
            overflow-y: auto;
          }
        }
        
        .fps-counter {
          position: fixed;
          top: 12px;
          left: 12px;
          font-size: 10px;
          font-family: monospace;
          color: rgba(255, 255, 255, 0.5);
          z-index: 200;
          pointer-events: none;
        }
      `}</style>

      <div className="fps-counter">
        FPS: {Math.round((window as any).__currentFPS || 60)}
      </div>

      <div className="canvas-wrapper" ref={canvasRef}>
        <Canvas
          camera={{
            position: [0, 0.5, 5],
            fov: 60,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          shadows
          onCreated={({ gl, scene, camera }) => {
            gl.setClearColor(new THREE.Color('#0b0f19'), 1);
            scene.fog = new THREE.Fog('#0b0f19', 3, 12);
          }}
        >
          <Plant />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.005}
            minDistance={2.5}
            maxDistance={15}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      <div className="control-wrapper">
        <ControlPanel />
      </div>
    </div>
  );
}
