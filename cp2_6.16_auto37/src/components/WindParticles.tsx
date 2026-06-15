import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingData, WindParticle } from '../types';
import { createParticles, updateParticles, getWindDirection } from '../utils/windSimulator';

interface WindParticlesProps {
  buildings: BuildingData[];
  particleCount: number;
  active: boolean;
}

export default function WindParticles({
  buildings,
  particleCount,
  active
}: WindParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const trailsGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<WindParticle[]>([]);
  const buildingsRef = useRef<BuildingData[]>(buildings);
  const activeRef = useRef(active);

  useEffect(() => {
    buildingsRef.current = buildings;
  }, [buildings]);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      particlesRef.current = createParticles(particleCount);
    } else {
      particlesRef.current = [];
    }
  }, [active, particleCount]);

  useFrame((_, delta) => {
    if (!activeRef.current || particlesRef.current.length === 0) return;
    if (!pointsRef.current) return;

    const dt = Math.min(delta, 0.05);
    const result = updateParticles(particlesRef.current, buildingsRef.current, dt);
    particlesRef.current = result.particles;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const t = p.age / p.lifespan;
      colors[i * 3] = 33 / 255 * (1 - t) + 1 * t;
      colors[i * 3 + 1] = 150 / 255 * (1 - t) + 1 * t;
      colors[i * 3 + 2] = 243 / 255 * (1 - t) + 1 * t;
    }

    for (let i = particlesRef.current.length; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    if (trailsGroupRef.current) {
      while (trailsGroupRef.current.children.length > result.trails.length) {
        trailsGroupRef.current.remove(trailsGroupRef.current.children[trailsGroupRef.current.children.length - 1]);
      }

      while (trailsGroupRef.current.children.length < result.trails.length) {
        const line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.25 })
        );
        trailsGroupRef.current.add(line);
      }

      for (let i = 0; i < result.trails.length; i++) {
        const trail = result.trails[i];
        const line = trailsGroupRef.current.children[i] as THREE.Line;
        const positions = new Float32Array(trail.length * 3);

        for (let j = 0; j < trail.length; j++) {
          positions[j * 3] = trail[j].x;
          positions[j * 3 + 1] = trail[j].y;
          positions[j * 3 + 2] = trail[j].z;
        }

        line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 33 / 255;
      colors[i * 3 + 1] = 150 / 255;
      colors[i * 3 + 2] = 243 / 255;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geo;
  }, [particleCount]);

  if (!active) return null;

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.18}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <group ref={trailsGroupRef} />

      <arrowHelper
        args={[
          getWindDirection(),
          new THREE.Vector3(-12, 2, -12),
          5,
          0x2196f3,
          0.8,
          0.5
        ]}
      />
    </group>
  );
}
