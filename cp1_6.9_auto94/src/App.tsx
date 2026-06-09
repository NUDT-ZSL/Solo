import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Scene from './Scene';
import ControlsPanel from './ControlsPanel';

export interface PrismState {
  id: number;
  rotation: number;
  refraction: number;
  position: [number, number, number];
}

export interface Preset {
  name: string;
  prisms: { rotation: number; refraction: number }[];
  lightIntensity: number;
}

const PRESETS: Record<string, Preset> = {
  sunset: {
    name: '日落暖调',
    prisms: [
      { rotation: 30, refraction: 1.8 },
      { rotation: 60, refraction: 2.0 },
      { rotation: 45, refraction: 1.6 },
    ],
    lightIntensity: 1.8,
  },
  aurora: {
    name: '极光冷调',
    prisms: [
      { rotation: 120, refraction: 2.2 },
      { rotation: 180, refraction: 2.4 },
      { rotation: 150, refraction: 2.0 },
    ],
    lightIntensity: 1.2,
  },
  neon: {
    name: '霓虹幻彩',
    prisms: [
      { rotation: 90, refraction: 1.5 },
      { rotation: 270, refraction: 2.5 },
      { rotation: 180, refraction: 2.0 },
    ],
    lightIntensity: 2.0,
  },
};

const DEFAULT_PRISMS: PrismState[] = [
  { id: 0, rotation: 0, refraction: 1.5, position: [-3, 0, 0] },
  { id: 1, rotation: 0, refraction: 1.5, position: [0, 0, 0] },
  { id: 2, rotation: 0, refraction: 1.5, position: [3, 0, 0] },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const App: React.FC = () => {
  const [prisms, setPrisms] = useState<PrismState[]>(DEFAULT_PRISMS);
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [transitioning, setTransitioning] = useState(false);

  const updatePrism = useCallback((id: number, key: 'rotation' | 'refraction', value: number) => {
    setPrisms(prev =>
      prev.map(p => (p.id === id ? { ...p, [key]: value } : p)
    );
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    setTransitioning(true);
    const startPrisms = prisms.map(p => ({ rotation: p.rotation, refraction: p.refraction }));
    const startIntensity = lightIntensity;
    const startTime = performance.now();
    const duration = 1500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setPrisms(prev =>
        prev.map((p, i) => ({
          ...p,
          rotation: lerp(startPrisms[i].rotation, preset.prisms[i].rotation, eased),
          refraction: lerp(startPrisms[i].refraction, preset.prisms[i].refraction, eased),
        }))
      );
      setLightIntensity(lerp(startIntensity, preset.lightIntensity, eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTransitioning(false);
      }
    };

    requestAnimationFrame(animate);
  }, [prisms, lightIntensity]);

  const takeScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `prism-spectrum-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') {
        takeScreenshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [takeScreenshot]);

  return (
    <div
      style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <Canvas
      camera={{ position: [0, 5, 12], fov: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <fog attach="fog" args={['#0a0a1a', 10, 50]} />
      <color attach="background" args={['#0a0a1a']} />
      <ambientLight intensity={0.2} />
      <Scene prisms={prisms} lightIntensity={lightIntensity} />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minAzimuthAngle={-Math.PI / 2}
        maxAzimuthAngle={Math.PI / 2}
      />
    </Canvas>
    <ControlsPanel
      prisms={prisms}
      lightIntensity={lightIntensity}
      onUpdatePrism={updatePrism}
      onUpdateLightIntensity={setLightIntensity}
      onApplyPreset={applyPreset}
      transitioning={transitioning}
    />
  </div>
  );
};

export default App;
