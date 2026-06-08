import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EMOTION_CONFIG } from '../BottleData';
import { useOceanStore } from '../store';

const FOAM_COUNT = 80;
const STAR_COUNT = 60;
const LIGHT_COUNT = 40;
const BREAK_PARTICLE_COUNT = 50;
const MAX_TOTAL_BREAK_PARTICLES = 300;
const BREAK_DURATION = 2;

export function WaveFoamParticles() {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(FOAM_COUNT * 3);
    for (let i = 0; i < FOAM_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = 0.05 + Math.random() * 0.1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return arr;
  }, []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(FOAM_COUNT);
    for (let i = 0; i < FOAM_COUNT; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);

  useFrame((state) => {
    const geo = ref.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < FOAM_COUNT; i++) {
      pos[i * 3 + 1] = 0.05 + Math.sin(t * 0.5 + offsets[i]) * 0.05 + 0.05;
      pos[i * 3] += Math.sin(t * 0.3 + offsets[i]) * 0.001;
      pos[i * 3 + 2] += Math.cos(t * 0.2 + offsets[i]) * 0.001;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={FOAM_COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.04} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function StarlightParticles() {
  const ref = useRef<THREE.Points>(null!);
  const basePositions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = 3 + Math.random() * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);

  useFrame((state) => {
    const geo = ref.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    const mat = ref.current.material as THREE.PointsMaterial;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < STAR_COUNT; i++) {
      const o = offsets[i];
      pos[i * 3 + 1] += 0.003;
      pos[i * 3] += Math.sin(t * 0.1 + o) * 0.002;
      if (pos[i * 3 + 1] > 8) {
        pos[i * 3 + 1] = 3;
        pos[i * 3] = (Math.random() - 0.5) * 30;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    mat.opacity = 0.3 + Math.sin(t * 0.8) * 0.2;
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={STAR_COUNT} array={basePositions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#FFF8E7" size={0.06} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export function BackgroundLightParticles() {
  const ref = useRef<THREE.Points>(null!);
  const basePositions = useMemo(() => {
    const arr = new Float32Array(LIGHT_COUNT * 3);
    for (let i = 0; i < LIGHT_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 25;
      arr[i * 3 + 1] = Math.random() * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return arr;
  }, []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(LIGHT_COUNT);
    for (let i = 0; i < LIGHT_COUNT; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);

  useFrame((state) => {
    const geo = ref.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const o = offsets[i];
      pos[i * 3] += Math.sin(t * 0.15 + o) * 0.003;
      pos[i * 3 + 1] += Math.cos(t * 0.1 + o * 1.3) * 0.002;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={LIGHT_COUNT} array={basePositions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.03} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

interface BreakEffect {
  id: string;
  bottleId: string;
  emotion: string;
  origin: THREE.Vector3;
  directions: Float32Array;
  startTime: number;
}

export function BreakParticles() {
  const ref = useRef<THREE.Points>(null!);
  const effectsRef = useRef<BreakEffect[]>([]);
  const processedRef = useRef(new Set<string>());
  const maxPositions = useMemo(() => new Float32Array(MAX_TOTAL_BREAK_PARTICLES * 3), []);
  const maxColors = useMemo(() => new Float32Array(MAX_TOTAL_BREAK_PARTICLES * 3), []);

  useFrame((state) => {
    const { brokenBottleIds, bottles, removeBrokenBottle } = useOceanStore.getState();
    for (const bid of brokenBottleIds) {
      if (processedRef.current.has(bid)) continue;
      const bottle = bottles.find(b => b.id === bid);
      if (!bottle) continue;
      processedRef.current.add(bid);
      const totalCurrent = effectsRef.current.reduce((s, e) => BREAK_PARTICLE_COUNT, 0);
      if (totalCurrent + BREAK_PARTICLE_COUNT > MAX_TOTAL_BREAK_PARTICLES) continue;
      const origin = new THREE.Vector3(...bottle.position);
      const dirs = new Float32Array(BREAK_PARTICLE_COUNT * 3);
      for (let i = 0; i < BREAK_PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        dirs[i * 3] = Math.sin(phi) * Math.cos(theta);
        dirs[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
        dirs[i * 3 + 2] = Math.cos(phi);
      }
      effectsRef.current.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        bottleId: bid,
        emotion: bottle.emotion,
        origin,
        directions: dirs,
        startTime: state.clock.elapsedTime,
      });
    }

    const t = state.clock.elapsedTime;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const col = ref.current.geometry.attributes.color.array as Float32Array;
    pos.fill(0);
    col.fill(0);
    let idx = 0;

    effectsRef.current = effectsRef.current.filter(eff => {
      const elapsed = t - eff.startTime;
      if (elapsed > BREAK_DURATION) {
        processedRef.current.delete(eff.bottleId);
        removeBrokenBottle(eff.bottleId);
        return false;
      }
      const progress = elapsed / BREAK_DURATION;
      const radius = progress * 3;
      const config = EMOTION_CONFIG[eff.emotion as keyof typeof EMOTION_CONFIG];
      const color = new THREE.Color(config ? config.particleColor : '#ffffff');
      const fadeAlpha = 1 - progress;
      for (let i = 0; i < BREAK_PARTICLE_COUNT && idx < MAX_TOTAL_BREAK_PARTICLES; i++) {
        pos[idx * 3] = eff.origin.x + eff.directions[i * 3] * radius;
        pos[idx * 3 + 1] = eff.origin.y + eff.directions[i * 3 + 1] * radius;
        pos[idx * 3 + 2] = eff.origin.z + eff.directions[i * 3 + 2] * radius;
        col[idx * 3] = color.r * fadeAlpha;
        col[idx * 3 + 1] = color.g * fadeAlpha;
        col[idx * 3 + 2] = color.b * fadeAlpha;
        idx++;
      }
      return true;
    });

    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.geometry.attributes.color.needsUpdate = true;
    ref.current.geometry.setDrawRange(0, idx);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MAX_TOTAL_BREAK_PARTICLES} array={maxPositions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={MAX_TOTAL_BREAK_PARTICLES} array={maxColors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} transparent opacity={1} vertexColors sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
