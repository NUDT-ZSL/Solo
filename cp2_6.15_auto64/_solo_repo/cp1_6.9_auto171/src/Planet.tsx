import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetProps } from './types';
import { SUN_RADIUS, ORBIT_SCALE, EARTH_YEAR_DURATION } from './data';

export default function Planet({ data, onClick, isFocused, isHovered, setHovered }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const sunGlowRef = useRef<THREE.Mesh>(null);

  const radius = data.isSun ? SUN_RADIUS : SUN_RADIUS * data.radiusRatio;
  const orbitRadius = data.orbitRadiusRatio * ORBIT_SCALE;

  const initialRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      if (!data.isSun) {
        const orbitSpeed = (2 * Math.PI) / (EARTH_YEAR_DURATION * data.orbitPeriodRatio);
        const angle = data.initialAngle + time * orbitSpeed;
        groupRef.current.position.x = Math.cos(angle) * orbitRadius;
        groupRef.current.position.z = Math.sin(angle) * orbitRadius;
      }
    }

    if (meshRef.current) {
      const rotationSpeed = (2 * Math.PI) / (EARTH_YEAR_DURATION * (data.rotationPeriodRatio / 365));
      meshRef.current.rotation.y = initialRotation + time * rotationSpeed;
    }

    if (data.isSun && sunGlowRef.current) {
      const pulse = 1.2 + Math.sin(time * Math.PI) * 0.15;
      sunGlowRef.current.scale.setScalar(pulse);
      const glowMaterial = sunGlowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.3 + Math.sin(time * Math.PI) * 0.1;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick(data);
  };

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(data.name);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(null);
    document.body.style.cursor = 'default';
  };

  const scalePulse = isFocused || isHovered ? 1.1 : 1;

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={scalePulse}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        {data.isSun ? (
          <meshBasicMaterial color={data.color} />
        ) : (
          <meshStandardMaterial
            color={data.color}
            roughness={0.7}
            metalness={0.1}
          />
        )}
      </mesh>
      {data.isSun && (
        <mesh ref={sunGlowRef}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color="#FFE066"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}
