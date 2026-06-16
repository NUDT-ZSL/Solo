import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Droplet } from './Droplet';
import { useDropletPhysics, PhysicsParams } from '@/hooks/useDropletPhysics';

interface RippleEffect {
  id: number;
  position: THREE.Vector3;
  startTime: number;
}

interface DropletSceneContentProps {
  selectedColor: string;
  physicsParams: PhysicsParams;
  onStatsUpdate: (mergeCount: number, maxRadius: number) => void;
}

const PETRI_RADIUS = 300;
const PETRI_HEIGHT = 50;
const MIN_CAMERA_DISTANCE = 200;
const MAX_CAMERA_DISTANCE = 600;

const CameraController: React.FC = React.memo(() => {
  const { camera } = useThree();
  const targetAzimuth = useRef(Math.PI / 4);
  const targetPolar = useRef(Math.PI / 3);
  const targetDistance = useRef(450);
  const currentAzimuth = useRef(Math.PI / 4);
  const currentPolar = useRef(Math.PI / 3);
  const currentDistance = useRef(450);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (e.button === 2 || e.shiftKey) {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      targetAzimuth.current -= dx * 0.005;
      targetPolar.current = Math.max(
        Math.PI / 2 - (45 * Math.PI) / 180,
        Math.min(
          Math.PI / 2 + (30 * Math.PI) / 180,
          targetPolar.current + dy * 0.005
        )
      );
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDistance.current = Math.max(
        MIN_CAMERA_DISTANCE,
        Math.min(MAX_CAMERA_DISTANCE, targetDistance.current + e.deltaY * 0.5)
      );
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  useFrame((_, delta) => {
    const lerpFactor = 1 - Math.pow(0.001, delta * 2);
    currentAzimuth.current += (targetAzimuth.current - currentAzimuth.current) * lerpFactor;
    currentPolar.current += (targetPolar.current - currentPolar.current) * lerpFactor;
    currentDistance.current += (targetDistance.current - currentDistance.current) * lerpFactor;

    const x = currentDistance.current * Math.sin(currentPolar.current) * Math.cos(currentAzimuth.current);
    const z = currentDistance.current * Math.sin(currentPolar.current) * Math.sin(currentAzimuth.current);
    const y = currentDistance.current * Math.cos(currentPolar.current);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
});

const PetriDish: React.FC = React.memo(() => {
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const ringCount = 5;
    const segmentCount = 32;

    for (let i = 1; i <= ringCount; i++) {
      const radius = (PETRI_RADIUS * i) / (ringCount + 1);
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= segmentCount; j++) {
        const angle = (j / segmentCount) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            -PETRI_HEIGHT / 2 + 0.1,
            Math.sin(angle) * radius
          )
        );
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lines.push(
        <line key={`ring-${i}`}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial color="#1f2937" transparent opacity={0.4} />
        </line>
      );
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const points = [
        new THREE.Vector3(0, -PETRI_HEIGHT / 2 + 0.1, 0),
        new THREE.Vector3(
          Math.cos(angle) * PETRI_RADIUS * 0.95,
          -PETRI_HEIGHT / 2 + 0.1,
          Math.sin(angle) * PETRI_RADIUS * 0.95
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lines.push(
        <line key={`radial-${i}`}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial color="#1f2937" transparent opacity={0.3} />
        </line>
      );
    }

    return lines;
  }, []);

  return (
    <group>
      <mesh position={[0, -PETRI_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[PETRI_RADIUS, PETRI_RADIUS, PETRI_HEIGHT, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          roughness={0.1}
          transmission={0.8}
          thickness={0.5}
        />
      </mesh>

      <mesh position={[0, -PETRI_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[PETRI_RADIUS + 1, PETRI_RADIUS + 1, PETRI_HEIGHT + 2, 64, 1, true]} />
        <meshBasicMaterial color="#48dbfb" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -PETRI_HEIGHT / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PETRI_RADIUS - 1, 64]} />
        <meshBasicMaterial color="#0d1117" transparent opacity={0.9} />
      </mesh>

      {gridLines}
    </group>
  );
});

const DropletMesh: React.FC<{ droplet: Droplet }> = React.memo(({ droplet }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const data = droplet.data;
    if (meshRef.current) {
      const shakeAmp = (data.radius * 0.01) * (0.5 + (1 - 50 / 40));
      const freq = 0.5 + (50 - 10) / 40 * 1.5;
      const t = data.shakeOffset * freq;
      meshRef.current.position.set(
        data.position.x + Math.sin(t * 2.3) * shakeAmp,
        data.position.y + Math.sin(t * 1.7) * shakeAmp,
        data.position.z + Math.sin(t * 2.1) * shakeAmp
      );
      meshRef.current.scale.setScalar(data.radius / 10);
      (meshRef.current.material as THREE.MeshPhysicalMaterial).color.copy(data.color);
    }
    if (highlightRef.current) {
      const highlightT = (clock.getElapsedTime() * 0.5) % 1;
      highlightRef.current.position.set(
        data.position.x + Math.sin(highlightT * Math.PI * 2) * data.radius * 0.5,
        data.position.y + data.radius * 0.6,
        data.position.z + Math.cos(highlightT * Math.PI * 2) * data.radius * 0.5
      );
      highlightRef.current.scale.setScalar(data.radius * 0.15 / 0.5);
    }
  });

  const brightColor = useMemo(() => {
    const c = droplet.data.color.clone();
    c.offsetHSL(0, 0, 0.15);
    return c;
  }, [droplet.data.color]);

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[10, 32, 32]} />
        <meshPhysicalMaterial
          color={droplet.data.color}
          transparent
          opacity={0.75}
          roughness={0.1}
          metalness={0.1}
          transmission={0.3}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      <mesh ref={highlightRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={brightColor} transparent opacity={0.9} />
      </mesh>
    </group>
  );
});

const ParticleTrails: React.FC<{ droplets: Droplet[] }> = React.memo(({ droplets }) => {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<Map<string, THREE.Line>>(new Map());

  useFrame(() => {
    if (!groupRef.current) return;

    const activeIds = new Set<string>();

    for (const droplet of droplets) {
      for (let i = 0; i < droplet.data.particles.length; i++) {
        const particle = droplet.data.particles[i];
        const lineId = `${droplet.data.id}-${i}`;
        activeIds.add(lineId);

        let line = linesRef.current.get(lineId);
        if (!line) {
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(50 * 3);
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const brightColor = droplet.data.color.clone();
          brightColor.offsetHSL(0, 0, 0.2);

          const material = new THREE.LineBasicMaterial({
            color: brightColor,
            transparent: true,
            opacity: 0.3,
          });
          line = new THREE.Line(geometry, material);
          linesRef.current.set(lineId, line);
          groupRef.current.add(line);
        }

        const positions = (line.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        const trail = particle.trail;
        const count = Math.min(trail.length, 50);
        const offset = 50 - count;

        for (let j = 0; j < count; j++) {
          const idx = (j + offset) * 3;
          positions[idx] = trail[j].x;
          positions[idx + 1] = trail[j].y;
          positions[idx + 2] = trail[j].z;
        }
        line.geometry.setDrawRange(offset, count);
        line.geometry.attributes.position.needsUpdate = true;

        const mat = line.material as THREE.LineBasicMaterial;
        const brightColor = droplet.data.color.clone();
        brightColor.offsetHSL(0, 0, 0.2);
        mat.color.copy(brightColor);
      }
    }

    for (const [id, line] of linesRef.current) {
      if (!activeIds.has(id)) {
        groupRef.current.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        linesRef.current.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
});

const ParticleDots: React.FC<{ droplets: Droplet[] }> = React.memo(({ droplets }) => {
  const pointsRef = useRef<THREE.Points>(null);

  useFrame(() => {
    if (!pointsRef.current) return;

    const allPositions: number[] = [];
    const allColors: number[] = [];

    for (const droplet of droplets) {
      const brightColor = droplet.data.color.clone();
      brightColor.offsetHSL(0, 0, 0.25);

      for (const particle of droplet.data.particles) {
        allPositions.push(particle.position.x, particle.position.y, particle.position.z);
        allColors.push(brightColor.r, brightColor.g, brightColor.b);
      }
    }

    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

    const requiredCount = allPositions.length / 3;
    if (posAttr.count !== requiredCount) {
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(allColors), 3));
    } else {
      posAttr.array.set(allPositions);
      colAttr.array.set(allColors);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={2}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
      />
    </points>
  );
});

const RippleEffects: React.FC<{ ripples: RippleEffect[] }> = React.memo(({ ripples }) => {
  return (
    <>
      {ripples.map((ripple) => (
        <RippleMesh key={ripple.id} ripple={ripple} />
      ))}
    </>
  );
});

const RippleMesh: React.FC<{ ripple: RippleEffect }> = ({ ripple }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const elapsed = clock.getElapsedTime() - ripple.startTime;
    const progress = Math.min(1, elapsed / 0.3);
    const scale = 5 + progress * 30;
    const opacity = 1 - progress;

    meshRef.current.position.copy(ripple.position);
    meshRef.current.scale.setScalar(scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
};

const DropletSceneContent: React.FC<DropletSceneContentProps> = ({
  selectedColor,
  physicsParams,
  onStatsUpdate,
}) => {
  const { droplets, addDroplet, updateDroplets } = useDropletPhysics(physicsParams);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const rippleIdRef = useRef(0);
  const pressStartRef = useRef<{ time: number; position: THREE.Vector3 } | null>(null);
  const totalMergeCountRef = useRef(0);
  const { raycaster, camera, gl } = useThree();

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), PETRI_HEIGHT / 2), []);

  const getIntersectionPoint = useCallback(
    (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (!intersection) return null;

      const distFromCenter = Math.sqrt(intersection.x ** 2 + intersection.z ** 2);
      if (distFromCenter > PETRI_RADIUS - 10) return null;

      return intersection;
    },
    [raycaster, camera, plane, gl]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.shiftKey) return;
      const point = getIntersectionPoint(e.clientX, e.clientY);
      if (!point) return;

      pressStartRef.current = {
        time: performance.now(),
        position: point.clone(),
      };

      const now = performance.now() / 1000;
      setRipples((prev) => [
        ...prev,
        {
          id: ++rippleIdRef.current,
          position: point.clone(),
          startTime: now,
        },
      ]);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !pressStartRef.current) return;

      const point = getIntersectionPoint(e.clientX, e.clientY);
      const pressInfo = pressStartRef.current;
      pressStartRef.current = null;

      if (!point) return;

      const holdDuration = Math.min(1, (performance.now() - pressInfo.time) / 1000);
      const radius = 8 + holdDuration * 22;

      addDroplet(point, radius, new THREE.Color(selectedColor));
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [addDroplet, selectedColor, getIntersectionPoint, gl]);

  useFrame((_, delta) => {
    const cappedDelta = Math.min(delta, 0.05);
    const result = updateDroplets(cappedDelta);
    if (result.mergeCount > 0) {
      totalMergeCountRef.current += result.mergeCount;
    }
    onStatsUpdate(totalMergeCountRef.current, result.maxRadius);

    const now = performance.now() / 1000;
    setRipples((prev) => prev.filter((r) => now - r.startTime < 0.35));
  });

  return (
    <>
      <CameraController />

      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 200, 100]} intensity={0.8} />
      <directionalLight position={[-100, 150, -100]} intensity={0.4} color="#8888ff" />
      <pointLight position={[0, 100, 0]} intensity={0.5} color="#ffffff" />

      <PetriDish />

      {droplets.map((droplet) => (
        <DropletMesh key={droplet.data.id} droplet={droplet} />
      ))}

      <ParticleDots droplets={droplets} />
      <ParticleTrails droplets={droplets} />
      <RippleEffects ripples={ripples} />
    </>
  );
};

interface DropletSceneProps {
  selectedColor: string;
  physicsParams: PhysicsParams;
  onStatsUpdate: (mergeCount: number, maxRadius: number) => void;
}

export const DropletScene: React.FC<DropletSceneProps> = ({
  selectedColor,
  physicsParams,
  onStatsUpdate,
}) => {
  return (
    <Canvas
      camera={{ position: [300, 300, 300], fov: 50, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: '#0d1117' }}
    >
      <DropletSceneContent
        selectedColor={selectedColor}
        physicsParams={physicsParams}
        onStatsUpdate={onStatsUpdate}
      />
    </Canvas>
  );
};
