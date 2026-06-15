import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import OceanWater from './OceanWater';
import OceanBottle from './OceanBottle';
import { WaveFoamParticles, StarlightParticles, BackgroundLightParticles, BreakParticles } from './OceanParticles';
import { useOceanStore } from '../store';

function ShoreIndicator() {
  return (
    <mesh position={[-5.5, 0.02, 0]}>
      <planeGeometry args={[3, 14]} />
      <meshBasicMaterial color="#C4A882" transparent opacity={0.25} side={2} />
    </mesh>
  );
}

function ShoreLabel() {
  return (
    <mesh position={[-5.5, 0.05, -5]}>
      <planeGeometry args={[2, 0.5]} />
      <meshBasicMaterial color="#C4A882" transparent opacity={0.15} side={2} />
    </mesh>
  );
}

function Scene() {
  const bottles = useOceanStore((s) => s.bottles);
  const brokenBottleIds = useOceanStore((s) => s.brokenBottleIds);

  return (
    <>
      <ambientLight color="#87CEEB" intensity={0.4} />
      <directionalLight color="#FFF8E7" intensity={0.6} position={[5, 8, 3]} />
      <hemisphereLight args={['#87CEEB', '#1a365d', 0.3]} />

      <OceanWater />
      <ShoreIndicator />
      <ShoreLabel />

      {bottles
        .filter((b) => !brokenBottleIds.includes(b.id))
        .map((bottle) => (
          <OceanBottle key={bottle.id} bottle={bottle} />
        ))}

      <WaveFoamParticles />
      <StarlightParticles />
      <BackgroundLightParticles />
      <BreakParticles />

      <Stars radius={50} depth={50} count={200} factor={3} saturation={0.2} fade speed={0.5} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        autoRotate
        autoRotateSpeed={0.1}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.8} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
      </EffectComposer>
    </>
  );
}

export default function OceanCanvas() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 6, 8], fov: 55, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: 'linear-gradient(180deg, #0a0e27 0%, #1a365d 40%, #2d5a8e 100%)' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
