import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  SoundSource,
  constants,
  frequencyToColor,
  frequencyToSpeed
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

export default function Scene3D({
  sources,
  selectedSourceId,
  onGridClick,
  onSourceClick,
  onSourceDoubleClick,
  onSourceHover,
  deletingSourceIds
}: Scene3DProps) {
  const gridRef = useRef<THREE.Group>(null);
  const rippleGroupRef = useRef<THREE.Group>(null);
  const interferenceGroupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
  const { camera } = useThree();
  const rippleMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(({ clock }) => {
    const currentTime = clock.getElapsedTime();

    if (!rippleGroupRef.current) return;

    sources.forEach((source) => {
      if (deletingSourceIds.has(source.id)) return;

      const speed = frequencyToSpeed(source.frequency);
      const lifetime = 5 / speed;
      const interval = 0.4;

      let meshes = rippleMeshesRef.current.get(source.id);
      if (!meshes) {
        meshes = [];
        rippleMeshesRef.current.set(source.id, meshes);
      }

      const lastSpawn = lastSpawnTimeRef.current.get(source.id) || -999;
      if (currentTime - lastSpawn >= interval && meshes.length < constants.MAX_RIPPLES_PER_SOURCE) {
        const color = frequencyToColor(source.frequency);
        const innerRadius = 0.98;
        const outerRadius = 1.02;
        const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 80);
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(source.x, 0.03, source.z);
        mesh.userData = { birthTime: currentTime, sourceId: source.id };
        rippleGroupRef.current!.add(mesh);
        meshes.push(mesh);
        lastSpawnTimeRef.current.set(source.id, currentTime);
      }

      for (let i = meshes.length - 1; i >= 0; i--) {
        const mesh = meshes[i];
        const elapsed = currentTime - mesh.userData.birthTime;

        if (elapsed > lifetime) {
          rippleGroupRef.current!.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          meshes.splice(i, 1);
        } else {
          const radius = speed * elapsed;
          mesh.scale.set(radius, radius, 1);
          const opacity = Math.max(1 - elapsed / lifetime, 0) * 0.85;
          (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
        }
      }
    });

    rippleMeshesRef.current.forEach((meshes, sourceId) => {
      if (!sources.find((s) => s.id === sourceId) || deletingSourceIds.has(sourceId)) {
        meshes.forEach((mesh) => {
          rippleGroupRef.current?.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        rippleMeshesRef.current.delete(sourceId);
        lastSpawnTimeRef.current.delete(sourceId);
      }
    });

    updateInterference(currentTime);
  });

  const interferenceMeshesRef = useRef<THREE.Mesh[]>([]);

  const updateInterference = (currentTime: number) => {
    if (!interferenceGroupRef.current) return;

    if (sources.length < 2) {
      interferenceGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      interferenceGroupRef.current.clear();
      return;
    }

    const resolution = 12;
    const half = constants.GRID_SIZE / 2;
    const step = constants.GRID_SIZE / resolution;
    const targetCount = (resolution + 1) * (resolution + 1);

    while (interferenceGroupRef.current.children.length < targetCount * 2) {
      const geomC = new THREE.CircleGeometry(step * 0.55, 10);
      const matC = new THREE.MeshBasicMaterial({
        color: '#fdcb6e',
        transparent: true,
        opacity: 0
      });
      const meshC = new THREE.Mesh(geomC, matC);
      meshC.rotation.x = -Math.PI / 2;
      interferenceGroupRef.current.add(meshC);

      const geomD = new THREE.CircleGeometry(step * 0.45, 10);
      const matD = new THREE.MeshBasicMaterial({
        color: '#636e72',
        transparent: true,
        opacity: 0
      });
      const meshD = new THREE.Mesh(geomD, matD);
      meshD.rotation.x = -Math.PI / 2;
      interferenceGroupRef.current.add(meshD);
    }

    let meshIndex = 0;
    const children = interferenceGroupRef.current.children as THREE.Mesh[];

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = -half + i * step;
        const z = -half + j * step;

        let totalAmplitude = 0;
        let maxPossible = 0;

        sources.forEach((source) => {
          const dist = Math.sqrt((x - source.x) ** 2 + (z - source.z) ** 2);
          const speed = frequencyToSpeed(source.frequency);
          const wavelength = speed / Math.max(source.frequency / 200, 0.5);
          const phase = (dist / wavelength) * Math.PI * 2 + (source.phase * Math.PI) / 180;
          const attenuation = Math.max(1 / (1 + dist * 0.3), 0.1);
          totalAmplitude += Math.sin(currentTime * source.frequency * 0.08 - phase) * (source.amplitude / 100) * attenuation;
          maxPossible += (source.amplitude / 100) * attenuation;
        });

        const ratio = maxPossible > 0 ? Math.abs(totalAmplitude) / maxPossible : 0;

        const constructiveMesh = children[meshIndex * 2];
        const destructiveMesh = children[meshIndex * 2 + 1];

        if (constructiveMesh) {
          constructiveMesh.position.set(x, 0.015, z);
          const opacity = ratio > 0.65 ? (ratio - 0.65) * 2 : 0;
          (constructiveMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(opacity, 0.7);
        }

        if (destructiveMesh) {
          destructiveMesh.position.set(x, 0.01, z);
          const opacity = ratio < 0.35 ? (0.35 - ratio) * 2 : 0;
          (destructiveMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(opacity, 0.5);
        }

        meshIndex++;
      }
    }
  };

  const handleGridClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const point = event.point;
    const halfGrid = constants.GRID_SIZE / 2;
    const x = Math.max(-halfGrid, Math.min(halfGrid, point.x));
    const z = Math.max(-halfGrid, Math.min(halfGrid, point.z));
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

      <group ref={gridRef}>
        <mesh
          ref={planeRef}
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
        const targetScale = isHovered || isSelected ? 0.5 / baseRadius : 1;
        const color = isHovered || isSelected ? '#00cec9' : '#74b9ff';

        return (
          <group key={source.id}>
            <mesh
              position={[source.x, 0.15, source.z]}
              onClick={(e) => handleSourceClick(e, source.id)}
              onDoubleClick={(e) => handleSourceDoubleClick(e, source.id)}
              onPointerOver={(e) => handleSourcePointerOver(e, source.id)}
              onPointerOut={handleSourcePointerOut}
              scale={isDeleting ? [0.01, 0.01, 0.01] : [targetScale, targetScale, targetScale]}
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
