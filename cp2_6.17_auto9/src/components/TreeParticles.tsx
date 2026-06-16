import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SeasonConfig } from '../utils/seasonConfig';
import { lerpColor, hexToRgb } from '../utils/interpolate';

interface TreeParticlesProps {
  position: [number, number, number];
  height: number;
  particleCount: number;
  prevConfig: SeasonConfig;
  targetConfig: SeasonConfig;
  transitionProgress: number;
  rotVelRef: { current: number };
  seed: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function TreeParticles({
  position,
  height,
  particleCount,
  prevConfig,
  targetConfig,
  transitionProgress,
  rotVelRef,
  seed,
}: TreeParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const rand = seededRandom(seed);

  const { basePositions, baseSizes, colorSeeds, offsetSeeds } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const cSeeds: number[] = [];
    const oSeeds: number[] = [];
    const canopyRadius = height * 0.35;
    const canopyCenterY = height * 0.7;

    for (let i = 0; i < particleCount; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = Math.pow(rand(), 0.5) * canopyRadius;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7 + canopyCenterY;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 4 + rand() * 4;
      cSeeds.push(Math.floor(rand() * targetConfig.particleColors.length));
      oSeeds.push(rand());
    }
    return {
      basePositions: positions,
      baseSizes: sizes,
      colorSeeds: cSeeds,
      offsetSeeds: oSeeds,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCount, height]);

  useEffect(() => {
    if (!pointsRef.current) return;
    const geometry = pointsRef.current.geometry;
    const positions = new Float32Array(basePositions);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(baseSizes);

    for (let i = 0; i < particleCount; i++) {
      const colorIdx = colorSeeds[i] % prevConfig.particleColors.length;
      const hex = prevConfig.particleColors[colorIdx];
      const [r, g, b] = hexToRgb(hex);
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;

    const angularVel = rotVelRef.current;
    const parallaxFactor = angularVel * 0.1;
    const t = transitionProgress;
    const radiusScale = 1 + Math.sin(t * Math.PI) * 0.12;
    const sizeScale = 0.85 + t * 0.3;

    for (let i = 0; i < particleCount; i++) {
      const ox = offsetSeeds[i] * 0.15;
      const oz = (1 - offsetSeeds[i]) * 0.15;

      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      posAttr.array[i * 3] = bx * radiusScale + Math.sin(ox * 10) * parallaxFactor;
      posAttr.array[i * 3 + 1] = by + Math.cos(oz * 10) * parallaxFactor * 0.5;
      posAttr.array[i * 3 + 2] = bz * radiusScale + Math.sin(oz * 10) * parallaxFactor;

      const idx = colorSeeds[i] % targetConfig.particleColors.length;
      const prevHex = prevConfig.particleColors[idx];
      const nextHex = targetConfig.particleColors[idx];
      const lerpedHex = lerpColor(prevHex, nextHex, t);
      const [r, g, b] = hexToRgb(lerpedHex);
      colorAttr.array[i * 3] = r / 255;
      colorAttr.array[i * 3 + 1] = g / 255;
      colorAttr.array[i * 3 + 2] = b / 255;

      sizeAttr.array[i] = baseSizes[i] * sizeScale;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  const trunkHeight = height * 0.5;
  const trunkRadius = height * 0.05;

  const trunkColor = transitionProgress > 0.5
    ? lerpColor('#6b4423', '#5d3a1a', (transitionProgress - 0.5) * 2)
    : '#6b4423';

  return (
    <group position={position}>
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[trunkRadius, trunkRadius * 1.2, trunkHeight, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry />
        <pointsMaterial
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.92}
          size={0.08}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}
