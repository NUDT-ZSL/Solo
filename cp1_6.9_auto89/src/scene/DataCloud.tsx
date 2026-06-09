import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ReducedPoint, CATEGORY_COLORS, CATEGORY_NAMES } from '../types';

interface DataCloudProps {
  points: ReducedPoint[];
  hiddenCategories: Set<number>;
  hoveredId: number | null;
  onHover: (id: number | null, point?: ReducedPoint, position?: THREE.Vector3) => void;
  onClickPoint: (point: ReducedPoint, position: THREE.Vector3) => void;
  controlsRef: React.RefObject<any>;
}

const ANIMATION_DURATION = 2;
const PARTICLE_COUNT = 20;
const PARTICLE_LIFETIME = 2;

interface Particle {
  active: boolean;
  life: number;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  color: THREE.Color;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function DataCloud({
  points,
  hiddenCategories,
  hoveredId,
  onHover,
  onClickPoint,
  controlsRef,
}: DataCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const haloRefs = useRef<(THREE.Points | null)[]>([]);
  const startTimeRef = useRef<number>(performance.now());
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleGeomsRef = useRef<THREE.BufferGeometry[]>([]);
  const [verticalOffset, setVerticalOffset] = useState(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [points]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'w') setVerticalOffset((v) => v + 0.3);
      if (e.key.toLowerCase() === 's') setVerticalOffset((v) => v - 0.3);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame((state, delta) => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const animProgress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = easeInOut(animProgress);

    points.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      const halo = haloRefs.current[i];
      if (!mesh) return;

      const hidden = hiddenCategories.has(p.category);
      const targetScale = hoveredId === p.id ? 1.5 : 1;
      const isHovered = hoveredId === p.id;
      const otherHovered = hoveredId !== null && hoveredId !== p.id;

      const pos = mesh.position as THREE.Vector3;
      pos.x = p.x * eased;
      pos.y = p.y * eased + verticalOffset;
      pos.z = p.z * eased;

      mesh.scale.setScalar(targetScale * (0.01 + eased * 0.99));

      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseOpacity = hidden ? 0 : otherHovered ? 0.2 : 0.7;
      const targetOpacity = isHovered ? 1 : baseOpacity;
      const opacityDiff = targetOpacity - mat.opacity;
      mat.opacity += opacityDiff * Math.min(delta * 8, 1);
      mat.emissiveIntensity = isHovered ? 2.5 : 1.2;

      if (halo) {
        (halo.position as THREE.Vector3).copy(pos);
        const haloMat = halo.material as THREE.PointsMaterial;
        haloMat.size = isHovered ? 1.8 : 0.9;
        haloMat.opacity = hidden ? 0 : (isHovered ? 0.9 : 0.35) * animProgress;
      }
    });

    setParticles((prev) => {
      let changed = false;
      const updated = prev.map((p) => {
        if (!p.active) return p;
        changed = true;
        const newLife = p.life - delta;
        if (newLife <= 0) return { ...p, active: false, life: 0 };
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.multiplyScalar(0.96);
        return { ...p, life: newLife };
      });
      return changed ? updated : prev;
    });

    particles.forEach((p, idx) => {
      if (!p.active) return;
      const geom = particleGeomsRef.current[idx];
      if (!geom) return;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      if (posAttr) {
        posAttr.setXYZ(0, p.position.x, p.position.y, p.position.z);
        posAttr.needsUpdate = true;
      }
      const mesh = state.scene.getObjectByName(`particle_${idx}`) as THREE.Points;
      if (mesh) {
        const mat = mesh.material as THREE.PointsMaterial;
        mat.opacity = (p.life / PARTICLE_LIFETIME) * 0.9;
      }
    });

    if (controlsRef.current && controlsRef.current.object) {
      const cam = controlsRef.current.object as THREE.PerspectiveCamera;
      const targetOffset = new THREE.Vector3(0, verticalOffset, 0);
      controlsRef.current.target.lerp(targetOffset, 0.1);
    }
  });

  const particleColors = useMemo(() => {
    const colors: THREE.Color[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors.push(new THREE.Color(CATEGORY_COLORS[i % 5]));
    }
    return colors;
  }, []);

  useEffect(() => {
    particleGeomsRef.current = particles.map(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      return g;
    });
  }, [particles.length]);

  const spawnParticles = (origin: THREE.Vector3, color: THREE.Color) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      newParticles.push({
        active: true,
        life: PARTICLE_LIFETIME,
        velocity: dir.multiplyScalar(0.5),
        position: origin.clone(),
        color: color.clone(),
      });
    }
    setParticles((prev) => {
      const slots: Particle[] = [...prev];
      for (const np of newParticles) {
        const emptyIdx = slots.findIndex((s) => !s || !s.active);
        if (emptyIdx >= 0) slots[emptyIdx] = np;
        else slots.push(np);
      }
      return slots;
    });
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>, i: number) => {
    e.stopPropagation();
    const p = points[i];
    const pos = meshRefs.current[i]?.position.clone() || new THREE.Vector3();
    onHover(p.id, p, pos);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    onHover(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>, i: number) => {
    e.stopPropagation();
    const p = points[i];
    const pos = meshRefs.current[i]?.position.clone() || new THREE.Vector3();
    spawnParticles(pos, new THREE.Color(CATEGORY_COLORS[p.category]));
    onClickPoint(p, pos);
  };

  return (
    <group ref={groupRef}>
      {points.map((p, i) => {
        const color = CATEGORY_COLORS[p.category];
        return (
          <group key={p.id}>
            <mesh
              ref={(el) => (meshRefs.current[i] = el)}
              onPointerOver={(e) => handlePointerOver(e, i)}
              onPointerOut={handlePointerOut}
              onClick={(e) => handleClick(e, i)}
              position={[0, 0, 0]}
            >
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.2}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
            <points
              ref={(el) => (haloRefs.current[i] = el)}
              position={[0, 0, 0]}
            >
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={1}
                  array={new Float32Array([0, 0, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                color={color}
                size={0.9}
                transparent
                opacity={0}
                depthWrite={false}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
              />
            </points>
          </group>
        );
      })}
      {particles.map((p, idx) =>
        p.active ? (
          <points key={`particle_${idx}`} name={`particle_${idx}`} geometry={particleGeomsRef.current[idx]}>
            <pointsMaterial
              color={p.color}
              size={0.1}
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              sizeAttenuation
            />
          </points>
        ) : null
      )}
    </group>
  );
}
