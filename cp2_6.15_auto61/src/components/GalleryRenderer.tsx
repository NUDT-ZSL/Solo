import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GalleryRendererProps {
  opacity: number;
}

export default function GalleryRenderer({ opacity }: GalleryRendererProps) {
  const floorRef = useRef<THREE.Mesh>(null);

  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      roughness: 0.8,
      metalness: 0.2,
    });
  }, []);

  const wallMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a2a4e',
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.7 * opacity,
      side: THREE.DoubleSide,
    });
  }, [opacity]);

  const pedestalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#c0c0c0',
      roughness: 0.6,
      metalness: 0.3,
    });
  }, []);

  const exhibitPositions = useMemo(() => {
    const positions: { x: number; z: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      positions.push({
        x: -8 + col * 4,
        z: -4 + row * 8,
      });
    }
    return positions;
  }, []);

  return (
    <group>
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[30, 20, 1, 1]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      <mesh position={[0, 5, -10]} castShadow receiveShadow>
        <boxGeometry args={[30, 10, 0.3]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh position={[0, 5, 10]} castShadow receiveShadow>
        <boxGeometry args={[30, 10, 0.3]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh position={[-15, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 10, 20]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh position={[15, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 10, 20]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      <mesh position={[0, 10, 0]} castShadow receiveShadow>
        <boxGeometry args={[30, 0.3, 20]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {exhibitPositions.map((pos, index) => (
        <group key={index} position={[pos.x, 0, pos.z]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.8, 1, 0.6, 32]} />
            <primitive object={pedestalMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.1, 32]} />
            <meshBasicMaterial color="#667eea" transparent opacity={0.3 * opacity} />
          </mesh>
          <pointLight position={[0, 1.5, 0]} intensity={0.3} distance={3} color="#ffffff" />
        </group>
      ))}
    </group>
  );
}
