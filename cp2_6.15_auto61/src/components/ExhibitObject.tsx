import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Exhibit } from '../store/useStore';

interface ExhibitObjectProps {
  exhibit: Exhibit;
  isSelected: boolean;
  onClick: () => void;
  isFiltered: boolean;
  opacity: number;
}

export default function ExhibitObject({ exhibit, isSelected, onClick, isFiltered, opacity }: ExhibitObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: exhibit.color,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: isFiltered ? 0.3 * opacity : opacity,
    });
  }, [exhibit.color, isFiltered, opacity]);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = exhibit.position.y + 1.8 + Math.sin(elapsed * 2 + exhibit.id) * 0.15;
    }

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = (hovered || isSelected) ? 0.3 : 0;
      glowMat.opacity += (targetOpacity - glowMat.opacity) * 0.1;

      const scale = isSelected ? 1.15 : hovered ? 1.1 : 1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  const geometry = exhibit.modelType === 'sphere'
    ? <sphereGeometry args={[0.8, 32, 32]} />
    : <torusGeometry args={[0.6, 0.25, 16, 48]} />;

  return (
    <group
      position={[exhibit.position.x, exhibit.position.y, exhibit.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <mesh ref={meshRef} position={[0, 1.8, 0]} castShadow>
        {geometry}
        <primitive object={material} attach="material" />
      </mesh>

      <mesh ref={glowRef} position={[0, 1.8, 0]}>
        {exhibit.modelType === 'sphere'
          ? <sphereGeometry args={[0.95, 32, 32]} />
          : <torusGeometry args={[0.75, 0.35, 16, 48]} />}
        <primitive object={glowMaterial} attach="material" />
      </mesh>

      {(hovered || isSelected) && (
        <pointLight
          position={[0, 1.8, 0]}
          intensity={isSelected ? 2 : 1}
          distance={3}
          color={exhibit.color}
        />
      )}
    </group>
  );
}
