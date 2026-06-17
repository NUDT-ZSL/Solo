import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const GRID_SIZE = 128;
const PLANE_SIZE = 10;

const HEIGHT_COLORS = [
  new THREE.Color('#4fc3f7'),
  new THREE.Color('#81c784'),
  new THREE.Color('#ffb74d'),
  new THREE.Color('#e57373'),
];

function getTerrainColor(height: number): THREE.Color {
  const t = Math.max(0, Math.min(1, height));
  const segment = t * (HEIGHT_COLORS.length - 1);
  const idx = Math.floor(segment);
  const frac = segment - idx;
  if (idx >= HEIGHT_COLORS.length - 1) return HEIGHT_COLORS[HEIGHT_COLORS.length - 1].clone();
  return HEIGHT_COLORS[idx].clone().lerp(HEIGHT_COLORS[idx + 1], frac);
}

interface TerrainMeshProps {
  heights: Float32Array;
  brushRadius: number;
  cameraMode: 'orbit' | 'birdseye';
  editMode: 'raise' | 'lower';
  onModifyHeight: (x: number, y: number, delta: number) => void;
}

const TerrainMesh: React.FC<TerrainMeshProps> = ({
  heights,
  brushRadius,
  cameraMode,
  editMode,
  onModifyHeight,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const isMouseDown = useRef(false);
  const lastModifyTime = useRef(0);
  const { raycaster, camera, gl } = useThree();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      PLANE_SIZE,
      PLANE_SIZE,
      GRID_SIZE - 1,
      GRID_SIZE - 1
    );
    geo.rotateX(-Math.PI / 2);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const wireGeo = useMemo(() => {
    const wire = new THREE.WireframeGeometry(geometry);
    return wire;
  }, [geometry]);

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const y = Math.floor(i / GRID_SIZE);
      const x = i % GRID_SIZE;
      const vertIdx = y * GRID_SIZE + x;
      if (vertIdx < posAttr.count) {
        posAttr.setY(vertIdx, heights[i] * 3);
        const c = getTerrainColor(heights[i]);
        colAttr.setXYZ(vertIdx, c.r, c.g, c.b);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.computeVertexNormals();
  });

  const handlePointerDown = useCallback(
    (e: any) => {
      if (e.button !== 0) return;
      isMouseDown.current = true;
      const uv = e.uv;
      if (uv) {
        const delta = editMode === 'raise' ? 0.05 : -0.05;
        onModifyHeight(uv.x, 1 - uv.y, delta);
      }
    },
    [editMode, onModifyHeight]
  );

  const handlePointerUp = useCallback(() => {
    isMouseDown.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!isMouseDown.current) return;
      const now = Date.now();
      if (now - lastModifyTime.current < 30) return;
      lastModifyTime.current = now;
      const uv = e.uv;
      if (uv) {
        const delta = editMode === 'raise' ? 0.02 : -0.02;
        onModifyHeight(uv.x, 1 - uv.y, delta);
      }
    },
    [editMode, onModifyHeight]
  );

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <lineSegments ref={lineRef} geometry={wireGeo}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} linewidth={0.5} />
      </lineSegments>
    </group>
  );
};

const CameraController: React.FC<{ mode: 'orbit' | 'birdseye' }> = ({ mode }) => {
  const { camera } = useThree();
  const targetPos = useMemo(() => {
    if (mode === 'birdseye') {
      return new THREE.Vector3(0, 12, 0.01);
    }
    return new THREE.Vector3(5, 5, 5);
  }, [mode]);

  useEffect(() => {
    const startPos = camera.position.clone();
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, targetPos, eased);
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [mode, camera, targetPos]);

  return null;
};

interface TerrainCanvasProps {
  heights: Float32Array;
  brushRadius: number;
  cameraMode: 'orbit' | 'birdseye';
  editMode: 'raise' | 'lower';
  onModifyHeight: (x: number, y: number, delta: number) => void;
}

const TerrainCanvas: React.FC<TerrainCanvasProps> = ({
  heights,
  brushRadius,
  cameraMode,
  editMode,
  onModifyHeight,
}) => {
  return (
    <Canvas
      camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 100 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0d1b2a'));
      }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <directionalLight position={[-3, 5, -3]} intensity={0.3} />
      <TerrainMesh
        heights={heights}
        brushRadius={brushRadius}
        cameraMode={cameraMode}
        editMode={editMode}
        onModifyHeight={onModifyHeight}
      />
      <CameraController mode={cameraMode} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={20}
        target={[0, 0, 0]}
      />
      <gridHelper args={[PLANE_SIZE, 20, '#37474f', '#263238']} position={[0, -0.01, 0]} />
    </Canvas>
  );
};

export default TerrainCanvas;
