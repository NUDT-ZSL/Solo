import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMaterialStore, type Marker } from './store/materialStore';
import {
  createMaterial,
  DEFAULT_WALL,
  DEFAULT_ROOF,
  DEFAULT_WINDOW,
  type MaterialPreset,
  type MaterialSelection,
} from './utils/theme';

interface BuildingPartRefs {
  walls: THREE.Mesh[];
  roof: THREE.Mesh | null;
  windows: THREE.Mesh[];
}

function Building({
  useDefaultMaterials = false,
  onMeshRegister,
}: {
  useDefaultMaterials?: boolean;
  onMeshRegister?: (refs: BuildingPartRefs) => void;
}) {
  const buildingRef = useRef<THREE.Group>(null);
  const wallRefs = useRef<THREE.Mesh[]>([]);
  const roofRef = useRef<THREE.Mesh | null>(null);
  const windowRefs = useRef<THREE.Mesh[]>([]);
  const currentMaterials = useMaterialStore((s) => s.currentMaterials);

  const materials = useMemo(() => {
    if (useDefaultMaterials) {
      return {
        wall: createMaterial(DEFAULT_WALL as MaterialPreset),
        roof: createMaterial(DEFAULT_ROOF as MaterialPreset),
        window: createMaterial(DEFAULT_WINDOW as MaterialPreset),
      };
    }
    return {
      wall: createMaterial(currentMaterials.wall),
      roof: createMaterial(currentMaterials.roof),
      window: createMaterial(currentMaterials.window),
    };
  }, [
    useDefaultMaterials,
    currentMaterials.wall,
    currentMaterials.roof,
    currentMaterials.window,
  ]);

  useEffect(() => {
    if (onMeshRegister) {
      onMeshRegister({
        walls: wallRefs.current,
        roof: roofRef.current,
        windows: windowRefs.current,
      });
    }
  }, [onMeshRegister]);

  const wallPositions = useMemo(
    () => [
      { pos: [0, 1.5, -2.5] as [number, number, number], rot: [0, 0, 0] as [number, number, number], size: [8, 3, 0.2] as [number, number, number] },
      { pos: [0, 1.5, 2.5] as [number, number, number], rot: [0, 0, 0] as [number, number, number], size: [8, 3, 0.2] as [number, number, number] },
      { pos: [-4, 1.5, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], size: [5, 3, 0.2] as [number, number, number] },
      { pos: [4, 1.5, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], size: [5, 3, 0.2] as [number, number, number] },
    ],
    []
  );

  const windowPositions = useMemo(
    () => [
      { pos: [-2, 1.5, -2.39] as [number, number, number], size: [1.2, 1.4, 0.05] as [number, number, number] },
      { pos: [2, 1.5, -2.39] as [number, number, number], size: [1.2, 1.4, 0.05] as [number, number, number] },
      { pos: [-2, 1.5, 2.39] as [number, number, number], size: [1.2, 1.4, 0.05] as [number, number, number] },
      { pos: [2, 1.5, 2.39] as [number, number, number], size: [1.2, 1.4, 0.05] as [number, number, number] },
      { pos: [-3.89, 1.5, -1] as [number, number, number], size: [0.9, 1.3, 0.05] as [number, number, number] },
      { pos: [3.89, 1.5, 1] as [number, number, number], size: [0.9, 1.3, 0.05] as [number, number, number] },
    ],
    []
  );

  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-4.5, 0);
    shape.lineTo(0, 2);
    shape.lineTo(4.5, 0);
    shape.lineTo(-4.5, 0);
    const extrudeSettings = { depth: 5.5, bevelEnabled: false };
    return { shape, extrudeSettings };
  }, []);

  return (
    <group ref={buildingRef}>
      {wallPositions.map((wp, i) => (
        <mesh
          key={`wall-${i}`}
          ref={(el) => {
            if (el) wallRefs.current[i] = el;
          }}
          position={wp.pos}
          rotation={wp.rot}
          castShadow
          receiveShadow
          material={materials.wall}
        >
          <boxGeometry args={wp.size} />
        </mesh>
      ))}

      <mesh
        ref={(el) => {
          roofRef.current = el ?? null;
        }}
        position={[0, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        material={materials.roof}
      >
        <extrudeGeometry args={[roofShape.shape, roofShape.extrudeSettings]} />
      </mesh>

      {windowPositions.map((wp, i) => (
        <mesh
          key={`window-${i}`}
          ref={(el) => {
            if (el) windowRefs.current[i] = el;
          }}
          position={wp.pos}
          castShadow
          material={materials.window}
        >
          <boxGeometry args={wp.size} />
        </mesh>
      ))}
    </group>
  );
}

function Markers() {
  const markers = useMaterialStore((s) => s.markers);
  const lineRef = useRef<THREE.LineSegments>(null);

  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < markers.length - 1; i++) {
      const a = markers[i].position;
      const b = markers[i + 1].position;
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [markers]);

  return (
    <group>
      {markers.map((m: Marker) => (
        <mesh key={m.id} position={m.position}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#FF3333" />
        </mesh>
      ))}
      {markers.length > 1 && (
        <lineSegments ref={lineRef} geometry={lineGeometry}>
          <lineBasicMaterial color="#FF3333" transparent opacity={0.4} dashSize={0.2} gapSize={0.1} />
        </lineSegments>
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const speed = 0.03;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (keysPressed.current.has('w')) {
      camera.position.addScaledVector(forward, speed);
      if (controlsRef.current) controlsRef.current.target.addScaledVector(forward, speed);
    }
    if (keysPressed.current.has('s')) {
      camera.position.addScaledVector(forward, -speed);
      if (controlsRef.current) controlsRef.current.target.addScaledVector(forward, -speed);
    }
    if (keysPressed.current.has('a')) {
      camera.position.addScaledVector(right, -speed);
      if (controlsRef.current) controlsRef.current.target.addScaledVector(right, -speed);
    }
    if (keysPressed.current.has('d')) {
      camera.position.addScaledVector(right, speed);
      if (controlsRef.current) controlsRef.current.target.addScaledVector(right, speed);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function ClickMarkerHandler() {
  const { camera, scene, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const addMarker = useMaterialStore((s) => s.addMarker);
  const buildingGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Group && obj.children.length >= 4) {
        let hasMesh = false;
        obj.children.forEach((c) => {
          if (c instanceof THREE.Mesh) hasMesh = true;
        });
        if (hasMesh && !buildingGroupRef.current) {
          buildingGroupRef.current = obj;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!buildingGroupRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingGroupRef.current.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const offsetPos = hit.point.clone();
        const normal = hit.face?.normal?.clone() ?? new THREE.Vector3(0, 0, 1);
        offsetPos.addScaledVector(normal, 0.1);
        addMarker([offsetPos.x, offsetPos.y, offsetPos.z]);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [camera, gl, raycaster, addMarker]);

  return null;
}

function FPSMonitor({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - lastTime.current));
      onFpsUpdate(fps);
      frames.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

function SceneContent({ useDefaultMaterials = false }: { useDefaultMaterials?: boolean }) {
  return (
    <>
      <color attach="background" args={['#E0F7FA']} />
      <fog attach="fog" args={['#E0F7FA', 20, 50]} />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-6, 8, -4]} intensity={0.3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#8FBC8F" roughness={1} />
      </mesh>

      <Building useDefaultMaterials={useDefaultMaterials} />
      <Markers />

      {!useDefaultMaterials && <ClickMarkerHandler />}
      <CameraController />
      {!useDefaultMaterials && <FPSMonitor onFpsUpdate={() => {}} />}
    </>
  );
}

interface SceneControllerProps {
  isCompareMode: boolean;
  splitRatio: number;
  onFpsUpdate: (fps: number) => void;
}

export default function SceneController({ isCompareMode, splitRatio, onFpsUpdate }: SceneControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const leftWidth = isCompareMode ? containerSize.width * splitRatio - 1 : containerSize.width;
  const rightWidth = isCompareMode ? containerSize.width * (1 - splitRatio) - 1 : 0;
  const height = containerSize.height;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: leftWidth, height, zIndex: 1 }}>
        <Canvas
          key="left-view"
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [8, 7, 10], fov: 50, near: 0.1, far: 100 }}
          frameloop="always"
        >
          <SceneContent />
          <FPSMonitorWithCallback onFpsUpdate={onFpsUpdate} />
        </Canvas>
      </div>

      {isCompareMode && rightWidth > 0 && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: rightWidth,
            height,
            zIndex: 1,
            boxSizing: 'border-box',
            border: '2px dashed #AAAAAA',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10,
              padding: '6px 14px',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: 13,
              borderRadius: 6,
              fontFamily: "'Noto Sans SC', sans-serif",
              pointerEvents: 'none',
            }}
          >
            默认方案
          </div>
          <Canvas
            key="right-view"
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [8, 7, 10], fov: 50, near: 0.1, far: 100 }}
            frameloop="always"
          >
            <SceneContent useDefaultMaterials />
          </Canvas>
        </div>
      )}

      {isCompareMode && (
        <div
          style={{
            position: 'absolute',
            left: containerSize.width * splitRatio - 1,
            top: 0,
            width: 2,
            height: '100%',
            background: '#CCCCCC',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

function FPSMonitorWithCallback({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - lastTime.current));
      onFpsUpdate(fps);
      frames.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

export type { MaterialSelection };
