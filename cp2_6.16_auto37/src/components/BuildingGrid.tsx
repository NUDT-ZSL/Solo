import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingData, SolarResult } from '../types';
import { heatmapColor } from '../utils/solarSimulator';

interface BuildingGridProps {
  buildings: BuildingData[];
  solarResults?: SolarResult[][];
  showHeatmap: boolean;
  isMobile: boolean;
}

function BuildingMesh({
  building,
  solarData,
  showHeatmap,
  useLOD
}: {
  building: BuildingData;
  solarData?: SolarResult[];
  showHeatmap: boolean;
  useLOD: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const { color, edgeColor } = useMemo(() => {
    if (showHeatmap && solarData && solarData.length > 0) {
      const avgIntensity = solarData.reduce((sum, r) => sum + r.intensity, 0) / solarData.length;
      const heatColor = heatmapColor(avgIntensity);
      return { color: heatColor, edgeColor: new THREE.Color(0xffffff) };
    }

    const t = Math.min(1, Math.max(0, (building.height - 2) / 28));
    const lowColor = new THREE.Color('#4caf50');
    const highColor = new THREE.Color('#ff5722');
    const heightColor = lowColor.clone().lerp(highColor, t);
    return { color: heightColor, edgeColor: new THREE.Color(0xffffff) };
  }, [building.height, showHeatmap, solarData]);

  if (building.isGreen) {
    return null;
  }

  return (
    <group position={[building.x, building.height / 2, building.z]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial
          color={color}
          transparent={showHeatmap}
          opacity={showHeatmap ? 0.6 : 1}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {!useLOD && (
        <lineSegments ref={edgesRef}>
          <edgesGeometry args={[new THREE.BoxGeometry(building.width, building.height, building.depth)]} />
          <lineBasicMaterial color={edgeColor} transparent opacity={0.3} />
        </lineSegments>
      )}
    </group>
  );
}

function GreenPlane({ building }: { building: BuildingData }) {
  return (
    <mesh position={[building.x, 0.02, building.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[building.width * 1.8, building.depth * 1.8]} />
      <meshStandardMaterial
        color="#4caf50"
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GroundGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);

  return (
    <gridHelper
      ref={gridRef}
      args={[30, 30, '#555555', '#555555']}
      position={[0, 0, 0]}
    />
  );
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#2a2a3e" />
    </mesh>
  );
}

export default function BuildingGrid({
  buildings,
  solarResults,
  showHeatmap,
  isMobile
}: BuildingGridProps) {
  const { camera } = useThree();
  const [useLOD, setUseLOD] = React.useState(false);

  useFrame(() => {
    if (isMobile) {
      const distance = camera.position.length();
      setUseLOD(distance > 50);
    }
  });

  const nonGreenBuildings = useMemo(
    () => buildings.filter(b => !b.isGreen),
    [buildings]
  );

  const greenBuildings = useMemo(
    () => buildings.filter(b => b.isGreen),
    [buildings]
  );

  return (
    <group>
      <GroundPlane />
      <GroundGrid />

      {greenBuildings.map(building => (
        <GreenPlane key={`green-${building.id}`} building={building} />
      ))}

      {nonGreenBuildings.map((building, index) => (
        <BuildingMesh
          key={building.id}
          building={building}
          solarData={solarResults?.[index]}
          showHeatmap={showHeatmap}
          useLOD={useLOD}
        />
      ))}
    </group>
  );
}
