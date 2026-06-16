import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import BrainModel from './BrainModel';
import EEGArc from './EEGArc';
import { useEEGContext } from '../../context/EEGContext';
import { REGION_INFO } from '../../types';
import type { BrainRegion } from '../../types';

const REGION_ARC_CONFIG: Record<BrainRegion, {
  position: [number, number, number];
  rotation: [number, number, number];
  arcHeight: number;
  arcRadius: number;
}> = {
  frontal: {
    position: [0, 0.6, 0.9],
    rotation: [0, 0, 0],
    arcHeight: 0.4,
    arcRadius: 0.5
  },
  parietal: {
    position: [0, 1.0, -0.1],
    rotation: [0, 0, 0],
    arcHeight: 0.45,
    arcRadius: 0.55
  },
  temporal: {
    position: [0.9, 0.3, 0.1],
    rotation: [0, Math.PI / 2, 0],
    arcHeight: 0.35,
    arcRadius: 0.45
  },
  occipital: {
    position: [0, 0.4, -1.0],
    rotation: [0, Math.PI, 0],
    arcHeight: 0.4,
    arcRadius: 0.5
  }
};

interface SceneContentProps {
  onHoveredRegion: (region: BrainRegion | null) => void;
}

function SceneContent({ onHoveredRegion }: SceneContentProps) {
  const { eegData, flowSpeed, alertRegions, hoveredRegion, setHoveredRegion } = useEEGContext();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (hoveredRegion) {
      onHoveredRegion(hoveredRegion);
    }
  });

  const handleRegionHover = (region: string | null) => {
    setHoveredRegion(region as BrainRegion | null);
  };

  const regions: BrainRegion[] = ['frontal', 'parietal', 'temporal', 'occipital'];

  return (
    <group ref={groupRef}>
      <BrainModel
        hoveredRegion={hoveredRegion}
        onRegionHover={handleRegionHover}
      />

      {regions.map((region) => {
        const config = REGION_ARC_CONFIG[region];
        const data = eegData?.data[region] || Array(128).fill(0);
        const isAlert = alertRegions.includes(region);
        const info = REGION_INFO[region];

        return (
          <group
            key={region}
            position={config.position}
            rotation={config.rotation as [number, number, number]}
          >
            <EEGArc
              position={[0, 0, 0]}
              data={data}
              color={info.color}
              speed={flowSpeed}
              isAlert={isAlert}
              arcHeight={config.arcHeight}
              arcRadius={config.arcRadius}
            />
          </group>
        );
      })}

      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#6366f1" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#00d2ff" />
      <directionalLight position={[0, 5, 2]} intensity={0.6} color="#ffffff" />
      <pointLight position={[0, -2, 3]} intensity={0.3} color="#ff4757" />
    </group>
  );
}

function BrainScene() {
  const handleHoveredRegion = () => {
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a1a']} />

        <SceneContent onHoveredRegion={handleHoveredRegion} />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI - 0.2}
          enableDamping
          dampingFactor={0.05}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default BrainScene;
