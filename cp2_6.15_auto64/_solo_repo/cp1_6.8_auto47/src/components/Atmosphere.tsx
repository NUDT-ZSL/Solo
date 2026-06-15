import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Atmosphere() {
  const fogRef = useRef<THREE.Points>(null);
  const starRef = useRef<THREE.Points>(null);

  const fogData = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return { positions, count };
  }, []);

  const starData = useMemo(() => {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const brightnesses = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 50;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 2.5;
      brightnesses[i] = 0.3 + Math.random() * 0.7;
    }
    return { positions, phases, speeds, brightnesses, count };
  }, []);

  const fogGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(fogData.positions, 3));
    return geo;
  }, [fogData]);

  const fogMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(0.6, 0.65, 0.7),
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        size: 2.5,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    [],
  );

  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starData.positions, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(starData.phases, 1));
    geo.setAttribute('speed', new THREE.BufferAttribute(starData.speeds, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(starData.brightnesses, 1));
    return geo;
  }, [starData]);

  const starMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        size: 0.3,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (fogRef.current) {
      const pos = fogRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const halfWidth = 30;
      for (let i = 0; i < fogData.count; i++) {
        arr[i * 3] += delta * 0.4;
        if (arr[i * 3] > halfWidth) {
          arr[i * 3] = -halfWidth;
        }
      }
      pos.needsUpdate = true;
    }

    if (starRef.current) {
      const material = starRef.current.material as THREE.PointsMaterial;
      const phases = starGeometry.attributes.phase as THREE.BufferAttribute;
      const speeds = starGeometry.attributes.speed as THREE.BufferAttribute;
      const brightnesses = starGeometry.attributes.brightnesses as THREE.BufferAttribute;
      const phasesArr = phases.array as Float32Array;
      const speedsArr = speeds.array as Float32Array;
      const brightnessesArr = brightnesses.array as Float32Array;

      let avgOpacity = 0;
      const time = performance.now() * 0.001;
      for (let i = 0; i < starData.count; i++) {
        const twinkle = Math.sin(time * speedsArr[i] + phasesArr[i]);
        avgOpacity += brightnessesArr[i] * (0.5 + 0.5 * twinkle);
      }
      avgOpacity /= starData.count;
      material.opacity = Math.max(0.01, avgOpacity);
    }
  });

  return (
    <group>
      <points ref={fogRef} geometry={fogGeometry} material={fogMaterial} />
      <points ref={starRef} geometry={starGeometry} material={starMaterial} />
    </group>
  );
}
