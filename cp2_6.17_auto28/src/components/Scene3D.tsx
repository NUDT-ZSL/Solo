import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getSolarPosition, calculateGroundSunlightMap, calculateFacadeSunHours } from '../utils/solarCalculator';

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
  southFacadeSunHours?: number;
}

function Building({ data, isSelected, onClick, southSunHours, allBuildings, month, day }: {
  data: BuildingData;
  isSelected: boolean;
  onClick: () => void;
  southSunHours?: number;
  allBuildings: BuildingData[];
  month: number;
  day: number;
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

      <mesh position={[0, data.height + 0.3, 0]}>
        <boxGeometry args={[1.5, 0.6, 1.5]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>

      <Text
        position={[0, data.height + 0.3, 0]}
        fontSize={0.4}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight={800}
      >
        {data.number}
      </Text>

      {isSelected && (
        <Html position={[0, data.height + 2, 0]} center distanceFactor={15}>
          <div style={{
            background: 'rgba(30,41,59,0.95)',
            color: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid #3b82f6',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            建筑 #{data.number} · 高度 {data.height}
          </div>
        </Html>
      )}

      {isSelected && (
        <FacadeHeatmap
          building={data}
          allBuildings={allBuildings}
          month={month}
          day={day}
        />
      )}
    </group>
  );
}

function FacadeHeatmap({ building, allBuildings, month, day }: {
  building: BuildingData;
  allBuildings: BuildingData[];
  month: number;
  day: number;
}) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [textureReady, setTextureReady] = useState(false);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const canvasHeight = 256;
    const canvasWidth = 128;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    const buildingInputs = allBuildings.map(b => ({
      x: b.x, z: b.z, height: b.height, width: b.width, depth: b.depth,
    }));

    const hoursAtHeight: number[] = [];
    const numHeights = 20;

    for (let i = 0; i < numHeights; i++) {
      const h = (building.height * i) / (numHeights - 1);
      let totalHours = 0;
      const step = 0.25;

      for (let hour = 6; hour <= 18; hour += step) {
        const solar = getSolarPosition(month, day, hour);
        if (solar.altitude <= 0) continue;

        const sunDir = solar.position.clone().normalize();
        if (sunDir.z <= 0) continue;

        const rayOrigin = new THREE.Vector3(building.x, h, building.z + building.depth / 2 + 0.01);
        let blocked = false;

        for (const ob of buildingInputs) {
          if (ob.x === building.x && ob.z === building.z) continue;

          const dx = ob.x - building.x;
          const dz = ob.z - building.z;
          if (dz < 0) continue;

          const t = (ob.z - building.z - building.depth / 2) / (sunDir.z + 0.001);
          if (t <= 0) continue;

          const ix = rayOrigin.x + sunDir.x * t;
          const iy = rayOrigin.y + sunDir.y * t;

          if (
            ix >= ob.x - ob.width / 2 && ix <= ob.x + ob.width / 2 &&
            iy >= 0 && iy <= ob.height &&
            t < 50
          ) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          totalHours += step;
        }
      }

      hoursAtHeight.push(totalHours);
    }

    const maxHours = 6;
    for (let y = 0; y < canvasHeight; y++) {
      const t = 1 - y / canvasHeight;
      const idx = Math.floor(t * (numHeights - 1));
      const idx2 = Math.min(idx + 1, numHeights - 1);
      const frac = t * (numHeights - 1) - idx;
      const hours = hoursAtHeight[idx] * (1 - frac) + hoursAtHeight[idx2] * frac;

      const normHours = Math.min(hours / maxHours, 1);
      const r = Math.round(255 * (1 - normHours));
      const g = Math.round(50 + 150 * normHours);
      const b = Math.round(50 + 205 * normHours);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, canvasWidth, 1);
    }

    textureRef.current = new THREE.CanvasTexture(canvas);
    textureRef.current.needsUpdate = true;
    setTextureReady(true);

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [building.id, building.height, month, day, allBuildings]);

  if (!textureReady || !textureRef.current) return null;

  return (
    <mesh position={[0, building.height / 2, building.depth / 2 + 0.02]}>
      <planeGeometry args={[building.width, building.height]} />
      <meshBasicMaterial
        map={textureRef.current}
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SunSphere({ position }: { position: THREE.Vector3 }) {
  return (
    <mesh position={position.toArray()}>
      <sphereGeometry args={[2, 24, 24]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} />
    </mesh>
  );
}

function GroundGrid() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1e293b" roughness={0.95} />
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

    const maxHours = 12;
    const deepBlue = new THREE.Color('#1e3a8a');
    const brightYellow = new THREE.Color('#fde047');

    const meshes = results.map((r, i) => {
      const t = Math.min(r.hours / maxHours, 1);
      const color = deepBlue.clone().lerp(brightYellow, t);

      return (
        <mesh key={i} position={[r.x, 0.02, r.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
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
  const { gl } = useThree();

  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.enabled = true;
  }, [gl]);

  useFrame(() => {
    if (lightRef.current) {
      const now = performance.now();
      if (now - lastShadowUpdate.current > 66) {
        lightRef.current.shadow.needsUpdate = true;
        lastShadowUpdate.current = now;
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
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />

      <hemisphereLight args={['#87ceeb', '#1e293b', 0.3]} />

      <GroundGrid />

      {buildings.map(b => (
        <Building
          key={b.id}
          data={b}
          isSelected={b.id === selectedBuildingId}
          onClick={() => onSelectBuilding(b.id === selectedBuildingId ? null : b.id)}
          allBuildings={buildings}
          month={month}
          day={day}
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
