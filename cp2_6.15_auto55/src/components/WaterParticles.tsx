import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useStore } from '@/store';

const PARTICLE_COUNT = 1500;
const TRAIL_LENGTH = 5;
const COLOR_START = new THREE.Color('#64b5f6');
const COLOR_END = new THREE.Color('#1e88e5');

export default function WaterParticles() {
  const particles = useStore((state) => state.particles);
  const particleSize = useStore((state) => state.particleSize);
  const speedMultiplier = useStore((state) => state.speedMultiplier);
  const simulationTime = useStore((state) => state.simulationTime);

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lineRefs = useRef<(THREE.Line | null)[]>([]);

  const particleData = useMemo(() => {
    const radii = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      radii[i] = 0.1 + Math.random() * 0.1;

      const t = Math.random();
      const color = COLOR_START.clone().lerp(COLOR_END, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      if (particles[i]) {
        positions[i * 3] = particles[i].x;
        positions[i * 3 + 1] = particles[i].y;
        positions[i * 3 + 2] = particles[i].z;
        velocities[i * 3] = particles[i].vx || 0;
        velocities[i * 3 + 1] = particles[i].vy || 0;
        velocities[i * 3 + 2] = particles[i].vz || 0;
      } else {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }

    return { radii, colors, positions, velocities };
  }, [particles]);

  const trailPositionArrays = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const arr = new Float32Array((TRAIL_LENGTH + 1) * 3);
      arr.fill(0);
      return arr;
    });
  }, []);

  const trailColorArrays = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const arr = new Float32Array((TRAIL_LENGTH + 1) * 4);
      arr.fill(0);
      return arr;
    });
  }, []);

  const lineGeometries = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(trailPositionArrays[i], 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(trailColorArrays[i], 4));
      return geometry;
    });
  }, [trailPositionArrays, trailColorArrays]);

  useEffect(() => {
    if (particles.length > 0) {
      for (let i = 0; i < Math.min(particles.length, PARTICLE_COUNT); i++) {
        const p = particles[i];
        particleData.positions[i * 3] = p.x;
        particleData.positions[i * 3 + 1] = p.y;
        particleData.positions[i * 3 + 2] = p.z;
        particleData.velocities[i * 3] = p.vx || 0;
        particleData.velocities[i * 3 + 1] = p.vy || 0;
        particleData.velocities[i * 3 + 2] = p.vz || 0;
      }
    }
  }, [particles, particleData]);

  const vectorField = (x: number, y: number, z: number, time: number): THREE.Vector3 => {
    const vx = Math.sin(y * 0.5 + time * 0.1) * Math.cos(z * 0.3) * 0.5;
    const vy = Math.sin(z * 0.5 + time * 0.15) * Math.cos(x * 0.3) * 0.5;
    const vz = Math.sin(x * 0.5 + time * 0.05) * Math.cos(y * 0.3) * 0.5;
    return new THREE.Vector3(vx, vy, vz);
  };

  useFrame((_, delta) => {
    const effectiveTrailLength = Math.max(1, Math.floor(TRAIL_LENGTH * speedMultiplier));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const x = particleData.positions[ix];
      const y = particleData.positions[ix + 1];
      const z = particleData.positions[ix + 2];

      const field = vectorField(x, y, z, simulationTime);
      const vx = particleData.velocities[ix] + field.x;
      const vy = particleData.velocities[ix + 1] + field.y;
      const vz = particleData.velocities[ix + 2] + field.z;

      const moveSpeed = delta * speedMultiplier;
      particleData.positions[ix] += vx * moveSpeed;
      particleData.positions[ix + 1] += vy * moveSpeed;
      particleData.positions[ix + 2] += vz * moveSpeed;

      particleData.velocities[ix] *= 0.99;
      particleData.velocities[ix + 1] *= 0.99;
      particleData.velocities[ix + 2] *= 0.99;

      const bound = 15;
      if (Math.abs(particleData.positions[ix]) > bound) {
        particleData.positions[ix] = Math.sign(particleData.positions[ix]) * -bound * 0.9;
      }
      if (Math.abs(particleData.positions[ix + 1]) > bound) {
        particleData.positions[ix + 1] = Math.sign(particleData.positions[ix + 1]) * -bound * 0.9;
      }
      if (Math.abs(particleData.positions[ix + 2]) > bound) {
        particleData.positions[ix + 2] = Math.sign(particleData.positions[ix + 2]) * -bound * 0.9;
      }

      const radius = particleData.radii[i] * particleSize;
      dummy.position.set(
        particleData.positions[ix],
        particleData.positions[ix + 1],
        particleData.positions[ix + 2]
      );
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();

      if (instancedMeshRef.current) {
        instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
        instancedMeshRef.current.setColorAt(
          i,
          new THREE.Color(
            particleData.colors[ix],
            particleData.colors[ix + 1],
            particleData.colors[ix + 2]
          )
        );
      }

      const positions = trailPositionArrays[i];
      const colors = trailColorArrays[i];
      const geometry = lineGeometries[i];
      const trailPointCount = effectiveTrailLength + 1;

      for (let j = effectiveTrailLength; j > 0; j--) {
        positions[j * 3] = positions[(j - 1) * 3];
        positions[j * 3 + 1] = positions[(j - 1) * 3 + 1];
        positions[j * 3 + 2] = positions[(j - 1) * 3 + 2];
      }
      positions[0] = particleData.positions[ix];
      positions[1] = particleData.positions[ix + 1];
      positions[2] = particleData.positions[ix + 2];

      const r = particleData.colors[ix];
      const g = particleData.colors[ix + 1];
      const b = particleData.colors[ix + 2];

      for