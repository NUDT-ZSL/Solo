import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ClimateVariable, ClimateData } from '../utils/dataLoader';
import { loadClimateData } from '../utils/dataLoader';

interface ParticleFieldProps {
  variable: ClimateVariable;
  month: number;
}

interface ParticleWorkerData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  velocities: Float32Array;
  latlons: Float32Array;
}

const PARTICLE_COUNT = 30000;

export default function ParticleField({ variable, month }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const workerRef = useRef<Worker | null>(null);
  const [workerData, setWorkerData] = useState<ParticleWorkerData | null>(null);
  const targetDataRef = useRef<ParticleWorkerData | null>(null);
  const currentDataRef = useRef<ParticleWorkerData | null>(null);
  const transitionRef = useRef(0);

  const targetPositions = useRef<Float32Array | null>(null);
  const targetColors = useRef<Float32Array | null>(null);

  const initialData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const latlons = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const lat = Math.acos(2 * v - 1) * (180 / Math.PI) - 90;
      const lon = u * 360 - 180;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 2.01;

      positions[i * 3] = -radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      colors[i * 3] = 0.5;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0.5;

      sizes[i] = 1 + Math.random() * 2;
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      latlons[i * 2] = lat;
      latlons[i * 2 + 1] = lon;
    }

    return { positions, colors, sizes, velocities, latlons };
  }, []);

  const latLonToCartesian = useCallback((lat: number, lon: number, radius: number): [number, number, number] => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return [
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    ];
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/particleWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<ParticleWorkerData | { error: string }>) => {
      if ('error' in e.data) {
        console.error('Worker error:', e.data.error);
        return;
      }
      targetDataRef.current = e.data;
      targetPositions.current = new Float32Array(e.data.positions);
      targetColors.current = new Float32Array(e.data.colors);
      transitionRef.current = 0;
      setWorkerData(e.data);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    const fetchAndProcess = async () => {
      try {
        const data: ClimateData = await loadClimateData(variable, month);
        if (workerRef.current) {
          workerRef.current.postMessage({
            records: data.records,
            variable,
            particleCount: PARTICLE_COUNT,
          });
        }
      } catch (error) {
        console.error('Failed to load climate data:', error);
      }
    };
    fetchAndProcess();
  }, [variable, month]);

  useEffect(() => {
    if (!pointsRef.current) return;
    const geometry = pointsRef.current.geometry;
    const data = workerData || initialData;

    if (!currentDataRef.current) {
      currentDataRef.current = {
        positions: new Float32Array(data.positions),
        colors: new Float32Array(data.colors),
        sizes: new Float32Array(data.sizes),
        velocities: new Float32Array(data.velocities),
        latlons: new Float32Array(data.latlons),
      };
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(currentDataRef.current.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(currentDataRef.current.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(currentDataRef.current.sizes, 1));
  }, [workerData, initialData]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !currentDataRef.current) return;

    const positions = currentDataRef.current.positions;
    const latlons = currentDataRef.current.latlons;
    const velocities = currentDataRef.current.velocities;
    const colors = currentDataRef.current.colors;

    const TRANSITION_SPEED = 2.0;
    if (targetDataRef.current && targetPositions.current && targetColors.current && transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + delta * TRANSITION_SPEED);
      const t = transitionRef.current;
      const easeT = t * t * (3 - 2 * t);

      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        const start = initialData.positions[i];
        const target = targetPositions.current[i];
        positions[i] = start + (target - start) * easeT;

        colors[i] = initialData.colors[i] + (targetColors.current[i] - initialData.colors[i]) * easeT;
      }

      if (t >= 1) {
        initialData.positions.set(targetPositions.current);
        initialData.colors.set(targetColors.current);
        currentDataRef.current.latlons.set(targetDataRef.current.latlons);
        currentDataRef.current.velocities.set(targetDataRef.current.velocities);
      }

      const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      return;
    }

    const speed = delta * 0.02;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let lat = latlons[i * 2];
      let lon = latlons[i * 2 + 1];

      lat += velocities[i * 3] * speed * 100;
      lon += velocities[i * 3 + 1] * speed * 100;

      if (lat > 90) lat = -90 + (lat - 90);
      if (lat < -90) lat = 90 + (lat + 90);
      if (lon > 180) lon = -180 + (lon - 180);
      if (lon < -180) lon = 180 + (lon + 180);

      latlons[i * 2] = lat;
      latlons[i * 2 + 1] = lon;

      const [x, y, z] = latLonToCartesian(lat, lon, 2.01);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={0.015}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
