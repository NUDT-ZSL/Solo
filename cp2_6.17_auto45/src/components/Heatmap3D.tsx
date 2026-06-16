import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Heatmap3DProps {
  data: number[][];
  maxValue: number;
  position?: [number, number, number];
}

function Heatmap3D({ data, maxValue, position = [0, 0, 0] }: Heatmap3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetHeights = useRef<Float32Array | null>(null);
  const animationTime = useRef(0);

  const gridSize = 30;
  const size = 8;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, gridSize - 1, gridSize - 1);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position;
    const colorArray = new Float32Array(positions.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    return geo;
  }, []);

  useEffect(() => {
    if (!meshRef.current || data.length === 0) return;
    const positions = meshRef.current.geometry.attributes.position;
    targetHeights.current = new Float32Array(positions.count);

    const colorStart = new THREE.Color('#00d2ff');
    const colorEnd = new THREE.Color('#3a7bd5');
    const colorAttr = meshRef.current.geometry.attributes.color;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const index = y * gridSize + x;
        const value = data[y]?.[x] || 0;
        const normalizedValue = maxValue > 0 ? value / maxValue : 0;
        targetHeights.current[index] = normalizedValue * 2.8;

        const color = new THREE.Color().lerpColors(colorStart, colorEnd, normalizedValue);
        colorAttr.setX(index, color.r);
        colorAttr.setY(index, color.g);
        colorAttr.setZ(index, color.b);
      }
    }
    colorAttr.needsUpdate = true;
  }, [data, maxValue]);

  useFrame((state, delta) => {
    if (!meshRef.current || !targetHeights.current) return;

    animationTime.current += delta;

    const positions = meshRef.current.geometry.attributes.position;
    const lerpSpeed = Math.min(delta * 2, 1);
    const time = animationTime.current;

    for (let i = 0; i < positions.count; i++) {
      const x = (i % gridSize) / gridSize;
      const y = Math.floor(i / gridSize) / gridSize;
      const wave = Math.sin(time * 0.6 + x * Math.PI * 2) * Math.cos(time * 0.4 + y * Math.PI * 2) * 0.06;
      const targetY = targetHeights.current[i] + wave;
      const currentY = positions.getY(i);
      positions.setY(i, currentY + (targetY - currentY) * lerpSpeed);
    }

    positions.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          metalness={0.35}
          roughness={0.55}
          emissive={'#00d2ff'}
          emissiveIntensity={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>

      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size + 1.2, size + 1.2]} />
        <meshBasicMaterial color="#0a1628" transparent opacity={0.95} />
      </mesh>

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size / 2 + 0.3, size / 2 + 0.5, 64]} />
        <meshBasicMaterial color="#00d2ff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size / 2 - 0.6, size / 2 - 0.4, 64]} />
        <meshBasicMaterial color="#3a7bd5" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default Heatmap3D;
