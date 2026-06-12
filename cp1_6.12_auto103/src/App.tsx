import React, { useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OceanRenderer } from './render/OceanRenderer';
import { ControlPanel } from './ui/ControlPanel';
import { useSimulation } from './app/useSimulation';
import { useSimulationStore } from './app/store';
import './index.css';

function Scene() {
  const resolution = useSimulationStore(s => s.resolution);
  const { heightMapRef, rippleDataRef, addWaveSource, addEnergyRipple, reset } = useSimulation();

  const handleMeshClick = useCallback((x: number, y: number) => {
    addWaveSource(x, y);
  }, [addWaveSource]);

  return (
    <OceanRenderer
      resolution={resolution}
      onMeshClick={handleMeshClick}
      rippleDataRef={rippleDataRef}
      heightMapRef={heightMapRef}
    />
  );
}

function App() {
  const { addWaveSource, addEnergyRipple, reset } = useSimulation();

  const handleAddWaveSource = useCallback((x: number, y: number) => {
    addWaveSource(x, y);
  }, [addWaveSource]);

  const handleAddEnergyRipple = useCallback(() => {
    addEnergyRipple();
  }, [addEnergyRipple]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="app-container">
      <Canvas
        camera={{
          position: [8.5, 8.5, 8.5],
          fov: 50,
          near: 0.1,
          far: 200
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#0D1B2A'), 1);
        }}
      >
        <color attach="background" args={['#0D1B2A']} />
        <fog attach="fog" args={['#B0D4F1', 20, 80]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.8}
          color="#C8DCF0"
        />
        <Scene />
        <OrbitControls
          enableDamping
          dampingFactor={0.9}
          rotateSpeed={0.5}
          panSpeed={0.01}
          minDistance={5}
          maxDistance={30}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2}
          enablePan
        />
      </Canvas>

      <ControlPanel
        onAddWaveSource={handleAddWaveSource}
        onAddEnergyRipple={handleAddEnergyRipple}
        onReset={handleReset}
      />

      <div className="bg-gradient" />
    </div>
  );
}

export default App;
