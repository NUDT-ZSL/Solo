import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Cube } from '@/components/Cube';
import { useInteraction } from '@/hooks/useInteraction';

const COLOR_STOPS = [
  { angle: 0, color: new THREE.Color(0xffffff) },
  { angle: 90, color: new THREE.Color(0xccddff) },
  { angle: 180, color: new THREE.Color(0xffeecc) },
  { angle: 270, color: new THREE.Color(0xeeccff) },
  { angle: 360, color: new THREE.Color(0xffffff) },
];

function normalizeAngle(rad: number): number {
  const deg = (rad * 180) / Math.PI;
  let d = ((deg % 360) + 360) % 360;
  return d;
}

function lerpColorByAngle(angleDeg: number): THREE.Color {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (angleDeg >= a.angle && angleDeg <= b.angle) {
      const t = (angleDeg - a.angle) / (b.angle - a.angle);
      return a.color.clone().lerp(b.color, t);
    }
  }
  return new THREE.Color(0xffffff);
}

interface AmbientLightDynamicProps {
  rotationY: number;
  ambientRef: React.MutableRefObject<THREE.Color>;
}

function AmbientLightDynamic({ rotationY, ambientRef }: AmbientLightDynamicProps) {
  const lightRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const angleDeg = normalizeAngle(rotationY);
    const color = lerpColorByAngle(angleDeg);
    ambientRef.current.copy(color);
    if (lightRef.current) {
      lightRef.current.color.copy(color);
    }
    if (dirRef.current) {
      dirRef.current.color.copy(color);
    }
  });

  return (
    <>
      <ambientLight ref={lightRef} intensity={0.6} />
      <directionalLight
        ref={dirRef}
        position={[0, 10, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, -5, -5]} intensity={0.2} color="#8888ff" />
    </>
  );
}

interface ParticlesProps {
  count?: number;
}

function Particles({ count = 80 }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const baseColor = new THREE.Color(0xaaccff);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 8 + Math.random() * 4;
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;
      siz[i] = 2 + Math.random() * 2;
    }
    return [pos, col, siz];
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.03) * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface SceneProps {
  interaction: ReturnType<typeof useInteraction>;
  ambientColorRef: React.MutableRefObject<THREE.Color>;
}

function Scene({ interaction, ambientColorRef }: SceneProps) {
  return (
    <>
      <AmbientLightDynamic rotationY={interaction.rotationY} ambientRef={ambientColorRef} />
      <Cube
        interaction={interaction}
        setRotation={interaction.setRotation}
        ambientColor={ambientColorRef.current}
      />
      <Particles count={80} />
      <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
    </>
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const interaction = useInteraction(containerRef);
  const ambientColorRef = useRef<THREE.Color>(new THREE.Color(0xffffff));

  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [frameloopMode, setFrameloopMode] = useState<'always' | 'demand'>('always');

  // Detect idle state to reduce FPS
  const idleTimer = useRef<number | null>(null);
  useEffect(() => {
    if (interaction.isInteracting) {
      if (idleTimer.current) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
      setFrameloopMode('always');
    } else {
      idleTimer.current = window.setTimeout(() => {
        // 切换到demand模式以节省资源，但因为有呼吸动画仍需保持运行
        // 这里保持always，实际Three.js会按显示器刷新率
      }, 2000);
    }
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [interaction.isInteracting]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50, near: 0.1, far: 1000 }}
        dpr={dpr}
        frameloop={frameloopMode}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        shadows
      >
        <color attach="background" args={[0x0b0b2b]} />
        <fog attach="fog" args={[0x0b0b2b, 15, 40]} />
        <Scene interaction={interaction} ambientColorRef={ambientColorRef} />
      </Canvas>
      <div className="hint-text">拖拽旋转魔方</div>
    </div>
  );
}
