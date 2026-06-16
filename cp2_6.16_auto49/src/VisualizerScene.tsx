import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const BAR_COUNT = 48;
const MIN_HEIGHT = 0.5;
const MAX_HEIGHT = 8;
const RADIUS = 7;
const PARTICLE_COUNT = 1000;
const SHELL_RADIUS = 8;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const COLOR_BOTTOM = new THREE.Color('#4a00e0');
const COLOR_TOP = new THREE.Color('#ff006e');
const COLOR_PURPLE = new THREE.Color('#8e2de2');
const COLOR_CYAN = new THREE.Color('#00f2fe');

interface BarsProps {
  frequencyData: number[];
}

function Bars({ frequencyData }: BarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const smoothHeights = useRef<number[]>(new Array(BAR_COUNT).fill(MIN_HEIGHT));

  const barGeometry = useMemo(() => new THREE.BoxGeometry(0.35, 1, 0.35), []);

  const barMaterials = useMemo(() => {
    return new Array(BAR_COUNT).fill(0).map(() =>
      new THREE.MeshStandardMaterial({
        metalness: 0.6,
        roughness: 0.25,
        emissiveIntensity: 0.4,
      })
    );
  }, []);

  const positions = useMemo(() => {
    const arr: { x: number; z: number; angle: number }[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2;
      arr.push({
        x: Math.cos(angle) * RADIUS,
        z: Math.sin(angle) * RADIUS,
        angle,
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const smoothFactor = Math.min(delta * 12, 0.9);

    for (let i = 0; i < BAR_COUNT; i++) {
      const normalized = frequencyData[i] ?? 0;
      const targetHeight = MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT);
      smoothHeights.current[i] = lerp(smoothHeights.current[i], targetHeight, smoothFactor);

      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      const h = smoothHeights.current[i];
      mesh.scale.y = h;
      mesh.position.y = h / 2;

      const tRaw = (h - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT);
      const t = Math.max(0, Math.min(1, tRaw));
      const r = lerp(COLOR_BOTTOM.r, COLOR_TOP.r, t);
      const g = lerp(COLOR_BOTTOM.g, COLOR_TOP.g, t);
      const b = lerp(COLOR_BOTTOM.b, COLOR_TOP.b, t);

      const mat = barMaterials[i] as THREE.MeshStandardMaterial;
      mat.color.setRGB(r, g, b);
      mat.emissive.setRGB(r, g, b);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          position={[pos.x, MIN_HEIGHT / 2, pos.z]}
          rotation={[0, -pos.angle + Math.PI / 2, 0]}
          geometry={barGeometry}
          material={barMaterials[i]}
        />
      ))}
    </group>
  );
}

interface ParticleShellProps {
  frequencyData: number[];
}

function ParticleShell({ frequencyData }: ParticleShellProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  const colorPhase = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      const x = SHELL_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SHELL_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SHELL_RADIUS * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = COLOR_PURPLE.clone();
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    basePositions.current = positions.slice();
    colorsRef.current = colors;

    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.06,
        transparent: true,
        opacity: 0.3,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    []
  );

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    colorPhase.current += delta * 0.8;
    const beatTime = state.clock.elapsedTime;
    const beatPulse = 0.5 + 0.5 * Math.sin(beatTime * Math.PI * 2 * 4);
    const scaleFactor = 1 + beatPulse * 0.05;

    const t = (Math.sin(colorPhase.current * 0.5) + 1) / 2;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    const base = basePositions.current!;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      posAttr.array[i3] = base[i3] * scaleFactor;
      posAttr.array[i3 + 1] = base[i3 + 1] * scaleFactor;
      posAttr.array[i3 + 2] = base[i3 + 2] * scaleFactor;

      const colorT = (t + i / PARTICLE_COUNT * 0.3) % 1;
      const tt = 0.5 + 0.5 * Math.sin(colorT * Math.PI * 2);
      const r = lerp(COLOR_PURPLE.r, COLOR_CYAN.r, tt);
      const g = lerp(COLOR_PURPLE.g, COLOR_CYAN.g, tt);
      const b = lerp(COLOR_PURPLE.b, COLOR_CYAN.b, tt);
      colAttr.array[i3] = r;
      colAttr.array[i3 + 1] = g;
      colAttr.array[i3 + 2] = b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x += delta * 0.02;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

function CenterGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const s = 1 + 0.08 * Math.sin(state.clock.elapsedTime * 2);
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshBasicMaterial color="#6c63ff" transparent opacity={0.9} />
    </mesh>
  );
}

function FloorRing() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MIN_HEIGHT * 0.02, 0]}>
      <ringGeometry args={[RADIUS - 0.8, RADIUS + 0.6, 64]} />
      <meshBasicMaterial color="#6c63ff" transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface SceneProps {
  frequencyData: number[];
}

function Scene({ frequencyData }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 12, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, 8, -10]} intensity={0.8} color="#6c63ff" />
      <pointLight position={[0, 15, 0]} intensity={0.6} color="#ff006e" />

      <Bars frequencyData={frequencyData} />
      <ParticleShell frequencyData={frequencyData} />
      <CenterGlow />
      <FloorRing />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={Math.PI / 2 - Math.PI / 6}
        maxPolarAngle={Math.PI / 2 + Math.PI / 6}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
}

interface VisualizerSceneProps {
  frequencyData: number[];
}

export function VisualizerScene({ frequencyData }: VisualizerSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 6, 16], fov: 60, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      frameloop="always"
    >
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 20, 60]} />
      <Scene frequencyData={frequencyData} />
    </Canvas>
  );
}

export default VisualizerScene;
