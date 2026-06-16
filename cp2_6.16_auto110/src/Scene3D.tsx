import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  SoundSource,
  constants,
  frequencyToColor,
  frequencyToSpeed,
  calculateInterference
} from './utils/soundPhysics';

interface Scene3DProps {
  sources: SoundSource[];
  selectedSourceId: string | null;
  onGridClick: (x: number, z: number) => void;
  onSourceClick: (id: string) => void;
  onSourceDoubleClick: (id: string) => void;
  onSourceHover: (id: string | null) => void;
  deletingSourceIds: Set<string>;
}

interface RippleInstance {
  id: string;
  sourceId: string;
  birthTime: number;
  mesh: THREE.Mesh;
}

export default function Scene3D({
  sources,
  selectedSourceId,
  onGridClick,
  onSourceClick,
  onSourceDoubleClick,
  onSourceHover,
  deletingSourceIds
}: Scene3DProps) {
  const rippleGroupRef = useRef<THREE.Group>(null);
  const interferenceGroupRef = useRef<THREE.Group>(null);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
  const { camera, scene } = useThree();
  const ripplesRef = useRef<Map<string, RippleInstance[]>>(new Map());
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const interferenceMeshPoolRef = useRef<THREE.Mesh[]>([]);
  const clickIndicatorRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const cleanupSourceRipples = useCallback((sourceId: string) => {
    const sourceRipples = ripplesRef.current.get(sourceId);
    if (sourceRipples && rippleGroupRef.current) {
      sourceRipples.forEach((ripple) => {
        rippleGroupRef.current?.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
      });
    }
    ripplesRef.current.delete(sourceId);
    lastSpawnTimeRef.current.delete(sourceId);
  }, []);

  useEffect(() => {
    return () => {
      ripplesRef.current.forEach((_, sourceId) => cleanupSourceRipples(sourceId));
    };
  }, [cleanupSourceRipples]);

  useFrame(({ clock }) => {
    const currentTime = clock.getElapsedTime();

    if (!rippleGroupRef.current) return;

    sources.forEach((source) => {
      if (deletingSourceIds.has(source.id)) {
        cleanupSourceRipples(source.id);
        return;
      }

      const speed = frequencyToSpeed(source.frequency);
      const lifetime = 8 / speed;
      const interval = 0.5;

      let sourceRipples = ripplesRef.current.get(source.id);
      if (!sourceRipples) {
        sourceRipples = [];
        ripplesRef.current.set(source.id, sourceRipples);
      }

      const lastSpawn = lastSpawnTimeRef.current.get(source.id) || -999;
      if (currentTime - lastSpawn >= interval && sourceRipples.length < constants.MAX_RIPPLES_PER_SOURCE) {
        const color = frequencyToColor(source.frequency);
        const geometry = new THREE.RingGeometry(0.95, 1.05, 64);
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(source.x, 0.02, source.z);
        rippleGroupRef.current!.add(mesh);

        sourceRipples.push({
          id: `${source.id}-${currentTime.toFixed(3)}`,
          sourceId: source.id,
          birthTime: currentTime,
          mesh
        });
        lastSpawnTimeRef.current.set(source.id, currentTime);
      }

      for (let i = sourceRipples.length - 1; i >= 0; i--) {
        const ripple = sourceRipples[i];
        const elapsed = currentTime - ripple.birthTime;

        if (elapsed > lifetime) {
          rippleGroupRef.current!.remove(ripple.mesh);
          ripple.mesh.geometry.dispose();
          (ripple.mesh.material as THREE.Material).dispose();
          sourceRipples.splice(i, 1);
        } else {
          const radius = speed * elapsed;
          ripple.mesh.scale.set(radius, radius, 1);
          const opacity = Math.max(1 - elapsed / lifetime, 0) * 0.8;
          (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
        }
      }
    });

    ripplesRef.current.forEach((_, sourceId) => {
      if (!sources.find((s) => s.id === sourceId)) {
        cleanupSourceRipples(sourceId);
      }
    });

    updateInterference(currentTime);
    updateClickIndicator(currentTime);
  });

  const updateClickIndicator = (currentTime: number) => {
    if (!clickIndicatorRef.current) return;

    const elapsed = currentTime - (clickIndicatorRef.current.userData.startTime || 0);
    if (elapsed > 0.2) {
      if (rippleGroupRef.current) {
        rippleGroupRef.current.remove(clickIndicatorRef.current);
      }
      clickIndicatorRef.current.geometry.dispose();
      (clickIndicatorRef.current.material as THREE.Material).dispose();
      clickIndicatorRef.current = null;
      return;
    }

    const scale = 0.1 + (elapsed / 0.2) * 2;
    const opacity = 1 - elapsed / 0.2;
    clickIndicatorRef.current.scale.set(scale, scale, 1);
    (clickIndicatorRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  };

  const updateInterference = (currentTime: number) => {
    if (!interferenceGroupRef.current) return;

    if (sources.length < 2) {
      interferenceGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = false;
        }
      });
      return;
    }

    const resolution = 15;
    const half = constants.GRID_SIZE / 2;
    const step = constants.GRID_SIZE / resolution;
    const totalPoints = (resolution + 1) * (resolution + 1);

    while (interferenceMeshPoolRef.current.length < totalPoints) {
      const geometry = new THREE.CircleGeometry(step * 0.5, 8);
      const material = new THREE.MeshBasicMaterial({
        color: '#ffff00',
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      interferenceGroupRef.current.add(mesh);
      interferenceMeshPoolRef.current.push(mesh);
    }

    let meshIndex = 0;
    const flickerSpeed = 8;
    const flickerAmount = 0.3 + Math.sin(currentTime * flickerSpeed) * 0.2;

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = -half + i * step;
        const z = -half + j * step;

        let maxConstructive = 0;
        let maxDestructive = 0;

        for (let a = 0; a < sources.length; a++) {
          for (let b = a + 1; b < sources.length; b++) {
            const result = calculateInterference(
              sources[a],
              sources[b],
              x,
              z,
              currentTime
            );

            if (result.type === 'constructive') {
              maxConstructive = Math.max(maxConstructive, result.amplitude);
            } else if (result.type === 'destructive') {
              maxDestructive = Math.max(maxDestructive, result.amplitude);
            }
          }
        }

        const mesh = interferenceMeshPoolRef.current[meshIndex];
        if (mesh) {
          mesh.visible = true;
          mesh.position.set(x, 0.03, z);

          if (maxConstructive > 0.3) {
            const intensity = Math.min((maxConstructive - 0.3) * 2, 1);
            const flickerIntensity = intensity * (0.7 + flickerAmount * 0.3);
            (mesh.material as THREE.MeshBasicMaterial).color.set('#ffff00');
            (mesh.material as THREE.MeshBasicMaterial).opacity = flickerIntensity * 0.6;
          } else if (maxDestructive > 0.1) {
            const intensity = Math.min((maxDestructive - 0.1) * 2, 1);
            (mesh.material as THREE.MeshBasicMaterial).color.set('#636e72');
            (mesh.material as THREE.MeshBasicMaterial).opacity = intensity * 0.3;
          } else {
            (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }

        meshIndex++;
      }
    }

    for (let i = meshIndex; i < interferenceMeshPoolRef.current.length; i++) {
      const mesh = interferenceMeshPoolRef.current[i];
      if (mesh) {
        mesh.visible = false;
      }
    }
  };

  const handleGridClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    if (sources.length >= constants.MAX_SOURCES) {
      return;
    }

    const point = event.point;
    const halfGrid = constants.GRID_SIZE / 2;
    const x = Math.max(-halfGrid, Math.min(halfGrid, point.x));
    const z = Math.max(-halfGrid, Math.min(halfGrid, point.z));

    if (rippleGroupRef.current) {
      const geometry = new THREE.RingGeometry(0.8, 1.2, 32);
      const material = new THREE.MeshBasicMaterial({
        color: '#74b9ff',
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
      });
      const indicator = new THREE.Mesh(geometry, material);
      indicator.rotation.x = -Math.PI / 2;
      indicator.position.set(x, 0.05, z);
      indicator.userData = { startTime: performance.now() / 1000 };
      rippleGroupRef.current.add(indicator);
      clickIndicatorRef.current = indicator;
    }

    onGridClick(x, z);
  };

  const handleSourceClick = (event: ThreeEvent<MouseEvent>, id: string) => {
    event.stopPropagation();
    onSourceClick(id);
  };

  const handleSourceDoubleClick = (event: ThreeEvent<MouseEvent>, id: string) => {
    event.stopPropagation();
    onSourceDoubleClick(id);
  };

  const handleSourcePointerOver = (event: ThreeEvent<PointerEvent>, id: string) => {
    event.stopPropagation();
    setHoveredSourceId(id);
    onSourceHover(id);
    document.body.style.cursor = 'pointer';
  };

  const handleSourcePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoveredSourceId(null);
    onSourceHover(null);
    document.body.style.cursor = 'default';
  };

  const gridLines = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const size = constants.GRID_SIZE;
    const half = size / 2;
    const divisions = constants.GRID_DIVISIONS;
    const step = size / divisions;

    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      lines.push({ start: [pos, 0, -half], end: [pos, 0, half] });
      lines.push({ start: [-half, 0, pos], end: [half, 0, pos] });
    }

    return lines;
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 15, 10]} intensity={1.0} />
      <pointLight position={[-10, 8, -10]} intensity={0.5} color="#74b9ff" />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />

      <group>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onClick={handleGridClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'crosshair';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <planeGeometry args={[constants.GRID_SIZE, constants.GRID_SIZE]} />
          <meshBasicMaterial color="#0a0e17" transparent opacity={0.95} />
        </mesh>

        {gridLines.map((line, i) => (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...line.start, ...line.end])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#2d3436" transparent opacity={0.4} />
          </line>
        ))}

        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-0.3, 0.01, 0, 0.3, 0.01, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </line>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0.01, -0.3, 0, 0.01, 0.3])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </line>
        </group>
      </group>

      <group ref={interferenceGroupRef} />
      <group ref={rippleGroupRef} />

      {sources.map((source) => {
        const isSelected = selectedSourceId === source.id;
        const isHovered = hoveredSourceId === source.id;
        const isDeleting = deletingSourceIds.has(source.id);
        const baseRadius = 0.3;
        const targetRadius = isHovered || isSelected ? 0.5 : baseRadius;
        const scale = targetRadius / baseRadius;
        const color = isHovered || isSelected ? '#00cec9' : '#74b9ff';

        return (
          <group key={source.id}>
            <mesh
              position={[source.x, 0.15, source.z]}
              onClick={(e) => handleSourceClick(e, source.id)}
              onDoubleClick={(e) => handleSourceDoubleClick(e, source.id)}
              onPointerOver={(e) => handleSourcePointerOver(e, source.id)}
              onPointerOut={handleSourcePointerOut}
              scale={isDeleting ? [0.01, 0.01, 0.01] : [scale, scale, scale]}
            >
              <sphereGeometry args={[baseRadius, 32, 32]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.9}
                emissive={color}
                emissiveIntensity={0.4}
                roughness={0.3}
                metalness={0.5}
              />
            </mesh>

            {isSelected && (
              <mesh position={[source.x, 0.05, source.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.6, 64]} />
                <meshBasicMaterial color="#00cec9" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
            )}

            {isHovered && !isSelected && (
              <mesh position={[source.x, 0.05, source.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.45, 0.5, 64]} />
                <meshBasicMaterial color="#00cec9" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
