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
  elapsed: number;
}

const RIPPLE_LIFETIME = 1.5;
const RIPPLE_SPAWN_INTERVAL = 1.5;
const RIPPLE_SPEED = 2;
const RIPPLE_START_RADIUS = 0.8;
const RIPPLE_MAX_RADIUS = RIPPLE_START_RADIUS + RIPPLE_SPEED * RIPPLE_LIFETIME;
const RIPPLE_START_OPACITY = 0.8;
const SPHERE_RADIUS = 0.8;
const RING_INNER_RADIUS = 0.95;
const RING_OUTER_RADIUS = 1.05;

export function SoundSource({ id, position, color, onPositionChange }: SoundSourceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ripplesRef = useRef<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const rippleMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());

  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  const displayColor = useMemo(
    () => (isDragging ? new THREE.Color('#ffffff') : threeColor),
    [isDragging, threeColor]
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(position.x, position.y, position.z);
    }

    lastSpawnRef.current += delta;
    if (lastSpawnRef.current > RIPPLE_SPAWN_INTERVAL) {
      ripplesRef.current.push({
        id: rippleIdRef.current++,
        elapsed: 0,
      });
      lastSpawnRef.current = 0;
    }

    const toRemove: number[] = [];
    ripplesRef.current.forEach((ripple) => {
      ripple.elapsed += delta;
      if (ripple.elapsed >= RIPPLE_LIFETIME) {
        toRemove.push(ripple.id);
        const mesh = rippleMeshesRef.current.get(ripple.id);
        if (mesh) {
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
          rippleMeshesRef.current.delete(ripple.id);
        }
        return;
      }

      const currentRadius = RIPPLE_START_RADIUS + ripple.elapsed * RIPPLE_SPEED;
      const progress = ripple.elapsed / RIPPLE_LIFETIME;
      const opacity = RIPPLE_START_OPACITY * (1 - progress);
      const scale = currentRadius;

      const mesh = rippleMeshesRef.current.get(ripple.id);
      if (mesh) {
        mesh.scale.setScalar(scale);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = opacity;
      }
    });

    ripplesRef.current = ripplesRef.current.filter((r) => !toRemove.includes(r.id));
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
        const initialScale = RIPPLE_START_RADIUS;
        const initialOpacity = RIPPLE_START_OPACITY;

        return (
          <mesh
            key={ripple.id}
            ref={(el) => {
              if (el) rippleMeshesRef.current.set(ripple.id, el);
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[initialScale, initialScale, initialScale]}
          >
            <ringGeometry args={[RING_INNER_RADIUS, RING_OUTER_RADIUS, 64]} />
            <meshBasicMaterial
              color={threeColor}
              transparent
              opacity={initialOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
