import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import type { Sculpture } from '@/types';

interface SculptureMeshProps {
  sculpture: Sculpture;
  position: [number, number, number];
  onClick: () => void;
  isSelected: boolean;
}

function SculptureMesh({ sculpture, position, onClick, isSelected }: SculptureMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  const geometry = useMemo(() => {
    const s = sculpture.scale;
    switch (sculpture.geometryType) {
      case 'torusKnot':
        return new THREE.TorusKnotGeometry(0.55 * s, 0.18 * s, 128, 16);
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(0.75 * s, 0);
      case 'icosahedron':
        return new THREE.IcosahedronGeometry(0.8 * s, 0);
      case 'octahedron':
        return new THREE.OctahedronGeometry(0.85 * s, 0);
      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(0.95 * s, 0);
      case 'torus':
        return new THREE.TorusGeometry(0.6 * s, 0.22 * s, 32, 64);
      default:
        return new THREE.SphereGeometry(0.7 * s, 48, 48);
    }
  }, [sculpture.geometryType, sculpture.scale]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sculpture.color),
      metalness: sculpture.materialType === '青铜' ? 0.85 : 0.08,
      roughness: sculpture.materialType === '青铜' ? 0.3 : 0.55,
      envMapIntensity: 1.0
    });
    return mat;
  }, [sculpture.color, sculpture.materialType]);

  return (
    <group position={position}>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.2, 48]} />
        <meshStandardMaterial
          color="#151525"
          transparent
          opacity={0.85}
          roughness={1}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[0, -0.02, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry args={[1.0, 1.05, 0.06, 48]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.4}
          roughness={0.7}
        />
      </mesh>

      <group
        ref={groupRef}
        position={[0, 1.0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material}
          castShadow
          receiveShadow
        />

        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.4 * sculpture.scale, 32, 32]} />
            <meshBasicMaterial
              color="#ff8c00"
              transparent
              opacity={0.08}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>

      {isSelected && (
        <Html
          position={[0, 2.5 * sculpture.scale, 0]}
          center
          distanceFactor={8}
          zIndexRange={[0, 0]}
        >
          <div
            style={{
              padding: '4px 12px',
              background: 'rgba(255, 140, 0, 0.9)',
              color: '#000',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(255,140,0,0.4)'
            }}
          >
            {sculpture.title}
          </div>
        </Html>
      )}
    </group>
  );
}

interface AutoTourControllerProps {
  controlsRef: React.MutableRefObject<any>;
}

function AutoTourController({ controlsRef }: AutoTourControllerProps) {
  const isAutoTouring = useGalleryStore((s) => s.isAutoTouring);
  const setCameraState = useGalleryStore((s) => s.setCameraState);
  const { camera } = useThree();
  const timeRef = useRef(0);
  const radius = 7.5;
  const duration = 30;

  useFrame((_, delta) => {
    if (!isAutoTouring) {
      timeRef.current = 0;
      return;
    }
    if (!controlsRef.current) return;

    timeRef.current += delta;
    const t = (timeRef.current % duration) / duration;
    const angle = t * Math.PI * 2;
    const pitch = Math.sin(timeRef.current * 0.5) * (10 * Math.PI / 180);

    const yOffset = 2.2 + Math.sin(timeRef.current * 0.3) * 0.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    camera.position.set(x, yOffset + Math.sin(pitch) * 2, z);
    controlsRef.current.target.lerp(new THREE.Vector3(0, 1, 0), 0.08);
    controlsRef.current.update();

    setCameraState({
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: controlsRef.current.target.x, y: controlsRef.current.target.y, z: controlsRef.current.target.z }
    });
  });

  return null;
}

interface SculptureViewerProps {
  initialView?: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
  };
  initialSculptureId?: string;
}

export default function SculptureViewer({ initialView, initialSculptureId }: SculptureViewerProps) {
  const sculptures = useGalleryStore((s) => s.sculptures);
  const selectedSculptureId = useGalleryStore((s) => s.selectedSculptureId);
  const selectSculpture = useGalleryStore((s) => s.selectSculpture);
  const setCameraState = useGalleryStore((s) => s.setCameraState);
  const setAutoTouring = useGalleryStore((s) => s.setAutoTouring);

  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const positions = useMemo(() => {
    const n = sculptures.length || 6;
    const radius = 4.5;
    return sculptures.map((_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ] as [number, number, number];
    });
  }, [sculptures]);

  useEffect(() => {
    if (initialView && controlsRef.current) {
      camera.position.set(initialView.position.x, initialView.position.y, initialView.position.z);
      controlsRef.current.target.set(initialView.target.x, initialView.target.y, initialView.target.z);
      controlsRef.current.update();
    }
    if (initialSculptureId) {
      setTimeout(() => selectSculpture(initialSculptureId), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView, initialSculptureId]);

  return (
    <>
      <AutoTourController controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={2}
        maxDistance={12}
        minPolarAngle={(60 * Math.PI) / 180}
        maxPolarAngle={(120 * Math.PI) / 180}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
        onChange={() => {
          if (controlsRef.current) {
            const c = controlsRef.current.object.position;
            const t = controlsRef.current.target;
            setCameraState({
              position: { x: c.x, y: c.y, z: c.z },
              target: { x: t.x, y: t.y, z: t.z },
              zoom: c.length()
            });
          }
        }}
        onStart={() => setAutoTouring(false)}
      />

      <color attach="background" args={[0x1a1a2e]} />
      <fog attach="fog" args={[0x1a1a2e, 12, 28]} />

      <ambientLight intensity={0.55} color={0xffffff} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        color={0xfff4e0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-6, 6, -6]} intensity={0.5} color={0x88aaff} distance={25} />
      <pointLight position={[6, 4, -4]} intensity={0.35} color={0xff8c00} distance={20} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#12121f"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 4.3, 128]} />
        <meshBasicMaterial color="#ff8c00" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {sculptures.map((sculpture, i) => (
        <SculptureMesh
          key={sculpture.id}
          sculpture={sculpture}
          position={positions[i] || [0, 0, 0]}
          onClick={() => {
            setAutoTouring(false);
            selectSculpture(selectedSculptureId === sculpture.id ? null : sculpture.id);
          }}
          isSelected={selectedSculptureId === sculpture.id}
        />
      ))}
    </>
  );
}
