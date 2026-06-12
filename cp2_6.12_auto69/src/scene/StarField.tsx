import { useMemo } from 'react';
import * as THREE from 'three';

interface StarFieldProps {
  count?: number;
  radius?: number;
}

export default function StarField({ count = 5000, radius = 200 }: StarFieldProps) {
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const brightness = 0.5 + Math.random() * 0.5;
      const colorVariation = Math.random();
      
      if (colorVariation < 0.7) {
        col[i * 3] = brightness;
        col[i * 3 + 1] = brightness;
        col[i * 3 + 2] = brightness;
      } else if (colorVariation < 0.85) {
        col[i * 3] = brightness;
        col[i * 3 + 1] = brightness * 0.9;
        col[i * 3 + 2] = brightness * 0.7;
      } else {
        col[i * 3] = brightness * 0.7;
        col[i * 3 + 1] = brightness * 0.8;
        col[i * 3 + 2] = brightness;
      }
    }

    return [pos, col];
  }, [count, radius]);

  return (
    <points>
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
        size={0.5}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}
