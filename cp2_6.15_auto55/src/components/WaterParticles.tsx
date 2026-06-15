import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '@/store';

const PARTICLE_COUNT = 1500;
const BASE_TRAIL_LENGTH = 5;
const MAX_TRAIL_LENGTH = 30;
const COLOR_START = new THREE.Color('#64b5f6');
const COLOR_END = new THREE.Color('#1e88e5');

const BOUND_X = 20;
const BOUND_Y_MIN = -20;
const BOUND_Y_MAX = 0;
const BOUND_Z = 15;

function vectorField(x: number, y: number, z: number, time: number): THREE.Vector3 {
  const vx = Math.sin(y * 0.3 + time * 0.1) * Math.cos(z * 0.2) * 1.2
    + Math.sin(x * 0.1 + z * 0.15) * 0.5;
  const vy = (Math.sin(x * 0.2 + time * 0.08) * Math.cos(z * 0.25) - 0.3) * 0.3;
  const vz = Math.sin(x * 0.25 + time * 0.12) * Math.cos(y * 0.2) * 1.0
    + Math.cos(y * 0.15 + z * 0.1) * 0.4;
  return new THREE.Vector3(vx, vy, vz);
}

function wrapParticle(positions: Float32Array, ix: number) {
  let x = positions[ix];
  let y = positions[ix + 1];
  let z = positions[ix + 2];

  if (x > BOUND_X) x = -BOUND_X + (x - BOUND_X);
  else if (x < -BOUND_X) x = BOUND_X + (x + BOUND_X);

  if (y > BOUND_Y_MAX) y = BOUND_Y_MIN + (y - BOUND_Y_MAX);
  else if (y < BOUND_Y_MIN) y = BOUND_Y_MAX + (y - BOUND_Y_MIN);

  if (z > BOUND_Z) z = -BOUND_Z + (z - BOUND_Z);
  else if (z < -BOUND_Z) z = BOUND_Z + (z + BOUND_Z);

  positions[ix] = x;
  positions[ix + 1] = y;
  positions[ix + 2] = z;
}

export default function WaterParticles() {
  const particleSizeRef = useRef(useStore.getState().particleSize);
  const speedMultiplierRef = useRef(useStore.getState().speedMultiplier);
  const simulationTimeRef = useRef(useStore.getState().simulationTime);

  useStore.subscribe((state) => {
    particleSizeRef.current = state.particleSize;
    speedMultiplierRef.current = state.speedMultiplier;
    simulationTimeRef.current = state.simulationTime;
  });

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const dataRef = useRef<{
    positions: Float32Array;
    radii: Float32Array;
    colors: Float32Array;
    trailPositions: Float32Array[];
    trailColors: Float32Array[];
    trailHeads: Int32Array;
    lineGeometries: THREE.BufferGeometry[];
    lineMaterials: THREE.LineBasicMaterial[];
    lines: THREE.Line[];
  } | null>(null);

  if (dataRef.current === null) {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const radii = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const trailPositions: Float32Array[] = [];
    const trailColors: Float32Array[] = [];
    const trailHeads = new Int32Array(PARTICLE_COUNT);
    const lineGeometries: THREE.BufferGeometry[] = [];
    const lineMaterials: THREE.LineBasicMaterial[] = [];
    const lines: THREE.Line[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      positions[ix] = (Math.random() - 0.5) * 2 * BOUND_X;
      positions[ix + 1] = BOUND_Y_MIN + Math.random() * (BOUND_Y_MAX - BOUND_Y_MIN);
      positions[ix + 2] = (Math.random() - 0.5) * 2 * BOUND_Z;

      radii[i] = 0.1 + Math.random() * 0.1;

      const t = Math.random();
      const color = COLOR_START.clone().lerp(COLOR_END, t);
      colors[ix] = color.r;
      colors[ix + 1] = color.g;
      colors[ix + 2] = color.b;

      const trailPos = new Float32Array(MAX_TRAIL_LENGTH * 3);
      const trailCol = new Float32Array(MAX_TRAIL_LENGTH * 4);
      for (let j = 0; j < MAX_TRAIL_LENGTH; j++) {
        trailPos[j * 3] = positions[ix];
        trailPos[j * 3 + 1] = positions[ix + 1];
        trailPos[j * 3 + 2] = positions[ix + 2];
      }
      trailPositions.push(trailPos);
      trailColors.push(trailCol);
      trailHeads[i] = 0;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(trailCol, 4));
      geometry.setDrawRange(0, BASE_TRAIL_LENGTH);
      lineGeometries.push(geometry);

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
      });
      lineMaterials.push(material);

      lines.push(new THREE.Line(geometry, material));
    }

    dataRef.current = {
      positions,
      radii,
      colors,
      trailPositions,
      trailColors,
      trailHeads,
      lineGeometries,
      lineMaterials,
      lines,
    };
  }

  const data = dataRef.current;

  useFrame((_, delta) => {
    if (!instancedMeshRef.current || !data) return;

    const speedMultiplier = speedMultiplierRef.current;
    const simulationTime = simulationTimeRef.current;
    const particleSize = particleSizeRef.current;
    const effectiveTrailLength = Math.max(1, Math.min(MAX_TRAIL_LENGTH, Math.floor(BASE_TRAIL_LENGTH * speedMultiplier)));
    const moveStep = delta * speedMultiplier;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const x = data.positions[ix];
      const y = data.positions[ix + 1];
      const z = data.positions[ix + 2];

      const field = vectorField(x, y, z, simulationTime);
      data.positions[ix] += field.x * moveStep;
      data.positions[ix + 1] += field.y * moveStep;
      data.positions[ix + 2] += field.z * moveStep;

      wrapParticle(data.positions, ix);

      const radius = data.radii[i] * particleSize;
      dummy.position.set(data.positions[ix], data.positions[ix + 1], data.positions[ix + 2]);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix);

      tempColor.setRGB(data.colors[ix], data.colors[ix + 1], data.colors[ix + 2]);
      instancedMeshRef.current.setColorAt(i, tempColor);

      const trailPos = data.trailPositions[i];
      const trailCol = data.trailColors[i];
      const geometry = data.lineGeometries[i];
      let head = data.trailHeads[i];

      head = (head + 1) % MAX_TRAIL_LENGTH;
      data.trailHeads[i] = head;

      trailPos[head * 3] = data.positions[ix];
      trailPos[head * 3 + 1] = data.positions[ix + 1];
      trailPos[head * 3 + 2] = data.positions[ix + 2];

      const r = data.colors[ix];
      const g = data.colors[ix + 1];
      const b = data.colors[ix + 2];

      for (let j = 0; j < effectiveTrailLength; j++) {
        const idx = (head - j + MAX_TRAIL_LENGTH) % MAX_TRAIL_LENGTH;
        const alpha = 0.6 * (1 - j / effectiveTrailLength);
        trailCol[idx * 4] = r;
        trailCol[idx * 4 + 1] = g;
        trailCol[idx * 4 + 2] = b;
        trailCol[idx * 4 + 3] = alpha;
      }

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = geometry.attributes.color as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      geometry.setDrawRange(0, effectiveTrailLength);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (instancedMeshRef.current.instanceColor) {
      instancedMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const instancedMaterial = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: false }), []);

  return (
    <group>
      <instancedMesh
        ref={instancedMeshRef}
        args={[sphereGeometry, instancedMaterial, PARTICLE_COUNT]}
      />
      {data.lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}
