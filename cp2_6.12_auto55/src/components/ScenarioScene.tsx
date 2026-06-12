import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { WeatherPoint } from '../services/dataService';

const TERRAIN_SIZE = 200;
const TERRAIN_SEGMENTS = 50;
const CHUNK_SIZE = 10;
const CHUNK_GRID = Math.ceil(TERRAIN_SEGMENTS / CHUNK_SIZE);

function getTerrainHeight(x: number, z: number, seed: number): number {
  const nx = x / TERRAIN_SIZE;
  const nz = z / TERRAIN_SIZE;

  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  const smoothNoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const a = noise(ix, iy);
    const b = noise(ix + 1, iy);
    const c = noise(ix, iy + 1);
    const d = noise(ix + 1, iy + 1);

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  };

  let height = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < 5; i++) {
    height += smoothNoise(nx * frequency * 8, nz * frequency * 8) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return (height / maxValue) * 30 - 5;
}

function getHeightColor(height: number): THREE.Color {
  const color = new THREE.Color();
  const t = Math.max(0, Math.min(1, (height + 5) / 30));

  if (t < 0.3) {
    color.setHSL(0.3, 0.7, 0.4 + t * 0.1);
  } else if (t < 0.6) {
    const lt = (t - 0.3) / 0.3;
    color.setHSL(0.3 - lt * 0.1, 0.6 - lt * 0.2, 0.5 - lt * 0.1);
  } else if (t < 0.85) {
    const lt = (t - 0.6) / 0.25;
    color.setHSL(0.08 - lt * 0.05, 0.5 - lt * 0.3, 0.4 - lt * 0.15);
  } else {
    const lt = (t - 0.85) / 0.15;
    color.setHSL(0, 0, 0.7 + lt * 0.3);
  }

  return color;
}

function getTemperatureColor(temp: number): THREE.Color {
  const color = new THREE.Color();
  const t = Math.max(0, Math.min(1, (temp + 10) / 55));

  if (t < 0.2) {
    color.setHSL(0.6, 0.8, 0.5 + t * 0.2);
  } else if (t < 0.4) {
    const lt = (t - 0.2) / 0.2;
    color.setHSL(0.6 - lt * 0.2, 0.8, 0.5);
  } else if (t < 0.6) {
    const lt = (t - 0.4) / 0.2;
    color.setHSL(0.4 - lt * 0.1, 0.8, 0.5);
  } else if (t < 0.8) {
    const lt = (t - 0.6) / 0.2;
    color.setHSL(0.3 - lt * 0.2, 0.8, 0.5);
  } else {
    const lt = (t - 0.8) / 0.2;
    color.setHSL(0.1 - lt * 0.05, 0.8, 0.5 + lt * 0.1);
  }

  return color;
}

interface TerrainChunkProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  delay: number;
}

function TerrainChunk({ chunkX, chunkZ, seed, delay }: TerrainChunkProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(false);
  const animationStart = useRef(0);
  const basePositions = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const segments = CHUNK_SIZE;
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE / CHUNK_GRID, TERRAIN_SIZE / CHUNK_GRID, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    const offsetX = (chunkX - CHUNK_GRID / 2 + 0.5) * (TERRAIN_SIZE / CHUNK_GRID);
    const offsetZ = (chunkZ - CHUNK_GRID / 2 + 0.5) * (TERRAIN_SIZE / CHUNK_GRID);

    for (let i = 0; i < positions.length; i += 3) {
      const worldX = positions[i] + offsetX;
      const worldZ = positions[i + 2] + offsetZ;
      const height = getTerrainHeight(worldX, worldZ, seed);
      positions[i + 1] = height;

      const color = getHeightColor(height);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [chunkX, chunkZ, seed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      animationStart.current = performance.now() / 1000;
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [delay]);

  useFrame((state, delta) => {
    if (!meshRef.current || !visible) return;

    const elapsed = performance.now() / 1000 - animationStart.current;
    const duration = 0.5;

    if (elapsed < duration) {
      const t = Math.min(1, elapsed / duration);
      const easeT = 1 - Math.pow(1 - t, 3);
      meshRef.current.position.y = -5 + 5 * easeT;
      meshRef.current.scale.setScalar(0.5 + 0.5 * easeT);
    } else {
      meshRef.current.position.y = 0;
      meshRef.current.scale.setScalar(1);
    }
  });

  const posX = (chunkX - CHUNK_GRID / 2 + 0.5) * (TERRAIN_SIZE / CHUNK_GRID);
  const posZ = (chunkZ - CHUNK_GRID / 2 + 0.5) * (TERRAIN_SIZE / CHUNK_GRID);

  return (
    <mesh ref={meshRef} position={[posX, -5, posZ]} visible={visible} receiveShadow castShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial vertexColors flatShading={false} roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

interface TemperatureBallsProps {
  points: WeatherPoint[];
  visible: boolean;
}

function TemperatureBalls({ points, visible }: TemperatureBallsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const opacityRef = useRef(0);

  const count = points.length;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetOpacity = visible ? 0.8 : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * delta * 3;

    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    if (material.opacity !== undefined) {
      material.opacity = opacityRef.current;
    }
    meshRef.current.visible = opacityRef.current > 0.01;

    for (let i = 0; i < count; i++) {
      const point = points[i];
      if (!point) continue;

      const baseHeight = getTerrainHeight(point.x, point.y, 42) + 5;
      const height = baseHeight + 3 + (point.temperature + 10) * 0.3;
      const size = 0.5 + (point.temperature + 10) * 0.03;

      dummy.position.set(point.x, height, point.y);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, getTemperatureColor(point.temperature));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} visible={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial transparent opacity={0} emissiveIntensity={0.3} roughness={0.5} />
    </instancedMesh>
  );
}

interface WindStreamlinesProps {
  points: WeatherPoint[];
  visible: boolean;
}

function WindStreamlines({ points, visible }: WindStreamlinesProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const opacityRef = useRef(0);
  const timeRef = useRef(0);

  const { positions, colors } = useMemo(() => {
    const lineCount = points.length;
    const positions = new Float32Array(lineCount * 6);
    const colors = new Float32Array(lineCount * 6);
    return { positions, colors };
  }, [points.length]);

  useFrame((state, delta) => {
    if (!linesRef.current) return;

    const targetOpacity = visible ? 0.6 : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * delta * 3;

    const material = linesRef.current.material as THREE.LineBasicMaterial;
    material.opacity = opacityRef.current;
    linesRef.current.visible = opacityRef.current > 0.01;

    timeRef.current += delta;

    const posArray = linesRef.current.geometry.attributes.position.array as Float32Array;
    const colArray = linesRef.current.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;

      const baseHeight = getTerrainHeight(point.x, point.y, 42) + 5;
      const height = baseHeight + 8;

      const dirRad = (point.windDirection * Math.PI) / 180;
      const speedFactor = point.windSpeed / 30;
      const length = 3 + speedFactor * 8;

      const flowOffset = (timeRef.current * point.windSpeed * 0.5) % length;
      const startX = point.x - Math.cos(dirRad) * (flowOffset);
      const startZ = point.y - Math.sin(dirRad) * (flowOffset);
      const endX = startX + Math.cos(dirRad) * length;
      const endZ = startZ + Math.sin(dirRad) * length;

      const idx = i * 6;
      posArray[idx] = startX;
      posArray[idx + 1] = height;
      posArray[idx + 2] = startZ;
      posArray[idx + 3] = endX;
      posArray[idx + 4] = height;
      posArray[idx + 5] = endZ;

      const alpha = 0.3 + speedFactor * 0.7;
      colArray[idx] = 1;
      colArray[idx + 1] = 1;
      colArray[idx + 2] = 1;
      colArray[idx + 3] = 1;
      colArray[idx + 4] = 1;
      colArray[idx + 5] = 1;
    }

    linesRef.current.geometry.attributes.position.needsUpdate = true;
    linesRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length * 2}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={points.length * 2}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial transparent opacity={0} vertexColors />
    </lineSegments>
  );
}

interface PrecipitationParticlesProps {
  points: WeatherPoint[];
  visible: boolean;
}

function PrecipitationParticles({ points, visible }: PrecipitationParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const opacityRef = useRef(0);
  const timeRef = useRef(0);
  const particleCount = 500;

  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.9;
      positions[idx + 1] = Math.random() * 50 + 5;
      positions[idx + 2] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.9;

      velocities[i] = 5 + Math.random() * 15;

      colors[idx] = 0.4;
      colors[idx + 1] = 0.6;
      colors[idx + 2] = 1;
    }

    return { positions, velocities, colors };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const targetOpacity = visible ? 0.7 : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * delta * 3;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = opacityRef.current;
    pointsRef.current.visible = opacityRef.current > 0.01;

    timeRef.current += delta;

    const avgPrecipitation = points.reduce((sum, p) => sum + p.precipitation, 0) / Math.max(1, points.length);
    const precipFactor = Math.min(1, avgPrecipitation / 50);

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colArray = pointsRef.current.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const speed = particleData.velocities[i] * (0.5 + precipFactor * 1.5);

      posArray[idx + 1] -= speed * delta;

      const terrainHeight = getTerrainHeight(posArray[idx], posArray[idx + 2], 42) + 5;

      if (posArray[idx + 1] < terrainHeight) {
        posArray[idx + 1] = 40 + Math.random() * 20;
        posArray[idx] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.9;
        posArray[idx + 2] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.9;
      }

      const alpha = 0.3 + precipFactor * 0.7;
      colArray[idx] = 0.4 * alpha;
      colArray[idx + 1] = 0.6 * alpha;
      colArray[idx + 2] = 1 * alpha;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    material.size = 0.3 + precipFactor * 0.5;
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particleData.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        transparent
        opacity={0}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function ScenarioScene() {
  const { currentCity, interpolatedPoints, showTemperature, showWind, showPrecipitation } = useAppStore();
  const controlsRef = useRef<any>(null);

  const seed = useMemo(() => {
    if (!currentCity) return 42;
    let hash = 0;
    for (let i = 0; i < currentCity.id.length; i++) {
      hash = ((hash << 5) - hash) + currentCity.id.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }, [currentCity]);

  const chunks = useMemo(() => {
    const chunkList: { x: number; z: number; distance: number }[] = [];
    const center = CHUNK_GRID / 2 - 0.5;

    for (let x = 0; x < CHUNK_GRID; x++) {
      for (let z = 0; z < CHUNK_GRID; z++) {
        const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(z - center, 2));
        chunkList.push({ x, z, distance });
      }
    }

    chunkList.sort((a, b) => a.distance - b.distance);
    return chunkList;
  }, []);

  useFrame((state, delta) => {
    if (controlsRef.current) {
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.92;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 80, 50]} intensity={0.8} castShadow />
      <hemisphereLight args={['#88ccff', '#224466', 0.4]} />

      <fog attach="fog" args={['#0a1628', 150, 350]} />

      {chunks.map((chunk, index) => (
        <TerrainChunk
          key={`${chunk.x}-${chunk.z}-${seed}`}
          chunkX={chunk.x}
          chunkZ={chunk.z}
          seed={seed}
          delay={index * 0.05}
        />
      ))}

      {interpolatedPoints.length > 0 && (
        <>
          <TemperatureBalls points={interpolatedPoints} visible={showTemperature} />
          <WindStreamlines points={interpolatedPoints} visible={showWind} />
          <PrecipitationParticles points={interpolatedPoints} visible={showPrecipitation} />
        </>
      )}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={20}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.2}
        makeDefault
      />
    </>
  );
}
