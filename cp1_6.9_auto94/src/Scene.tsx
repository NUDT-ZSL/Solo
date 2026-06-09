import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Prism from './Prism';
import type { PrismState } from './App';

interface SceneProps {
  prisms: PrismState[];
  lightIntensity: number;
}

const LIGHT_SOURCE: [number, number, number] = [0, 10, 0];
const MAX_PULSES = 200;
const PULSE_DURATION = 300;

interface PulseData {
  position: THREE.Vector3;
  startTime: number;
  color: THREE.Color;
}

const Scene: React.FC<SceneProps> = ({ prisms, lightIntensity }) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const pulsesRef = useRef<PulseData[]>([]);
  const pulsePointsRef = useRef<THREE.Points>(null);

  const pulseGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PULSES * 3);
    const colors = new Float32Array(MAX_PULSES * 3);
    const sizes = new Float32Array(MAX_PULSES);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);

  useFrame(() => {
    const currentTime = performance.now();

    pulsesRef.current = pulsesRef.current.filter(
      p => currentTime - p.startTime < PULSE_DURATION
    );

    if (pulsePointsRef.current) {
      const positions = pulseGeometry.attributes.position.array as Float32Array;
      const colors = pulseGeometry.attributes.color.array as Float32Array;
      const sizes = pulseGeometry.attributes.size.array as Float32Array;

      const count = Math.min(pulsesRef.current.length, MAX_PULSES);

      for (let i = 0; i < count; i++) {
        const pulse = pulsesRef.current[i];
        const elapsed = currentTime - pulse.startTime;
        const progress = elapsed / PULSE_DURATION;
        const eased = 1 - Math.pow(1 - progress, 2);

        positions[i * 3] = pulse.position.x;
        positions[i * 3 + 1] = pulse.position.y;
        positions[i * 3 + 2] = pulse.position.z;

        const opacity = 1 - progress;
        colors[i * 3] = pulse.color.r * opacity;
        colors[i * 3 + 1] = pulse.color.g * opacity;
        colors[i * 3 + 2] = pulse.color.b * opacity;

        sizes[i] = (2 + eased * 13) * lightIntensity;
      }

      pulseGeometry.setDrawRange(0, count);
      pulseGeometry.attributes.position.needsUpdate = true;
      pulseGeometry.attributes.color.needsUpdate = true;
      pulseGeometry.attributes.size.needsUpdate = true;
    }
  });

  const curtainGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(20, 15, 20, 15);
  }, []);

  const lightSourceVisual = useMemo(() => {
    return new THREE.SphereGeometry(0.3, 16, 16);
  }, []);

  return (
    <group>
      <spotLight
        ref={lightRef}
        position={LIGHT_SOURCE}
        angle={0.3}
        penumbra={0.5}
        intensity={lightIntensity * 2}
        color={0xffffff}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh position={LIGHT_SOURCE}>
        <primitive object={lightSourceVisual} attach="geometry" />
        <meshBasicMaterial color={0xffffff} transparent opacity={0.9} />
      </mesh>

      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.08, 0.2, 10, 8, 1, true]} />
        <meshBasicMaterial
          color={0xffffee}
          transparent
          opacity={0.15 * lightIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {prisms.map(prism => (
        <Prism
          key={prism.id}
          id={prism.id}
          position={prism.position}
          rotation={prism.rotation}
          refraction={prism.refraction}
          lightSource={LIGHT_SOURCE}
          lightIntensity={lightIntensity}
          pulsesRef={pulsesRef as React.MutableRefObject<PulseData[]>}
        />
      ))}

      <mesh position={[0, 2, -8]}>
        <primitive object={curtainGeometry} attach="geometry" />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.15}
          wireframe={true}
        />
      </mesh>

      <mesh position={[0, 2, -7.99]}>
        <planeGeometry args={[20, 15]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      <points ref={pulsePointsRef} geometry={pulseGeometry}>
        <pointsMaterial
          size={0.5}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color={0x111122}
          transparent
          opacity={0.5}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      <gridHelper
        args={[30, 30, 0x333366, 0x222244]}
        position={[0, -2.99, 0]}
      />

      <pointLight position={[0, 8, 5]} intensity={0.3} color={0xaaaaff} />
      <pointLight position={[-8, 3, 3]} intensity={0.2} color={0xffaaaa} />
      <pointLight position={[8, 3, 3]} intensity={0.2} color={0xaaffaa} />
    </group>
  );
};

export default Scene;
