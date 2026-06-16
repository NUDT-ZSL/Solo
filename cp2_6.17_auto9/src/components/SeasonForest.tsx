import { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { TreeParticles } from './TreeParticles';
import type { SeasonName, SeasonConfig } from '../utils/seasonConfig';
import { SEASON_CONFIGS, TREE_COUNT, PARTICLES_PER_TREE } from '../utils/seasonConfig';
import { lerp, lerpColor, hexToRgb } from '../utils/interpolate';

interface SeasonForestProps {
  currentSeason: SeasonName;
  previousSeason: SeasonName;
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
  baseY: number;
}

interface GrassData {
  position: [number, number, number];
  rotation: number;
  bladeCount: number;
  seed: number;
  blades: {
    angle: number;
    height: number;
    tilt: number;
    tiltDir: number;
  }[];
}

interface PathPoint {
  x: number;
  z: number;
}

function getPathPoints(): PathPoint[] {
  const pts: PathPoint[] = [];
  for (let t = 0; t <= 1; t += 0.02) {
    pts.push({
      x: Math.sin(t * Math.PI * 2) * 1.8 + t * 3 - 1.5,
      z: -3 + t * 6,
    });
  }
  return pts;
}

function generateTrees(count: number): TreeData[] {
  const rand = seededRandom(42);
  const trees: TreeData[] = [];
  const minDist = 0.9;
  const pathWidth = 0.5;
  const pathPoints = getPathPoints();

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
  const pathPoints = getPathPoints();

  for (let i = 0; i < count; i++) {
    const t = rand();
    const pathIdx = Math.min(
      pathPoints.length - 1,
      Math.floor(t * (pathPoints.length - 1)),
    );
    const pp = pathPoints[pathIdx];
    const nextPp = pathPoints[Math.min(pathPoints.length - 1, pathIdx + 1)];
    const dx = nextPp.x - pp.x;
    const dz = nextPp.z - pp.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const side = rand() > 0.5 ? 1 : -1;
    const offsetDist = 0.5 + rand() * 1.5;
    const alongOffset = (rand() - 0.5) * 0.6;

    const size = 0.2 + rand() * 0.3;

    rocks.push({
      position: [
        pp.x + dx * alongOffset + nx * offsetDist * side,
        0,
        pp.z + dz * alongOffset + nz * offsetDist * side,
      ],
      size,
      seed: Math.floor(rand() * 100000),
      baseY: size * 0.4,
    });
  }
  return rocks;
}

function generateGrass(count: number): GrassData[] {
  const rand = seededRandom(7777);
  const grasses: GrassData[] = [];
  const pathPoints = getPathPoints();

  for (let i = 0; i < count; i++) {
    let x: number, z: number;
    let attempts = 0;
    do {
      x = (rand() - 0.5) * 9;
      z = (rand() - 0.5) * 9;
      attempts++;
      let nearPath = false;
      for (const pp of pathPoints) {
        if (Math.hypot(x - pp.x, z - pp.z) < 0.5) {
          nearPath = true;
          break;
        }
      }
      if (!nearPath) break;
    } while (attempts < 10);

    const bladeCount = 3 + Math.floor(rand() * 3);
    const blades: GrassData['blades'] = [];
    for (let b = 0; b < bladeCount; b++) {
      blades.push({
        angle: (b / bladeCount) * Math.PI + rand() * 0.4 - 0.2,
        height: 0.12 + rand() * 0.1,
        tilt: 0.25 + rand() * 0.25,
        tiltDir: rand() > 0.5 ? 1 : -1,
      });
    }

    grasses.push({
      position: [x, 0, z],
      rotation: rand() * Math.PI * 2,
      bladeCount,
      seed: Math.floor(rand() * 100000),
      blades,
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

export function SeasonForest({
  currentSeason,
  previousSeason,
  transitionProgress,
}: SeasonForestProps) {
  const { scene } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pathMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const rotVelRef = useRef(0);
  const lastAzimuthRef = useRef<number | null>(null);
  const treesGroupRef = useRef<THREE.Group>(null);
  const rocksGroupRef = useRef<THREE.Group>(null);
  const grassesGroupRef = useRef<THREE.Group>(null);

  const targetConfig: SeasonConfig = SEASON_CONFIGS[currentSeason];
  const prevConfig: SeasonConfig = SEASON_CONFIGS[previousSeason];

  const trees = useMemo(() => generateTrees(TREE_COUNT), []);
  const rocks = useMemo(() => generateRocks(18), []);
  const grasses = useMemo(() => generateGrass(60), []);
  const pathGeometry = useMemo(() => generatePathGeometry(), []);

  const grassColorsRef = useRef<{ prev: THREE.Color; next: THREE.Color } | null>(null);

  useEffect(() => {
    grassColorsRef.current = {
      prev: new THREE.Color(prevConfig.grassColor),
      next: new THREE.Color(targetConfig.grassColor),
    };
  }, [prevConfig.grassColor, targetConfig.grassColor]);

  useEffect(() => {
    scene.background = new THREE.Color(prevConfig.skyColor);
  }, [scene, prevConfig.skyColor]);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      const az = controlsRef.current.getAzimuthalAngle();
      if (lastAzimuthRef.current !== null) {
        const vel = (az - lastAzimuthRef.current) / Math.max(delta, 0.001);
        rotVelRef.current = rotVelRef.current * 0.85 + vel * 0.15;
      }
      lastAzimuthRef.current = az;
    }

    const parallax = rotVelRef.current * 0.1;

    if (groundMatRef.current) {
      const col = lerpColor(prevConfig.groundColor, targetConfig.groundColor, transitionProgress);
      groundMatRef.current.color.set(col);
    }

    if (ambientRef.current) {
      const intensity = lerp(prevConfig.ambientIntensity, targetConfig.ambientIntensity, transitionProgress);
      ambientRef.current.intensity = intensity;
    }

    const skyColor = lerpColor(prevConfig.skyColor, targetConfig.skyColor, transitionProgress);
    scene.background = new THREE.Color(skyColor);

    if (rocksGroupRef.current) {
      for (let i = 0; i < rocksGroupRef.current.children.length; i++) {
        const child = rocksGroupRef.current.children[i];
        const r = rocks[i];
        if (!r) continue;
        child.position.x = r.position[0] + Math.sin(r.seed) * parallax * 0.05;
        child.position.z = r.position[2] + Math.cos(r.seed) * parallax * 0.05;
      }
    }

    if (grassesGroupRef.current) {
      for (let i = 0; i < grassesGroupRef.current.children.length; i++) {
        const child = grassesGroupRef.current.children[i];
        const g = grasses[i];
        if (!g) continue;
        child.position.x = g.position[0] + Math.sin(g.seed * 0.01) * parallax * 0.03;
        child.position.z = g.position[2] + Math.cos(g.seed * 0.01) * parallax * 0.03;
      }
    }

    if (treesGroupRef.current) {
      for (let i = 0; i < treesGroupRef.current.children.length; i++) {
        const child = treesGroupRef.current.children[i];
        const t = trees[i];
        if (!t) continue;
        child.position.x = t.position[0] + Math.sin(t.seed) * parallax * 0.04;
        child.position.z = t.position[2] + Math.cos(t.seed) * parallax * 0.04;
      }
    }

    void pathMatRef;
  });

  const lerpedGrassColor = lerpColor(prevConfig.grassColor, targetConfig.grassColor, transitionProgress);
  const [grassR, grassG, grassB] = hexToRgb(lerpedGrassColor);
  const grassColor3 = new THREE.Color(grassR / 255, grassG / 255, grassB / 255);

  return (
    <>
      <ambientLight ref={ambientRef} intensity={prevConfig.ambientIntensity} />
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
        <meshStandardMaterial ref={groundMatRef} color={prevConfig.groundColor} roughness={0.95} />
      </mesh>

      <mesh geometry={pathGeometry}>
        <meshBasicMaterial ref={pathMatRef} color="#8b5a2b" />
      </mesh>

      <group ref={rocksGroupRef}>
        {rocks.map((r, i) => (
          <mesh
            key={`rock-${i}`}
            position={[r.position[0], r.baseY, r.position[2]]}
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
      </group>

      <group ref={grassesGroupRef}>
        {grasses.map((g, i) => (
          <group
            key={`grass-${i}`}
            position={g.position}
            rotation={[0, g.rotation, 0]}
          >
            {g.blades.map((b, bi) => (
              <mesh
                key={bi}
                position={[
                  Math.cos(b.angle) * 0.03,
                  b.height / 2,
                  Math.sin(b.angle) * 0.03,
                ]}
                rotation={[0, 0, b.tilt * b.tiltDir]}
              >
                <planeGeometry args={[0.02, b.height]} />
                <meshBasicMaterial
                  color={grassColor3}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      <group ref={treesGroupRef}>
        {trees.map((t, i) => (
          <group key={`tree-grp-${i}`} position={t.position}>
            <TreeParticles
              position={[0, 0, 0]}
              height={t.height}
              particleCount={PARTICLES_PER_TREE}
              prevConfig={prevConfig}
              targetConfig={targetConfig}
              transitionProgress={transitionProgress}
              rotVelRef={rotVelRef}
              seed={t.seed}
            />
          </group>
        ))}
      </group>

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
