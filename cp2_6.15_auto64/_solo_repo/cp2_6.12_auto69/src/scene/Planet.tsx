import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '@/astronomy/planetData';
import { generatePlanetTexture } from '@/utils/textureGenerator';

interface PlanetProps {
  data: PlanetData;
  position: THREE.Vector3;
  onClick?: (e: any) => void;
  isPaused?: boolean;
}

export default function Planet({ data, position, onClick, isPaused = false }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const texture = useMemo(() => {
    const tex = generatePlanetTexture(data.color, data.textureType);
    textureRef.current = tex;
    return tex;
  }, [data.color, data.textureType]);

  const material = useMemo(() => {
    if (data.textureType === 'sun') {
      return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      });
    }
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, [data.textureType, texture]);

  const ringGeometry = useMemo(() => {
    if (!data.hasRings) return null;
    const innerRadius = data.radius * 1.4;
    const outerRadius = data.radius * 2.2;
    return new THREE.RingGeometry(innerRadius, outerRadius, 64);
  }, [data.hasRings, data.radius]);

  const ringMaterial = useMemo(() => {
    if (!data.hasRings || !data.ringColor) return null;
    return new THREE.MeshBasicMaterial({
      color: data.ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
  }, [data.hasRings, data.ringColor]);

  useFrame((_, delta) => {
    if (meshRef.current && !isPaused) {
      const rotationSpeed = (2 * Math.PI) / (data.rotationPeriod * 10);
      meshRef.current.rotation.y += rotationSpeed * delta;
    }

    if (textureRef.current && !isPaused) {
      textureRef.current.offset.x += delta * 0.002;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[data.radius, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>

      {data.hasRings && ringGeometry && ringMaterial && (
        <mesh rotation={[-Math.PI / 2.2, 0, 0]}>
          <primitive object={ringGeometry} attach="geometry" />
          <primitive object={ringMaterial} attach="material" />
        </mesh>
      )}

      {data.textureType === 'sun' && (
        <mesh scale={1.1}>
          <sphereGeometry args={[data.radius, 32, 32]} />
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
