import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitProps } from './types';

export default function Orbit({ orbitRadius, highlighted }: OrbitProps) {
  const lineRef = useRef<THREE.Line>(null);
  const segments = 128;

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius));
    }
    return pts;
  }, [orbitRadius]);

  useFrame(() => {
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      const targetOpacity = highlighted ? 1.0 : 0.4;
      material.opacity += (targetOpacity - material.opacity) * 0.1;
    }
  });

  return (
    <line ref={lineRef} rotation={[-Math.PI / 2, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={highlighted ? '#ffffff' : 'rgba(64,224,208,0.4)'}
        transparent
        opacity={highlighted ? 1.0 : 0.4}
        linewidth={highlighted ? 3 : 1}
      />
    </line>
  );
}
