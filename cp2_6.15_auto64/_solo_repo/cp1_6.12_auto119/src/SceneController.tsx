import React, { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useMaterialStore } from './store/materialStore';
import {
  createMaterial,
  DEFAULT_WALL,
  DEFAULT_ROOF,
  DEFAULT_WINDOW,
  type MaterialPreset,
} from './utils/theme';

export interface SceneControllerRef {
  getFps: () => number;
}

function Building({
  wallMaterial,
  roofMaterial,
  windowMaterial,
}: {
  wallMaterial: THREE.MeshStandardMaterial;
  roofMaterial: THREE.MeshStandardMaterial;
  windowMaterial: THREE.MeshStandardMaterial;
}) {
  const wallPositions = useMemo(
    () => [
      { pos: [0, 1.5, -2.5] as [number, number, number], size: [8, 3, 0.2] as [number, number, number] },
      { pos: [0, 1.5, 2.5] as [number, number, number], size: [8, 3, 0.2] as [number, number, number] },
      { pos: [-4, 1.5, 0] as [number, number, number], size: [5, 3, 0.2] as [number, number, number], rotY: Math.PI / 2 },
      { pos: [4, 1.5, 0] as [number, number, number], size: [5, 3, 0.2] as [number, number, number], rotY: Math.PI / 2 },
    ],
    []
  );

  const windowPositions = useMemo(
    () => [
      { pos: [-2, 1.5, -2.45] as [number, number, number], size: [1.2, 1.4, 0.08] as [number, number, number] },
      { pos: [2, 1.5, -2.45] as [number, number, number], size: [1.2, 1.4, 0.08] as [number, number, number] },
      { pos: [-2, 1.5, 2.45] as [number, number, number], size: [1.2, 1.4, 0.08] as [number, number, number] },
      { pos: [2, 1.5, 2.45] as [number, number, number], size: [1.2, 1.4, 0.08] as [number, number, number] },
      { pos: [-3.95, 1.5, -1] as [number, number, number], size: [0.08, 1.3, 0.9] as [number, number, number] },
      { pos: [3.95, 1.5, 1] as [number, number, number], size: [0.08, 1.3, 0.9] as [number, number, number] },
    ],
    []
  );

  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-4.6, 0);
    shape.lineTo(0, 2.2);
    shape.lineTo(4.6, 0);
    shape.lineTo(-4.6, 0);
    const extrudeSettings = {
      depth: 5.2,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group name="building">
      {wallPositions.map((wp, i) => (
        <mesh
          key={`wall-${i}`}
          position={wp.pos}
          rotation={wp.rotY ? [0, wp.rotY, 0] : [0, 0, 0]}
          castShadow
          receiveShadow
          material={wallMaterial}
          name="wall"
        >
          <boxGeometry args={wp.size} />
        </mesh>
      ))}

      <mesh
        position={[0, 3, -2.6]}
        rotation={[0, 0, 0]}
        geometry={roofGeometry}
        material={roofMaterial}
        castShadow
        name="roof"
      />

      {windowPositions.map((wp, i) => (
        <mesh
          key={`window-${i}`}
          position={wp.pos}
          castShadow
          material={windowMaterial}
          name="window"
        >
          <boxGeometry args={wp.size} />
        </mesh>
      ))}
    </group>
  );
}

const BuildingMemo = React.memo(Building);

function Markers({ markers }: { markers: { id: number; position: [number, number, number] }[] }) {
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (let i = 0; i < markers.length - 1; i++) {
      const a = markers[i].position;
      const b = markers[i + 1].position;
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [markers]);

  return (
    <group name="markers">
      {markers.map((m) => (
        <mesh key={m.id} position={m.position} name="marker">
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#FF3333" />
        </mesh>
      ))}
      {markers.length > 1 && (
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#FF3333" transparent opacity={0.45} linewidth={1} />
        </lineSegments>
      )}
    </group>
  );
}

const MarkersMemo = React.memo(Markers);

function KeyboardMovement({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame(() => {
    const speed = 0.03;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) return;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let dx = 0;
    let dz = 0;

    if (keysRef.current['w']) { dz += 1; }
    if (keysRef.current['s']) { dz -= 1; }
    if (keysRef.current['a']) { dx -= 1; }
    if (keysRef.current['d']) { dx += 1; }

    if (dx === 0 && dz === 0) return;

    const move = new THREE.Vector3();
    move.addScaledVector(forward, dz * speed);
    move.addScaledVector(right, dx * speed);

    camera.position.add(move);
    if (controlsRef.current?.target) {
      controlsRef.current.target.add(move);
    }
  });

  return null;
}

function ClickMarkerAdder({ enabled = true }: { enabled?: boolean }) {
  const { camera, scene, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const addMarker = useMaterialStore((s) => s.addMarker);

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const building = scene.getObjectByName('building');
      if (!building) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(building, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const pos = hit.point.clone();
        const normal = hit.face?.normal?.clone();
        if (normal) {
          normal.transformDirection(hit.object.matrixWorld);
          pos.addScaledVector(normal, 0.09);
        }
        addMarker([pos.x, pos.y, pos.z]);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [camera, gl, raycaster, addMarker, scene, enabled]);

  return null;
}

function FPSReporter({ onFps }: { onFps: (fps: number) => void }) {
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    framesRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 500) {
      const fps = Math.round((framesRef.current * 1000) / (now - lastTimeRef.current));
      onFps(fps);
      framesRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  return null;
}

interface SceneViewProps {
  useDefaultMaterials?: boolean;
  enableMarkerPlacement?: boolean;
  onFpsUpdate?: (fps: number) => void;
}

function SceneView({
  useDefaultMaterials = false,
  enableMarkerPlacement = true,
  onFpsUpdate,
}: SceneViewProps) {
  const controlsRef = useRef<any>(null);
  const currentMaterials = useMaterialStore((s) => s.currentMaterials);
  const markers = useMaterialStore((s) => s.markers);

  const materials = useMemo(() => {
    const wallPreset: MaterialPreset = useDefaultMaterials ? DEFAULT_WALL : currentMaterials.wall;
    const roofPreset: MaterialPreset = useDefaultMaterials ? DEFAULT_ROOF : currentMaterials.roof;
    const windowPreset: MaterialPreset = useDefaultMaterials ? DEFAULT_WINDOW : currentMaterials.window;
    return {
      wall: createMaterial(wallPreset),
      roof: createMaterial(roofPreset),
      window: createMaterial(windowPreset),
    };
  }, [
    useDefaultMaterials,
    currentMaterials.wall,
    currentMaterials.roof,
    currentMaterials.window,
  ]);

  return (
    <>
      <Sky sunPosition={[100, 50, 100]} turbidity={3} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.25} color="#87CEEB" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#8FBC8F" roughness={1} />
      </mesh>

      <BuildingMemo
        wallMaterial={materials.wall}
        roofMaterial={materials.roof}
        windowMaterial={materials.window}
      />

      <MarkersMemo markers={markers} />

      {enableMarkerPlacement && <ClickMarkerAdder />}
      <KeyboardMovement controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.05}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        enablePan
        panSpeed={1}
      />

      {onFpsUpdate && <FPSReporter onFps={onFpsUpdate} />}
    </>
  );
}

const SceneViewMemo = React.memo(SceneView);

interface SceneControllerProps {
  isCompareMode: boolean;
  splitRatio: number;
  onSplitRatioChange?: (ratio: number) => void;
  onFpsUpdate?: (fps: number) => void;
}

const SceneController = forwardRef<SceneControllerRef, SceneControllerProps>(function SceneController(
  { isCompareMode, splitRatio, onSplitRatioChange, onFpsUpdate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fpsRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getFps: () => fpsRef.current,
  }));

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!isCompareMode || !onSplitRatioChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onSplitRatioChange(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, isCompareMode, onSplitRatioChange]);

  const handleFps = (fps: number) => {
    fpsRef.current = fps;
    if (onFpsUpdate) onFpsUpdate(fps);
  };

  const leftWidth = isCompareMode ? dimensions.width * splitRatio : dimensions.width;
  const rightWidth = isCompareMode ? dimensions.width * (1 - splitRatio) : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: leftWidth,
          height: dimensions.height,
        }}
      >
        <Canvas
          key="left-canvas"
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [8, 6.5, 10], fov: 50, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <SceneViewMemo enableMarkerPlacement={true} onFpsUpdate={handleFps} />
        </Canvas>
      </div>

      {isCompareMode && rightWidth > 10 && (
        <>
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: rightWidth,
              height: dimensions.height,
              boxSizing: 'border-box',
              border: '2px dashed #A0A0A0',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                padding: '6px 14px',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
                pointerEvents: 'none',
              }}
            >
              默认方案
            </div>
            <Canvas
              key="right-canvas"
              shadows
              dpr={[1, 1.5]}
              camera={{ position: [8, 6.5, 10], fov: 50, near: 0.1, far: 200 }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
              <SceneViewMemo useDefaultMaterials={true} enableMarkerPlacement={false} />
            </Canvas>
          </div>

          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            style={{
              position: 'absolute',
              left: leftWidth - 1,
              top: 0,
              width: 3,
              height: '100%',
              background: '#E0E0E0',
              cursor: 'col-resize',
              zIndex: 20,
              userSelect: 'none',
            }}
          />
        </>
      )}
    </div>
  );
});

SceneController.displayName = 'SceneController';

export default SceneController;
