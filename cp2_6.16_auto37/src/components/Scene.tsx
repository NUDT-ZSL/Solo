import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import BuildingGrid from './BuildingGrid';
import WindParticles from './WindParticles';
import { BuildingData, SolarResult } from '../types';
import { calculateSunPosition } from '../utils/solarSimulator';

interface SceneProps {
  buildings: BuildingData[];
  solarResults?: SolarResult[][];
  showHeatmap: boolean;
  showWind: boolean;
  dayOfYear: number;
  latitude: number;
  isMobile: boolean;
  windParticleCount: number;
}

function SunLight({ dayOfYear, latitude }: { dayOfYear: number; latitude: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    if (lightRef.current) {
      const sunDir = calculateSunPosition(dayOfYear, latitude);
      const distance = 60;
      lightRef.current.position.copy(sunDir.clone().multiplyScalar(distance));
      lightRef.current.target.position.set(0, 0, 0);
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#362d1f', 0.3]} />
    </>
  );
}

function CameraController({ isMobile }: { isMobile: boolean }) {
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      minDistance={isMobile ? 15 : 10}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 5, 0]}
    />
  );
}

export default function Scene({
  buildings,
  solarResults,
  showHeatmap,
  showWind,
  dayOfYear,
  latitude,
  isMobile,
  windParticleCount
}: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [40, 25, 40], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1a2e');
      }}
    >
      <fog attach="fog" args={['#1a1a2e', 60, 120]} />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      <SunLight dayOfYear={dayOfYear} latitude={latitude} />
      <CameraController isMobile={isMobile} />

      <BuildingGrid
        buildings={buildings}
        solarResults={solarResults}
        showHeatmap={showHeatmap}
        isMobile={isMobile}
      />

      {showWind && (
        <WindParticles
          buildings={buildings}
          particleCount={windParticleCount}
          active={showWind}
        />
      )}
    </Canvas>
  );
}
