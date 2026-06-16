import { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Sphere from '@/scene/Sphere';
import Current from '@/scene/Current';
import ControlPanel from '@/ui/ControlPanel';
import Legend from '@/ui/Legend';
import SpeedLegend from '@/ui/SpeedLegend';
import { oceanCurrents, OceanCurrent } from '@/utils/currentData';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [hoveredCurrent, setHoveredCurrent] = useState<string | null>(null);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleHover = useCallback((name: string | null) => {
    setHoveredCurrent(name);
  }, []);

  const selectedCurrent: OceanCurrent | null = hoveredCurrent
    ? oceanCurrents.find((c) => c.name === hoveredCurrent) || null
    : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[20, 10, 20]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-20, -10, -20]} intensity={0.3} />

        <Suspense fallback={
          <mesh>
            <sphereGeometry args={[8, 32, 16]} />
            <meshPhongMaterial color="#1a3a5c" />
          </mesh>
        }>
          <Sphere />
        </Suspense>

        {oceanCurrents.map((current) => (
          <Current
            key={current.name}
            current={current}
            isPlaying={isPlaying}
            isHovered={hoveredCurrent === current.name}
            onHover={handleHover}
          />
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={30}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      <ControlPanel isPlaying={isPlaying} onToggle={handleTogglePlay} />
      <Legend selectedCurrent={selectedCurrent} />
      <SpeedLegend />

      <div
        style={{
          position: 'fixed',
          top: '24px',
          left: '24px',
          color: '#ffffff',
          zIndex: 100,
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            margin: 0,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            background: 'linear-gradient(90deg, #00d4ff, #ff6b35, #e63946)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          全球海洋洋流
        </h1>
        <p
          style={{
            fontSize: '12px',
            opacity: 0.7,
            margin: '4px 0 0 0',
          }}
        >
          实时3D动态可视化
        </p>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '11px',
          zIndex: 100,
        }}
      >
        <div>拖拽旋转 · 滚轮缩放 · 悬浮查看详情</div>
      </div>
    </div>
  );
}
