import { useRef, useMemo, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { TreeParticles } from './TreeParticles';
import type { SeasonName, SeasonConfig } from '../utils/seasonConfig';
import { SEASON_CONFIGS, TREE_COUNT, PARTICLES_PER_TREE } from '../utils/seasonConfig';
import { lerp, lerpColor } from '../utils/interpolate';

interface SeasonForestProps {
  currentSeason: SeasonName;
  transitionProgress: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface TreeData {
  position: [number, number, number];
  height: number;
  seed: number;
}

interface RockData {
  position: [number, number, number];
  size: number;
  seed: number;
}

interface GrassData {
  position: [number, number, number];
  rotation: number;
  bladeCount: number;
  seed: number;
}

interface PathPoint {
  x: number;
  z: number;
}

function generateTrees(count: number): TreeData[] {
  const rand = seededRandom(42);
  const trees: TreeData[] = [];
  const minDist = 0.9;
  const pathWidth = 0.5;
  const pathPoints: PathPoint[] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    pathPoints.push({
      x: Math.sin(t * Math.PI * 2) * 1.8 + t * 3 - 1.5,
      z: -3 + t * 6,
    });
  }

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let pos: [number, number, number] = [0, 0, 0];
    let valid = false;
    while (attempts < 50 && !valid) {
      const x = (rand() - 0.5) * 9;
      const z = (rand() - 0.5) * 9;
      let nearPath = false;
      for (const pp of pathPoints) {
        if (Math.hypot(x - pp.x, z - pp.z) < minDist + pathWidth) {
          nearPath = true;
          break;
        }
      }
      if (nearPath) {
        attempts++;
        continue;
      }
      let tooClose = false;
      for (const t of trees) {
        if (Math.hypot(x - t.position[0], z - t.position[2]) < minDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        pos = [x, 0, z];
        valid = true;
      }
      attempts++;
    }
    trees.push({
      position: pos,
      height: 1.5 + rand() * 1.5,
      seed: Math.floor(rand() * 100000),
    });
  }
  return trees;
}

function generateRocks(count: number): RockData[] {
  const rand = seededRandom(1337);
  const rocks: RockData[] = [];
  for (let t = 0.05; t < 1; t += 1 / count) {
    const baseX = Math.sin(t * Math.PI * 2) * 1.8 + t * 3 - 1.5;
    const baseZ = -3 + t * 6;
    const offset = (rand() - 0.5) * 0.8;
    const side = rand() > 0.5 ? 1 : -1;
    rocks.push({
      position: [baseX + offset * side, 0, baseZ + (0.45 + Math.abs(offset)) * side],
      size: 0.2 + rand() * 0.3,
      seed: Math.floor(rand() * 100000),
    });
  }
  return rocks;
}

function generateGrass(count: number): GrassData[] {
  const rand = seededRandom(7777);
  const grasses: GrassData[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * 9;
    const z = (rand() - 0.5) * 9;
    grasses.push({
      position: [x, 0, z],
      rotation: rand() * Math.PI * 2,
      bladeCount: 3 + Math.floor(rand() * 3),
      seed: Math.floor(rand() * 100000),
    });
  }
  return grasses;
}

function generatePathGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  for (let t = 0; t <= 1; t += 0.02) {
    const x = Math.sin(t * Math.PI * 2) * 1.8 + t * 3 - 1.5;
    const z = -3 + t * 6;
    points.push(new THREE.Vector2(x, z));
  }
  const shape = new THREE.Shape();
  const halfWidth = 0.15;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.y - prev.y;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len * halfWidth;
    const nz = dx / len * halfWidth;
    if (i === 0) shape.moveTo(p.x + nx, p.y + nz);
    else shape.lineTo(p.x + nx, p.y + nz);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.y - prev.y;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len * halfWidth;
    const nz = dx / len * halfWidth;
    shape.lineTo(p.x - nx, p.y - nz);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.005, 0);
  return geo;
}

export function SeasonForest({ currentSeason, transitionProgress }: SeasonForestProps) {
  const { scene } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pathMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const angularVelRef = useRef(0);
  const lastAzimuthRef = useRef(0);
  const [rotVel, setRotVel] = useState(0);

  const targetConfig: SeasonConfig = SEASON_CONFIGS[currentSeason];

  const trees = useMemo(() => generateTrees(TREE_COUNT), []);
  const rocks = useMemo(() => generateRocks(16), []);
  const grasses = useMemo(() => generateGrass(60), []);
  const pathGeometry = useMemo(() => generatePathGeometry(), []);

  const prevSeasonRef = useRef<SeasonName>(currentSeason);
  useEffect(() => {
    prevSeasonRef.current = currentSeason;
  }, [currentSeason]);

  useEffect(() => {
    scene.background = new THREE.Color(targetConfig.skyColor);
  }, [scene, targetConfig.skyColor]);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      const az = controlsRef.current.getAzimuthalAngle();
      const vel = (az - lastAzimuthRef.current) / Math.max(delta, 0.001);
      angularVelRef.current = angularVelRef.current * 0.85 + vel * 0.15;
      lastAzimuthRef.current = az;
      setRotVel(angularVelRef.current);
    }

    if (groundMatRef.current) {
      const prevConfig = SEASON_CONFIGS[prevSeasonRef.current];
      const col = lerpColor(prevConfig.groundColor, targetConfig.groundColor, transitionProgress);
      groundMatRef.current.color.set(col);
    }
    if (ambientRef.current) {
      const prevConfig = SEASON_CONFIGS[prevSeasonRef.current];
      const intensity = lerp(prevConfig.ambientIntensity, targetConfig.ambientIntensity, transitionProgress);
      ambientRef.current.intensity = intensity;
    }
    void pathMatRef;
  });

  const parallax = rotVel * 0.1;

  return (
    <>
      <ambientLight ref={ambientRef} intensity={targetConfig.ambientIntensity} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.2} color="#ffd4a3" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12, 1, 1]} />
        <meshStandardMaterial ref={groundMatRef} color={targetConfig.groundColor} roughness={0.95} />
      </mesh>

      <mesh geometry={pathGeometry} position={[parallax * 0.02, 0, 0]}>
        <meshBasicMaterial ref={pathMatRef} color="#8b5a2b" />
      </mesh>

      {rocks.map((r, i) => (
        <mesh
          key={`rock-${i}`}
          position={[
            r.position[0] + Math.sin(r.seed) * parallax * 0.05,
            r.size * 0.4,
            r.position[2] + Math.cos(r.seed) * parallax * 0.05,
          ]}
          scale={r.size}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#8a8a8a"
            roughness={0.85}
            transparent
            opacity={0.82}
            flatShading
          />
        </mesh>
      ))}

      {grasses.map((g, i) => {
        const rand = seededRandom(g.seed);
        const blades = [];
        for (let b = 0; b < g.bladeCount; b++) {
          const bAngle = (b / g.bladeCount) * Math.PI + rand() * 0.4 - 0.2;
          const bHeight = 0.12 + rand() * 0.1;
          const bTilt = 0.25 + rand() * 0.25;
          blades.push(
            <mesh
              key={b}
              position={[
                Math.cos(bAngle) * 0.03,
                bHeight / 2,
                Math.sin(bAngle) * 0.03,
              ]}
              rotation={[0, 0, bTilt * (rand() > 0.5 ? 1 : -1)]}
            >
              <planeGeometry args={[0.02, bHeight]} />
              <meshBasicMaterial
                color={lerpColor('#6a8f3a', targetConfig.grassColor, transitionProgress)}
                side={THREE.DoubleSide}
                transparent
                opacity={0.9}
              />
            </mesh>,
          );
        }
        return (
          <group
            key={`grass-${i}`}
            position={[
              g.position[0] + Math.sin(g.seed * 0.01) * parallax * 0.03,
              0,
              g.position[2] + Math.cos(g.seed * 0.01) * parallax * 0.03,
            ]}
            rotation={[0, g.rotation, 0]}
          >
            {blades}
          </group>
        );
      })}

      {trees.map((t, i) => (
        <group
          key={`tree-grp-${i}`}
          position={[
            t.position[0] + Math.sin(t.seed) * parallax * 0.04,
            0,
            t.position[2] + Math.cos(t.seed) * parallax * 0.04,
          ]}
        >
          <TreeParticles
            position={[0, 0, 0]}
            height={t.height}
            particleCount={PARTICLES_PER_TREE}
            targetConfig={targetConfig}
            transitionProgress={transitionProgress}
            rotationAngularVel={rotVel}
            seed={t.seed}
          />
        </group>
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={3}
        maxDistance={6}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
