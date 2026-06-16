import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ProtonData, SequenceParams } from '../types';

interface ProtonSystemProps {
  protons: ProtonData[];
  animationPhase: number;
  params: SequenceParams;
}

function ProtonSystem({ protons, animationPhase, params }: ProtonSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { flipAngle } = params;
  const flipRad = (flipAngle * Math.PI) / 180;
  const flipFactor = Math.sin(flipRad);

  const positions = useMemo(() => {
    const pos = new Float32Array(protons.length * 3);
    for (let i = 0; i < protons.length; i++) {
      pos[i * 3] = protons[i].x;
      pos[i * 3 + 1] = protons[i].y;
      pos[i * 3 + 2] = protons[i].z;
    }
    return pos;
  }, [protons]);

  const colors = useMemo(() => {
    const cols = new Float32Array(protons.length * 3);
    for (let i = 0; i < protons.length; i++) {
      const color = new THREE.Color(protons[i].color);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return cols;
  }, [protons]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.attributes.position;
    const posArray = positionAttr.array as Float32Array;
    const colorAttr = geometry.attributes.color;
    const colArray = colorAttr.array as Float32Array;

    for (let i = 0; i < protons.length; i++) {
      const p = protons[i];
      const phase = p.phase + p.frequency * animationPhase * flipFactor * 0.5;

      const wobbleRadius = 0.02;
      const dx = Math.cos(phase) * wobbleRadius;
      const dy = Math.sin(phase) * wobbleRadius;

      posArray[i * 3] = p.x + dx;
      posArray[i * 3 + 1] = p.y + dy;

      const brightness = 0.6 + 0.4 * Math.sin(phase);
      const baseColor = new THREE.Color(p.color);
      colArray[i * 3] = baseColor.r * brightness;
      colArray[i * 3 + 1] = baseColor.g * brightness;
      colArray[i * 3 + 2] = baseColor.b * brightness;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={protons.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={protons.length}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
        sizeAttenuation={true}
      />
    </points>
  );
}

interface SceneContentProps {
  protons: ProtonData[];
  params: SequenceParams;
  animationPhase: number;
  resetKey: number;
}

function SceneContent({ protons, params, animationPhase, resetKey }: SceneContentProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetKey]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} />
      <pointLight position={[-2, -1, -2]} intensity={0.3} />

      <mesh scale={[1.2, 0.8, 0.8]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial
          color="#ffe4e1"
          transparent
          opacity={0.3}
          roughness={0.5}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>

      <ProtonSystem
        protons={protons}
        animationPhase={animationPhase}
        params={params}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={10}
      />
    </>
  );
}

interface SceneProps {
  protons: ProtonData[];
  params: SequenceParams;
  animationPhase: number;
  resetKey: number;
}

function Scene({ protons, params, animationPhase, resetKey }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [3, 2, 3], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 8, 15]} />
      <SceneContent
        protons={protons}
        params={params}
        animationPhase={animationPhase}
        resetKey={resetKey}
      />
    </Canvas>
  );
}

export default Scene;
