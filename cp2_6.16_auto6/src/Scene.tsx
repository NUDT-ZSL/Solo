import { useRef, useMemo, useEffect, MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

interface SceneContentProps {
  particleSystemRef: MutableRefObject<ParticleSystem | null>;
  orbitControlsRef: MutableRefObject<any>;
}

function SceneContent({ particleSystemRef, orbitControlsRef }: SceneContentProps) {
  const meshRef = useRef<THREE.Points | null>(null);
  const { camera } = useThree();
  const initialCameraPosition = useMemo(() => new THREE.Vector3(0, 0, 18), []);

  useEffect(() => {
    camera.position.copy(initialCameraPosition);
    camera.lookAt(0, 0, 0);
  }, [camera, initialCameraPosition]);

  useEffect(() => {
    if (particleSystemRef.current && meshRef.current) {
      const particleMesh = particleSystemRef.current.getParticleMesh();
      meshRef.current = particleMesh;
    }
  }, [particleSystemRef]);

  useFrame((_, delta) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.update(delta);
    }
  });

  return (
    <>
      <primitive object={particleSystemRef.current?.getParticleMesh()!} attach="children" />
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.85}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(5 * Math.PI) / 6}
        makeDefault
      />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

interface SceneProps {
  particleSystemRef: MutableRefObject<ParticleSystem | null>;
  orbitControlsRef: MutableRefObject<any>;
}

export default function Scene({ particleSystemRef, orbitControlsRef }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 18], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%', background: '#0f0f23' }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={['#0f0f23', 20, 60]} />
      <SceneContent particleSystemRef={particleSystemRef} orbitControlsRef={orbitControlsRef} />
    </Canvas>
  );
}
