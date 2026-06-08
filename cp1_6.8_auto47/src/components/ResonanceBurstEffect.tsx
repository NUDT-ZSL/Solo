import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEchoStore, ResonanceBurstData } from '@/store';

const BURST_DURATION = 1.5;
const SHOCKWAVE_EXPAND_TIME = 1.0;
const MAX_SHOCKWAVE_RADIUS = 8;
const PARTICLE_COUNT = 10;

function frequencyToColor(freq: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, (freq - 80) / (4000 - 80)));
  return [
    Math.max(0, 1 - t * 2.5),
    t < 0.3 ? t * 2 : t > 0.7 ? (1 - t) * 1.5 : 0.4,
    Math.min(1, t * 2),
  ];
}

function BurstItem({ burst }: { burst: ResonanceBurstData }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const birthRef = useRef(-1);

  const colorArr = useMemo(() => frequencyToColor(burst.frequency), [burst.frequency]);
  const colorObj = useMemo(() => new THREE.Color(...colorArr), [colorArr]);

  const velocities = useMemo(() => {
    const vel: [number, number, number][] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3 + Math.random() * 5;
      vel.push([
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed,
      ]);
    }
    return vel;
  }, []);

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    return geo;
  }, []);

  useFrame(() => {
    const now = performance.now() / 1000;
    if (birthRef.current < 0) birthRef.current = now;
    const elapsed = now - birthRef.current;
    const progress = Math.min(elapsed / BURST_DURATION, 1);

    if (sphereRef.current) {
      const expandT = Math.min(elapsed / SHOCKWAVE_EXPAND_TIME, 1);
      const s = Math.max(0.001, expandT * MAX_SHOCKWAVE_RADIUS * burst.intensity);
      sphereRef.current.scale.set(s, s, s);
      (sphereRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.35;
    }

    if (ringRef.current) {
      const expandT = Math.min(elapsed / SHOCKWAVE_EXPAND_TIME, 1);
      const s = Math.max(0.001, expandT * MAX_SHOCKWAVE_RADIUS * burst.intensity);
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.5;
    }

    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const v = velocities[i];
        arr[i * 3] = v[0] * elapsed * burst.intensity;
        arr[i * 3 + 1] = v[1] * elapsed * burst.intensity;
        arr[i * 3 + 2] = v[2] * elapsed * burst.intensity;
      }
      attr.needsUpdate = true;
      (pointsRef.current.material as THREE.PointsMaterial).opacity = (1 - progress * progress) * 0.9;
      (pointsRef.current.material as THREE.PointsMaterial).size = 0.15 * (1 - progress * 0.7);
    }
  });

  return (
    <group position={burst.position}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
          wireframe
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1, 64]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial
          color={colorObj}
          size={0.15}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export function ResonanceBurstEffect() {
  const resonanceBursts = useEchoStore(state => state.resonanceBursts);
  const removeResonanceBurst = useEchoStore(state => state.removeResonanceBurst);
  const setActiveCard = useEchoStore(state => state.setActiveCard);
  const triggeredRef = useRef(new Set<string>());
  const birthMapRef = useRef(new Map<string, number>());

  useEffect(() => {
    const now = performance.now() / 1000;
    for (const burst of resonanceBursts) {
      if (!triggeredRef.current.has(burst.id)) {
        triggeredRef.current.add(burst.id);
        birthMapRef.current.set(burst.id, now);
        setActiveCard(burst);
      }
    }
    const activeIds = new Set(resonanceBursts.map(b => b.id));
    for (const id of triggeredRef.current) {
      if (!activeIds.has(id)) {
        triggeredRef.current.delete(id);
        birthMapRef.current.delete(id);
      }
    }
  }, [resonanceBursts, setActiveCard]);

  useFrame(() => {
    const now = performance.now() / 1000;
    for (const [id, birth] of birthMapRef.current) {
      if (now - birth > BURST_DURATION) {
        removeResonanceBurst(id);
      }
    }
  });

  return (
    <>
      {resonanceBursts.map(burst => (
        <BurstItem key={burst.id} burst={burst} />
      ))}
    </>
  );
}
