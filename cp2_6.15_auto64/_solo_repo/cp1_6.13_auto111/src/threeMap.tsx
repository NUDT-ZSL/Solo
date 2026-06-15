import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Station, PollutantType } from './config';
import { MAP_CONFIG, POLLUTANT_COLORS, POLLUTANT_LABELS } from './config';
import { concentrationToHeight, interpolateColor, easeInOut } from './apiService';

interface ThreeMapProps {
  stations: Station[];
  currentHour: number;
  activePollutant: PollutantType;
  selectedStationId: string | null;
  onStationSelect: (stationId: string | null) => void;
  windDirection: number;
}

interface StationBarProps {
  station: Station;
  activePollutant: PollutantType;
  isSelected: boolean;
  onClick: () => void;
}

const StationBar: React.FC<StationBarProps> = React.memo(
  ({ station, activePollutant, isSelected, onClick }) => {
    const groupRef = useRef<THREE.Group>(null);
    const cylinderRef = useRef<THREE.Mesh>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    const targetHeight = useRef(0);
    const currentHeight = useRef(0);
    const targetColor = useRef(new THREE.Color());
    const currentColor = useRef(new THREE.Color());
    const animating = useRef(false);
    const animStart = useRef(0);
    const startHeight = useRef(0);
    const startColor = useRef(new THREE.Color());

    const concentration = station.concentrations[activePollutant];
    const newHeight = concentrationToHeight(
      concentration,
      MAP_CONFIG.maxConcentration,
      MAP_CONFIG.maxHeight
    );
    const colorRatio = concentration / MAP_CONFIG.maxConcentration;
    const newColorHex = interpolateColor(
      '#22c55e',
      '#dc2626',
      colorRatio
    );

    useEffect(() => {
      startHeight.current = currentHeight.current;
      startColor.current.copy(currentColor.current);
      targetHeight.current = newHeight;
      targetColor.current.set(newColorHex);
      animStart.current = performance.now();
      animating.current = true;
    }, [newHeight, newColorHex]);

    useFrame(() => {
      if (!cylinderRef.current || !sphereRef.current) return;

      if (animating.current) {
        const elapsed = performance.now() - animStart.current;
        const duration = MAP_CONFIG.animationDuration || 500;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeInOut(t);

        currentHeight.current =
          startHeight.current +
          (targetHeight.current - startHeight.current) * eased;
        currentColor.current.lerpColors(
          startColor.current,
          targetColor.current,
          eased
        );

        if (t >= 1) {
          animating.current = false;
        }
      }

      const h = currentHeight.current;
      (cylinderRef.current.geometry as THREE.CylinderGeometry).scale(1, h / 1, 1);
      cylinderRef.current.position.y = h / 2;
      (cylinderRef.current.material as THREE.MeshStandardMaterial).color.copy(
        currentColor.current
      );

      sphereRef.current.position.y = h + 0.8;
      (sphereRef.current.material as THREE.MeshStandardMaterial).color.copy(
        currentColor.current
      );
    });

    const mapX = station.x - MAP_CONFIG.size / 2;
    const mapZ = station.y - MAP_CONFIG.size / 2;

    return (
      <group
        ref={groupRef}
        position={[mapX, 0, mapZ]}
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
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry
            args={[MAP_CONFIG.stationBaseRadius, MAP_CONFIG.stationBaseRadius, 0.2, 32]}
          />
          <meshStandardMaterial
            color={isSelected ? '#3b82f6' : MAP_CONFIG.stationBaseColor}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        <mesh ref={cylinderRef} position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 1, 16]} />
          <meshStandardMaterial
            color={newColorHex}
            transparent
            opacity={0.85}
            roughness={0.4}
            metalness={0.2}
            emissive={newColorHex}
            emissiveIntensity={0.15}
          />
        </mesh>

        <mesh ref={sphereRef}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color={newColorHex}
            transparent
            opacity={0.5}
            emissive={newColorHex}
            emissiveIntensity={0.3}
          />
        </mesh>

        {isSelected && (
          <Html position={[0, -2, 0]} center distanceFactor={10}>
            <div
              style={{
                padding: '4px 10px',
                background: 'rgba(59, 130, 246, 0.9)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {station.name}
            </div>
          </Html>
        )}
      </group>
    );
  }
);

StationBar.displayName = 'StationBar';

const WindParticles: React.FC<{ windDirection: number }> = React.memo(
  ({ windDirection }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const positionsRef = useRef<Float32Array | null>(null);
    const velocitiesRef = useRef<Float32Array | null>(null);

    const { positions, velocities } = useMemo(() => {
      const pos = new Float32Array(MAP_CONFIG.particleCount * 3);
      const vel = new Float32Array(MAP_CONFIG.particleCount * 3);

      for (let i = 0; i < MAP_CONFIG.particleCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * MAP_CONFIG.size;
        pos[i * 3 + 1] = Math.random() * MAP_CONFIG.maxHeight * 0.6 + 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * MAP_CONFIG.size;
      }

      return { positions: pos, velocities: vel };
    }, []);

    useEffect(() => {
      positionsRef.current = positions;
      velocitiesRef.current = velocities;
    }, [positions, velocities]);

    useFrame((_, delta) => {
      if (!pointsRef.current || !positionsRef.current) return;

      const rad = (windDirection * Math.PI) / 180;
      const vx = Math.sin(rad) * MAP_CONFIG.windSpeed * delta;
      const vz = Math.cos(rad) * MAP_CONFIG.windSpeed * delta;
      const pos = positionsRef.current;
      const half = MAP_CONFIG.size / 2;

      for (let i = 0; i < MAP_CONFIG.particleCount; i++) {
        pos[i * 3] += vx + (Math.random() - 0.5) * 0.02;
        pos[i * 3 + 2] += vz + (Math.random() - 0.5) * 0.02;
        pos[i * 3 + 1] += (Math.random() - 0.5) * 0.01;

        if (pos[i * 3] > half) pos[i * 3] = -half;
        if (pos[i * 3] < -half) pos[i * 3] = half;
        if (pos[i * 3 + 2] > half) pos[i * 3 + 2] = -half;
        if (pos[i * 3 + 2] < -half) pos[i * 3 + 2] = half;
        if (pos[i * 3 + 1] > MAP_CONFIG.maxHeight * 0.8) pos[i * 3 + 1] = 2;
        if (pos[i * 3 + 1] < 1) pos[i * 3 + 1] = MAP_CONFIG.maxHeight * 0.8;
      }

      (pointsRef.current.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
    });

    return (
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAP_CONFIG.particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={MAP_CONFIG.particleSize}
          color={MAP_CONFIG.particleColor}
          transparent
          opacity={MAP_CONFIG.particleOpacity}
          sizeAttenuation
        />
      </points>
    );
  }
);

WindParticles.displayName = 'WindParticles';

const CameraController: React.FC = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(MAP_CONFIG.size * 0.8, MAP_CONFIG.size * 0.7, MAP_CONFIG.size * 0.8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
};

const Scene: React.FC<ThreeMapProps> = ({
  stations,
  currentHour,
  activePollutant,
  selectedStationId,
  onStationSelect,
  windDirection,
}) => {
  return (
    <>
      <CameraController />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[100, 150, 100]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-100, 80, -100]} intensity={0.3} />

      <Grid
        args={[MAP_CONFIG.size, MAP_CONFIG.size / 10]}
        cellSize={MAP_CONFIG.size / 30}
        cellThickness={0.5}
        cellColor={MAP_CONFIG.gridColor}
        sectionSize={MAP_CONFIG.size / 6}
        sectionThickness={1}
        sectionColor={MAP_CONFIG.gridColor}
        fadeDistance={MAP_CONFIG.size * 2}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_CONFIG.size, MAP_CONFIG.size]} />
        <meshStandardMaterial
          color={MAP_CONFIG.groundColor}
          transparent
          opacity={MAP_CONFIG.groundOpacity}
        />
      </mesh>

      <WindParticles windDirection={windDirection} />

      {stations.map((station) => (
        <StationBar
          key={station.id}
          station={station}
          activePollutant={activePollutant}
          isSelected={station.id === selectedStationId}
          onClick={() =>
            onStationSelect(
              station.id === selectedStationId ? null : station.id
            )
          }
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={50}
        maxDistance={MAP_CONFIG.size * 2}
        maxPolarAngle={Math.PI / 2.2}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
};

export const ThreeMap: React.FC<ThreeMapProps> = (props) => {
  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: MAP_CONFIG.size * 10 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => props.onStationSelect(null)}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
};

export default ThreeMap;
