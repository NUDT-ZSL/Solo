import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent, useThree } from '@react-three/fiber';
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
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

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

    if (materialRef.current) {
      const targetColor = isDay ? voxel.color : '#333355';
      const targetEmissive = isDay ? '#000000' : '#4488ff';
      const targetEmissiveIntensity = isDay ? 0 : 0.15;

      materialRef.current.color.lerp(
        new THREE.Color(targetColor),
        0.1
      );
      materialRef.current.emissive.lerp(
        new THREE.Color(targetEmissive),
        0.1
      );
      materialRef.current.emissiveIntensity +=
        (targetEmissiveIntensity - materialRef.current.emissiveIntensity) * 0.1;
      materialRef.current.opacity += (opacity - materialRef.current.opacity) * 0.2;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onRemove(voxel.id);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const canvas = (e.target as any).ownerDocument?.querySelector('canvas');
    if (canvas) {
      const event = new CustomEvent('voxelpointerdown', { bubbles: true });
      canvas.dispatchEvent(event);
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5]}
      scale={scale}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshStandardMaterial
        ref={materialRef}
        color={isDay ? voxel.color : '#333355'}
        emissive={isDay ? '#000000' : '#4488ff'}
        emissiveIntensity={isDay ? 0 : 0.15}
        transparent
        opacity={opacity}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

function CustomGrid() {
  const gridLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const step = GRID_SIZE / GRID_DIVISIONS;

    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = i * step;

      points.push(new THREE.Vector3(pos, 0.005, 0));
      points.push(new THREE.Vector3(pos, 0.005, GRID_SIZE));

      points.push(new THREE.Vector3(0, 0.005, pos));
      points.push(new THREE.Vector3(GRID_SIZE, 0.005, pos));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial
          color="#555555"
          transparent
          opacity={0.3}
        />
      </lineSegments>
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
  const { camera, gl } = useThree();
  const isVoxelClickRef = useRef(false);

  useEffect(() => {
    if (isClearing) {
      const timer = setTimeout(() => {
        finishClearing();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isClearing, finishClearing]);

  const getGridPosition = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

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
    },
    [camera, gl.domElement]
  );

  const placeVoxelsAlongPath = useCallback(
    (from: { x: number; z: number }, to: { x: number; z: number }) => {
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.5) {
        onAddVoxel(to.x, 0, to.z);
        return;
      }

      const stepCount = Math.ceil(dist / 0.5);
      for (let i = 0; i <= stepCount; i++) {
        const t = i / stepCount;
        const ix = Math.round(from.x + dx * t);
        const iz = Math.round(from.z + dz * t);
        if (ix >= 0 && ix < GRID_SIZE && iz >= 0 && iz < GRID_SIZE) {
          onAddVoxel(ix, 0, iz);
        }
      }
    },
    [onAddVoxel]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (isVoxelClickRef.current) {
        isVoxelClickRef.current = false;
        return;
      }

      setIsDragging(true);
      lastDragPos.current = null;

      const pos = getGridPosition(e.clientX, e.clientY);
      if (pos) {
        onAddVoxel(pos.x, 0, pos.z);
        lastDragPos.current = pos;
      }
    },
    [getGridPosition, onAddVoxel]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      const pos = getGridPosition(e.clientX, e.clientY);
      if (!pos) return;

      if (lastDragPos.current) {
        placeVoxelsAlongPath(lastDragPos.current, pos);
        lastDragPos.current = pos;
      } else {
        onAddVoxel(pos.x, 0, pos.z);
        lastDragPos.current = pos;
      }
    },
    [isDragging, getGridPosition, placeVoxelsAlongPath, onAddVoxel]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    lastDragPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleVoxelPointerDown = () => {
      isVoxelClickRef.current = true;
    };
    canvas.addEventListener('voxelpointerdown', handleVoxelPointerDown as any);
    return () => {
      canvas.removeEventListener('voxelpointerdown', handleVoxelPointerDown as any);
    };
  }, [gl.domElement]);

  return (
    <>
      <Lighting isDay={isDay} />
      <CustomGrid />

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
        mouseButtons={{
          LEFT: null as any,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </>
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
