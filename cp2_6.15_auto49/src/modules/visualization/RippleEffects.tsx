import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, RippleData } from '../../store';
import { createRippleMaterial } from './shaders';

interface RippleMeshProps {
  ripple: RippleData;
  onComplete: (id: number) => void;
}

function RippleMesh({ ripple, onComplete }: RippleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const startTime = useRef<number | null>(null);
  const duration = 1000;

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    if (startTime.current === null) startTime.current = clock.getElapsedTime() * 1000;

    const elapsed = clock.getElapsedTime() * 1000 - startTime.current;
    const progress = Math.min(elapsed / duration, 1.0);
    matRef.current.uniforms.uProgress.value = progress;
    matRef.current.uniforms.uMaxRadius.value = 15;

    if (meshRef.current) {
      const scale = 1 + progress * 30;
      meshRef.current.scale.set(scale, 1, scale);
      meshRef.current.lookAt(
        ripple.x + 100,
        ripple.y + 50,
        ripple.z + 100
      );
    }

    if (progress >= 1.0) {
      onComplete(ripple.id);
    }
  });

  const material = createRippleMaterial();

  return (
    <mesh ref={meshRef} position={[ripple.x, ripple.y, ripple.z]}>
      <ringGeometry args={[0.01, 1, 64]} />
      <primitive object={material} attach="material" ref={matRef} />
    </mesh>
  );
}

export default function RippleEffects() {
  const ripples = useStore((s) => s.ripples);
  const removeRipple = useStore((s) => s.removeRipple);

  return (
    <>
      {ripples.map((r) => (
        <RippleMesh key={r.id} ripple={r} onComplete={removeRipple} />
      ))}
    </>
  );
}
