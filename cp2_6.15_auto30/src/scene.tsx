import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useVoxelStore, Voxel } from './store';

const GRID_SIZE = 10;
const GRID_DIVISIONS = 10;

interface VoxelMeshProps {
  voxel: Voxel;
  isDay: boolean;
  isClearing: boolean;
  onRemove: (id: string) => void;
}

function VoxelMesh({ voxel, isDay, isClearing, onRemove }: VoxelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const startTime = useRef(voxel.createdAt);

  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  useFrame(() => {
    const elapsed = Date.now() - startTime.current;

    if (isClearing) {
      const fadeProgress = Math.min(elapsed / 300, 1);
      setOpacity(1 - fadeProgress);
      setScale(1 - fadeProgress * 0.5);
      return;
    }

    if (scale < 1) {
      const growProgress = Math.min(elapsed / 150, 1);
      const eased = 1 - Math.pow(1 - growProgress, 3);
      setScale(eased);
    }
  });

  const dayColor = voxel.color;
  const nightColor = '#333355';

  const materialProps = isDay
    ? {
        color: dayColor,
        emissive: '#000000',
        emissiveIntensity: 0,
      }
    : {
        color: nightColor,
        emissive: '#4488ff',
        emissiveIntensity: 0.15,
      };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onRemove(voxel.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={[voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5]}
      scale={scale}
      onClick={handleClick}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshStandardMaterial
        {...materialProps}
        transparent
        opacity={opacity}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame(() => {
    if (gridRef.current) {
      const material = gridRef.current.material as THREE.Material;
      material.transparent = true;
      material.opacity = 0.3;
    }
  });

  return (
    <group>
      <gridHelper
        ref={gridRef}
        args={[GRID_SIZE, GRID_DIVISIONS, '#555555', '#555555']}
        position={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[GRID_SIZE / 2, -0.01, GRID_SIZE / 2]}
        receiveShadow
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#0d0d1a" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

interface LightingProps {
  isDay: boolean;
}

function Lighting({ isDay }: LightingProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame(() => {
    if (dirLightRef.current) {
      const targetIntensity = isDay ? 1.2 : 0;
      dirLightRef.current.intensity +=
        (targetIntensity - dirLightRef.current.intensity) * 0.05;
    }
    if (pointLightRef.current) {
      const targetIntensity = isDay ? 0 : 0.3;
      pointLightRef.current.intensity +=
        (targetIntensity - pointLightRef.current.intensity) * 0.05;
    }
    if (ambientRef.current) {
      const targetIntensity = isDay ? 0.4 : 0.15;
      ambientRef.current.intensity +=
        (targetIntensity - ambientRef.current.intensity) * 0.05;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.4} color="#ffffff" />
      <directionalLight
        ref={dirLightRef}
        position={[-5, 10, -5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
      />
      <pointLight
        ref={pointLightRef}
        position={[GRID_SIZE / 2, 0.1, GRID_SIZE / 2]}
        intensity={0}
        color="#4488ff"
        distance={10}
        decay={2}
      />
    </>
  );
}

interface SceneContentProps {
  onAddVoxel: (x: number, y: number, z: number) => void;
}

function SceneContent({ onAddVoxel }: SceneContentProps) {
  const {
    voxels,
    isDay,
    isClearing,
    removeVoxel,
    finishClearing,
  } = useVoxelStore();
  const [isDragging, setIsDragging] = useState(false);
  const lastDragPos = useRef<{ x: number; z: number } | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isClearing) {
      const timer = setTimeout(() => {
        finishClearing();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isClearing, finishClearing]);

  const getGridPosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = (e as any).camera as THREE.Camera;
    raycaster.current.setFromCamera(mouse.current, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, intersect);

    if (intersect) {
      const x = Math.floor(intersect.x);
      const z = Math.floor(intersect.z);
      if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
        return { x, z };
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    lastDragPos.current = null;

    const pos = getGridPosition(e);
    if (pos) {
      onAddVoxel(pos.x, 0, pos.z);
      lastDragPos.current = pos;
    }
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const pos = getGridPosition(e);
    if (!pos) return;

    if (lastDragPos.current) {
      const dx = pos.x - lastDragPos.current.x;
      const dz = pos.z - lastDragPos.current.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist >= 0.5) {
        const steps = Math.ceil(dist / 0.5);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ix = Math.round(lastDragPos.current.x + dx * t);
          const iz = Math.round(lastDragPos.current.z + dz * t);
          if (ix >= 0 && ix < GRID_SIZE && iz >= 0 && iz < GRID_SIZE) {
            onAddVoxel(ix, 0, iz);
          }
        }
        lastDragPos.current = pos;
      }
    } else {
      onAddVoxel(pos.x, 0, pos.z);
      lastDragPos.current = pos;
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    lastDragPos.current = null;
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Lighting isDay={isDay} />
      <GridFloor />

      {voxels.map((voxel) => (
        <VoxelMesh
          key={voxel.id}
          voxel={voxel}
          isDay={isDay}
          isClearing={isClearing}
          onRemove={removeVoxel}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        target={[GRID_SIZE / 2, 1, GRID_SIZE / 2]}
      />
    </div>
  );
}

interface SceneProps {
  onAddVoxel: (x: number, y: number, z: number) => void;
}

export function Scene({ onAddVoxel }: SceneProps) {
  const isDay = useVoxelStore((state) => state.isDay);

  const bgColor = isDay ? '#1a1a2e' : '#0d0d1a';

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      frameloop="always"
    >
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 20, 40]} />
      <SceneContent onAddVoxel={onAddVoxel} />
    </Canvas>
  );
}
