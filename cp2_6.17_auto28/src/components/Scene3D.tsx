import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getSolarPosition, calculateGroundSunlightMap } from '../utils/solarCalculator';

interface BuildingData {
  id: string;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  color: string;
  number: number;
}

interface Scene3DProps {
  buildings: BuildingData[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string | null) => void;
  solarPosition: { azimuth: number; altitude: number; position: THREE.Vector3; sunDistance: number };
  month: number;
  day: number;
  showSunReport: boolean;
}

function Building({ data, isSelected, onClick }: {
  data: BuildingData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const outlineScale = 1.02;

  return (
    <group position={[data.x, 0, data.z]}>
      <mesh
        ref={meshRef}
        position={[0, data.height / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[data.width, data.height, data.depth]} />
        <meshStandardMaterial
          color={data.color}
          roughness={0.6}
          metalness={0.1}
          emissive={isSelected ? '#ffffff' : (hovered ? '#444444' : '#000000')}
          emissiveIntensity={isSelected ? 0.3 : (hovered ? 0.1 : 0)}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, data.height / 2, 0]}>
          <boxGeometry args={[data.width * outlineScale, data.height * outlineScale, data.depth * outlineScale]} />
          <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.6} />
        </mesh>
      )}

      <mesh position={[0, data.height + 0.5, 0]}>
        <boxGeometry args={[1.2, 0.6, 1.2]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>

      <Text
        position={[0, data.height + 0.5, 0]}
        fontSize={0.4}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {data.number}
      </Text>

      {isSelected && (
        <Html position={[0, data.height + 1.8, 0]} center distanceFactor={15}>
          <div style={{
            background: 'rgba(30,41,59,0.9)',
            color: '#f8fafc',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid #3b82f6',
            pointerEvents: 'none',
          }}>
            #{data.number} · 高度 {data.height} 单位
          </div>
        </Html>
      )}

      {isSelected && <FacadeHeatmap data={data} />}
    </group>
  );
}

function FacadeHeatmap({ data }: { data: BuildingData }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const hoursMap = useMemo(() => {
    const map: number[] = [];
    for (let i = 0; i < 6; i++) {
      map.push(i + 1);
    }
    return map;
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = Math.max(1, Math.round(data.height * 16));
    const ctx = canvas.getContext('2d')!;
    canvasRef.current = canvas;

    for (let y = 0; y < canvas.height; y++) {
      const h = data.height * (1 - y / canvas.height);
      const t = h / data.height;
      const r = Math.round(255 * (1 - t));
      const g = Math.round(50 * t);
      const b = Math.round(255 * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }

    textureRef.current = new THREE.CanvasTexture(canvas);
    textureRef.current.needsUpdate = true;
  }, [data.height, data.id]);

  if (!textureRef.current) return null;

  return (
    <mesh position={[0, data.height / 2, data.depth / 2 + 0.01]}>
      <planeGeometry args={[data.width, data.height]} />
      <meshBasicMaterial
        map={textureRef.current}
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SunSphere({ position }: { position: THREE.Vector3 }) {
  return (
    <mesh position={position.toArray()}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} />
    </mesh>
  );
}

function GroundGrid() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <gridHelper args={[60, 30, '#334155', '#1e3a5f']} position={[0, 0.01, 0]} />
    </group>
  );
}

function GroundSunlightOverlay({ buildings, month, day }: {
  buildings: BuildingData[];
  month: number;
  day: number;
}) {
  const [overlayMeshes, setOverlayMeshes] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const buildingInputs = buildings.map(b => ({
      x: b.x, z: b.z, height: b.height, width: b.width, depth: b.depth,
    }));

    const results = calculateGroundSunlightMap(buildingInputs, month, day, 2, {
      minX: -15, maxX: 15, minZ: -15, maxZ: 15,
    });

    const maxHours = Math.max(...results.map(r => r.hours), 1);

    const meshes = results.map((r, i) => {
      const t = r.hours / maxHours;
      const color = new THREE.Color();
      color.setRGB(
        0.12 + t * 0.87,
        0.23 + t * 0.65,
        0.54 - t * 0.22
      );

      return (
        <mesh key={i} position={[r.x, 0.02, r.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      );
    });

    setOverlayMeshes(meshes);
  }, [buildings, month, day]);

  return <group>{overlayMeshes}</group>;
}

const Scene3D: React.FC<Scene3DProps> = ({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  solarPosition,
  month,
  day,
  showSunReport,
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const lastShadowUpdate = useRef(0);

  useFrame(() => {
    if (lightRef.current) {
      const now = performance.now();
      if (now - lastShadowUpdate.current > 66) {
        lightRef.current.shadow.needsUpdate = true;
        lastShadowUpdate.current = now;
      } else {
        lightRef.current.shadow.needsUpdate = false;
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 40, 80]} />

      <ambientLight intensity={0.15} color="#94a3b8" />

      <directionalLight
        ref={lightRef}
        position={solarPosition.position.toArray()}
        intensity={solarPosition.altitude > 0 ? 1.5 : 0.1}
        color="#fef3c7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      <hemisphereLight args={['#87ceeb', '#1e293b', 0.3]} />

      <GroundGrid />

      {buildings.map(b => (
        <Building
          key={b.id}
          data={b}
          isSelected={b.id === selectedBuildingId}
          onClick={() => onSelectBuilding(b.id === selectedBuildingId ? null : b.id)}
        />
      ))}

      {solarPosition.altitude > 0 && <SunSphere position={solarPosition.position} />}

      {showSunReport && (
        <GroundSunlightOverlay buildings={buildings} month={month} day={day} />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={8}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 3, 0]}
      />
    </>
  );
};

export default Scene3D;
