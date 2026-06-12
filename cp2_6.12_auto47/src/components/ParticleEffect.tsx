import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferGeometry,
  Points,
  PointsMaterial,
  Float32BufferAttribute,
  Color,
  AdditiveBlending,
} from 'three';

interface ParticleEffectProps {
  active: boolean;
  positions: { x: number; y: number; z: number }[];
  colors: string[];
  onDone?: () => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const PARTICLES_PER_POINT = 8;
const ANIMATION_DURATION = 1.0;

export default function ParticleEffect({ active, positions, colors, onDone }: ParticleEffectProps) {
  const pointsRef = useRef<Points>(null);
  const timeRef = useRef(0);
  const doneRef = useRef(false);
  const { invalidate } = useThree();

  const particleCount = positions.length * PARTICLES_PER_POINT;

  const { startPositions, scatteredPositions, targetPositions, particleColors } = useMemo(() => {
    const start = new Float32Array(particleCount * 3);
    const scattered = new Float32Array(particleCount * 3);
    const target = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const color = new Color(colors[i] ?? '#ffffff');
      const scatterDir = {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      };
      const scatterDist = 3 + Math.random() * 2;

      for (let j = 0; j < PARTICLES_PER_POINT; j++) {
        const idx = (i * PARTICLES_PER_POINT + j) * 3;

        const offset = {
          x: (Math.random() - 0.5) * 0.3,
          y: (Math.random() - 0.5) * 0.3,
          z: (Math.random() - 0.5) * 0.3,
        };

        start[idx] = pos.x + offset.x;
        start[idx + 1] = pos.y + offset.y;
        start[idx + 2] = pos.z + offset.z;

        const dir = {
          x: scatterDir.x + (Math.random() - 0.5) * 0.5,
          y: scatterDir.y + (Math.random() - 0.5) * 0.5,
          z: scatterDir.z + (Math.random() - 0.5) * 0.5,
        };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
        const dist = scatterDist + Math.random() * 1.5;

        scattered[idx] = pos.x + (dir.x / len) * dist;
        scattered[idx + 1] = pos.y + (dir.y / len) * dist;
        scattered[idx + 2] = pos.z + (dir.z / len) * dist;

        const jitter = {
          x: (Math.random() - 0.5) * 0.1,
          y: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.1,
        };
        target[idx] = pos.x + jitter.x;
        target[idx + 1] = pos.y + jitter.y;
        target[idx + 2] = pos.z + jitter.z;

        cols[idx] = color.r;
        cols[idx + 1] = color.g;
        cols[idx + 2] = color.b;
      }
    }

    return {
      startPositions: start,
      scatteredPositions: scattered,
      targetPositions: target,
      particleColors: cols,
    };
  }, [positions, colors, particleCount]);

  useEffect(() => {
    if (active) {
      timeRef.current = 0;
      doneRef.current = false;
    }
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current || doneRef.current) return;

    timeRef.current += delta;
    const t = Math.min(timeRef.current / ANIMATION_DURATION, 1);

    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = posAttr.array as Float32Array;

    if (t < 0.5) {
      const localT = easeInOutCubic(t / 0.5);
      for (let i = 0; i < particleCount * 3; i++) {
        arr[i] = startPositions[i] + (scatteredPositions[i] - startPositions[i]) * localT;
      }
      (pointsRef.current.material as PointsMaterial).opacity = 1 - 0.7 * (t / 0.5);
    } else {
      const localT = easeInOutCubic((t - 0.5) / 0.5);
      for (let i = 0; i < particleCount * 3; i++) {
        arr[i] = scatteredPositions[i] + (targetPositions[i] - scatteredPositions[i]) * localT;
      }
      (pointsRef.current.material as PointsMaterial).opacity = 0.3 + 0.7 * ((t - 0.5) / 0.5);
    }

    posAttr.needsUpdate = true;

    if (t >= 1) {
      doneRef.current = true;
      (pointsRef.current.material as PointsMaterial).opacity = 0;
      onDone?.();
    }

    invalidate();
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={startPositions.slice()}
          count={particleCount}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={particleColors}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={1}
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
