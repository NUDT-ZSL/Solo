import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface SoundSourceProps {
  id: number;
  position: { x: number; y: number; z: number };
  color: string;
  onPositionChange: (id: number, pos: { x: number; y: number; z: number }) => void;
}

interface Ripple {
  id: number;
  birthTime: number;
}

const RIPPLE_LIFETIME = 1500;
const RIPPLE_SPAWN_INTERVAL = 1500;
const RIPPLE_SPEED = 2;
const RIPPLE_MAX_RADIUS = RIPPLE_SPEED * (RIPPLE_LIFETIME / 1000);
const SPHERE_RADIUS = 0.8;

export function SoundSource({ id, position, color, onPositionChange }: SoundSourceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ripplesRef = useRef<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragStartRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const rippleGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(0.9, 1.0, 64);
    return geo;
  }, []);

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const displayColor = useMemo(
    () => (isDragging ? new THREE.Color('#ffffff') : threeColor),
    [isDragging, threeColor]
  );

  useFrame((state) => {
    const now = state.clock.getElapsedTime() * 1000;

    if (groupRef.current) {
      groupRef.current.position.set(position.x, position.y, position.z);
    }

    if (now - lastSpawnRef.current > RIPPLE_SPAWN_INTERVAL) {
      ripplesRef.current.push({
        id: rippleIdRef.current++,
        birthTime: now,
      });
      lastSpawnRef.current = now;
    }

    ripplesRef.current = ripplesRef.current.filter(
      (r) => now - r.birthTime < RIPPLE_LIFETIME
    );
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    if (groupRef.current) {
      const planeNormal = new THREE.Vector3(0, 1, 0);
      const planePoint = groupRef.current.position.clone();
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
      const intersection = new THREE.Vector3();
      e.ray.intersectPlane(dragPlaneRef.current, intersection);
      if (intersection) {
        dragOffsetRef.current.copy(groupRef.current.position).sub(intersection);
        dragStartRef.current.copy(groupRef.current.position);
      }
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const intersection = new THREE.Vector3();
    e.ray.intersectPlane(dragPlaneRef.current, intersection);
    if (intersection) {
      const newPos = intersection.add(dragOffsetRef.current);
      onPositionChange(id, { x: newPos.x, y: newPos.y, z: newPos.z });
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <group ref={groupRef}>
      <mesh
        ref={sphereRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <sphereGeometry args={[SPHERE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={0.6}
          emissive={displayColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {ripplesRef.current.map((ripple) => {
        const elapsed = (performance.now() / 1000 - ripple.birthTime / 1000);
        const radius = elapsed * RIPPLE_SPEED;
        if (radius <= 0 || radius > RIPPLE_MAX_RADIUS) return null;
        const progress = radius / RIPPLE_MAX_RADIUS;
        const opacity = 0.8 * (1 - progress);
        const scale = radius;

        return (
          <mesh
            key={ripple.id}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[scale, scale, scale]}
          >
            <ringGeometry args={[0.9, 1.0, 64]} />
            <meshBasicMaterial
              color={threeColor}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
