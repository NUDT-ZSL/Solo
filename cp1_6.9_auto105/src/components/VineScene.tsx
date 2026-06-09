import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Seed as SeedType, Vine as VineType, CollisionEvent,
  SplitParticle, TrailParticle, GridFlash, VineNode
} from '../utils/vineUtils';
import { getAnimationProgress, easeOutCubic, easeOutQuad, GRID_SIZE, SEED_RADIUS, HALO_DURATION } from '../utils/vineUtils';

interface VineSceneProps {
  seeds: SeedType[];
  vines: VineType[];
  collisions: CollisionEvent[];
  splitParticles: SplitParticle[];
  trailParticles: TrailParticle[];
  gridFlash: GridFlash | null;
  sunPosition: THREE.Vector3;
  onPlaceSeed: (x: number, z: number) => void;
  onSplitNode: (nodeId: string) => void;
}

const CAMERA_POSITION = new THREE.Vector3(0, 42.4, 42.4);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

function GroundGrid({ onPlaceSeed, gridFlash }: { onPlaceSeed: (x: number, z: number) => void; gridFlash: GridFlash | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const gridHelperRef = useRef<THREE.GridHelper>(null);
  const [now, setNow] = useState(performance.now() / 1000);

  useFrame(() => {
    setNow(performance.now() / 1000);
  });

  const flashOpacity = useMemo(() => {
    if (!gridFlash) return 0;
    const progress = getAnimationProgress(gridFlash.startTime, gridFlash.duration, now);
    return (1 - easeOutQuad(progress)) * 0.5;
  }, [gridFlash, now]);

  const divisions = 30;
  const gridLines = useMemo(() => {
    const points: THREE.Vector3[][] = [];
    const step = GRID_SIZE / divisions;
    const half = GRID_SIZE / 2;

    for (let i = 0; i <= divisions; i++) {
      const p = -half + i * step;
      points.push([
        new THREE.Vector3(-half, 0.01, p),
        new THREE.Vector3(half, 0.01, p)
      ]);
      points.push([
        new THREE.Vector3(p, 0.01, -half),
        new THREE.Vector3(p, 0.01, half)
      ]);
    }
    return points;
  }, []);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const point = e.point;
    const clampedX = Math.max(-GRID_SIZE / 2, Math.min(GRID_SIZE / 2, point.x));
    const clampedZ = Math.max(-GRID_SIZE / 2, Math.min(GRID_SIZE / 2, point.z));
    onPlaceSeed(clampedX, clampedZ);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleClick}
        receiveShadow
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {gridLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry
            attach="geometry"
            onUpdate={(geometry) => {
              const positions = new Float32Array([
                line[0].x, line[0].y, line[0].z,
                line[1].x, line[1].y, line[1].z
              ]);
              geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            }}
          />
          <lineBasicMaterial
            transparent
            color={flashOpacity > 0 ? '#ffffff' : '#00ffff'}
            opacity={flashOpacity > 0 ? 0.15 + flashOpacity : 0.15}
          />
        </line>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshBasicMaterial
          transparent
          color="#ffffff"
          opacity={flashOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SeedMesh({ seed, onClick }: { seed: SeedType; onClick?: () => void }) {
  const [scale, setScale] = useState(0);
  const now = performance.now() / 1000;
  const growProgress = Math.min(1, (now - seed.plantedAt) * 3);

  useFrame(() => {
    setScale(easeOutCubic(growProgress));
  });

  return (
    <mesh
      position={[seed.position.x, seed.position.y + SEED_RADIUS * scale, seed.position.z]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <sphereGeometry args={[SEED_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={seed.color}
        emissive={seed.color}
        emissiveIntensity={0.3}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function VineSegmentInstances({ vines, onNodeClick }: { vines: VineType[]; onNodeClick: (nodeId: string) => void }) {
  const segmentsRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const nodeIdMap = useRef<string[]>([]);

  const { allSegments, allNodes, nodeIds } = useMemo(() => {
    const segments: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3; color: THREE.Color }[] = [];
    const nodes: { position: THREE.Vector3; radius: number; color: THREE.Color; id: string }[] = [];
    const ids: string[] = [];

    for (const vine of vines) {
      for (let i = 1; i < vine.nodes.length; i++) {
        const prevNode = vine.nodes[i - 1];
        const currNode = vine.nodes[i];

        const start = prevNode.position;
        const end = currNode.position;
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();

        if (length < 0.001) continue;

        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const avgRadius = (prevNode.radius + currNode.radius) / 2;
        const avgColor = prevNode.color.clone().lerp(currNode.color, 0.5);

        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const dirNormalized = direction.clone().normalize();
        if (dirNormalized.dot(up) < 0.999) {
          const axis = new THREE.Vector3().crossVectors(up, dirNormalized).normalize();
          const angle = Math.acos(up.dot(dirNormalized));
          quaternion.setFromAxisAngle(axis, angle);
        }

        segments.push({
          position: midPoint,
          quaternion,
          scale: new THREE.Vector3(avgRadius, length, avgRadius),
          color: avgColor
        });
      }

      for (let n = 0; n < vine.nodes.length; n++) {
        const node = vine.nodes[n];
        nodes.push({
          position: node.position,
          radius: Math.max(0.3, node.radius * 1.2),
          color: node.color,
          id: node.id
        });
        ids.push(node.id);
      }
    }

    return { allSegments: segments, allNodes: nodes, nodeIds: ids };
  }, [vines]);

  nodeIdMap.current = nodeIds;

  useFrame(() => {
    if (segmentsRef.current) {
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

      for (let i = 0; i < segmentsRef.current.count; i++) {
        if (i < allSegments.length) {
          const seg = allSegments[i];
          dummy.position.copy(seg.position);
          dummy.quaternion.copy(seg.quaternion);
          dummy.scale.copy(seg.scale);
          dummy.updateMatrix();
          segmentsRef.current.setMatrixAt(i, dummy.matrix);
          segmentsRef.current.setColorAt(i, color.copy(seg.color));
        } else {
          segmentsRef.current.setMatrixAt(i, zeroMatrix);
        }
      }
      segmentsRef.current.instanceMatrix.needsUpdate = true;
      if (segmentsRef.current.instanceColor) {
        segmentsRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (nodesRef.current) {
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

      for (let i = 0; i < nodesRef.current.count; i++) {
        if (i < allNodes.length) {
          const node = allNodes[i];
          dummy.position.copy(node.position);
          dummy.scale.setScalar(node.radius);
          dummy.updateMatrix();
          nodesRef.current.setMatrixAt(i, dummy.matrix);
          nodesRef.current.setColorAt(i, color.copy(node.color));
        } else {
          nodesRef.current.setMatrixAt(i, zeroMatrix);
        }
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
      if (nodesRef.current.instanceColor) {
        nodesRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  const handleNodeClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && instanceId < nodeIdMap.current.length) {
      onNodeClick(nodeIdMap.current[instanceId]);
    }
  };

  const maxSegments = 5000;
  const maxNodes = 6000;

  return (
    <group>
      <instancedMesh
        ref={segmentsRef}
        args={[undefined, undefined, Math.max(1, allSegments.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial
          roughness={0.6}
          metalness={0.1}
        />
      </instancedMesh>

      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, Math.max(1, allNodes.length)]}
        frustumCulled={false}
        onClick={handleNodeClick}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          roughness={0.5}
          metalness={0.1}
          emissiveIntensity={0.2}
        />
      </instancedMesh>
    </group>
  );
}

function CollisionHalos({ collisions }: { collisions: CollisionEvent[] }) {
  const [now, setNow] = useState(performance.now() / 1000);

  useFrame(() => {
    setNow(performance.now() / 1000);
  });

  return (
    <group>
      {collisions.map((c) => {
        const progress = getAnimationProgress(c.startTime, HALO_DURATION, now);
        const opacity = (1 - easeOutQuad(progress)) * 0.7;
        if (opacity <= 0) return null;

        const midPoint = new THREE.Vector3().addVectors(c.positionA, c.positionB).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(c.positionB, c.positionA);
        const length = direction.length();

        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const dirNormalized = direction.clone().normalize();
        if (dirNormalized.dot(up) < 0.999) {
          const axis = new THREE.Vector3().crossVectors(up, dirNormalized).normalize();
          const angle = Math.acos(up.dot(dirNormalized));
          quaternion.setFromAxisAngle(axis, angle);
        }

        return (
          <mesh
            key={c.id}
            position={midPoint}
            quaternion={quaternion}
            scale={new THREE.Vector3(2, length, 2)}
          >
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshBasicMaterial
              transparent
              color="#ffffff"
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function SplitParticlesMesh({ particles }: { particles: SplitParticle[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [now, setNow] = useState(performance.now() / 1000);

  useFrame(() => {
    setNow(performance.now() / 1000);
    if (!ref.current) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let i = 0; i < ref.current.count; i++) {
      if (i < particles.length) {
        const p = particles[i];
        const progress = getAnimationProgress(p.startTime, p.duration, now);
        const opacity = 1 - easeOutCubic(progress);
        const scale = p.radius * (1 + progress * 0.5);

        dummy.position.copy(p.position);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);

        const col = p.color.clone();
        col.multiplyScalar(0.5 + opacity * 0.5);
        ref.current.setColorAt(i, col);
      } else {
        ref.current.setMatrixAt(i, zeroMatrix);
      }
    }

    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) {
      ref.current.instanceColor.needsUpdate = true;
    }
  });

  if (particles.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, particles.length)]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.9} depthWrite={false} />
    </instancedMesh>
  );
}

function TrailParticlesMesh({ particles }: { particles: TrailParticle[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [now, setNow] = useState(performance.now() / 1000);

  useFrame(() => {
    setNow(performance.now() / 1000);
    if (!ref.current) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let i = 0; i < ref.current.count; i++) {
      if (i < particles.length) {
        const p = particles[i];
        const progress = getAnimationProgress(p.startTime, p.duration, now);
        const opacity = 1 - easeOutCubic(progress);
        const scale = p.radius * (1 + progress * 0.3);

        dummy.position.copy(p.position);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
        ref.current.setColorAt(i, color.copy(p.color).multiplyScalar(0.6 + opacity * 0.4));
      } else {
        ref.current.setMatrixAt(i, zeroMatrix);
      }
    }

    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) {
      ref.current.instanceColor.needsUpdate = true;
    }
  });

  if (particles.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, particles.length)]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.6} depthWrite={false} />
    </instancedMesh>
  );
}

function SunLight({ position }: { position: THREE.Vector3 }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(position);
    }
    if (meshRef.current) {
      meshRef.current.position.copy(position);
    }
  });

  return (
    <group>
      <directionalLight
        ref={lightRef}
        intensity={1.2}
        color="#FFF5E0"
        castShadow
      />
      <ambientLight intensity={0.3} color="#8888FF" />
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#FFEE88" />
      </mesh>
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && controlsRef.current) {
        controlsRef.current.target.copy(CAMERA_TARGET);
        controlsRef.current.object.position.copy(CAMERA_POSITION);
        controlsRef.current.update();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={150}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      target={CAMERA_TARGET}
    />
  );
}

export default function VineScene({
  seeds,
  vines,
  collisions,
  splitParticles,
  trailParticles,
  gridFlash,
  sunPosition,
  onPlaceSeed,
  onSplitNode
}: VineSceneProps) {
  return (
    <Canvas
      camera={{
        position: CAMERA_POSITION,
        fov: 60,
        near: 0.1,
        far: 1000
      }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    >
      <color attach="background" args={['#0A0A2E']} />
      <fog attach="fog" args={['#0A0A2E', 80, 200]} />

      <CameraController />
      <SunLight position={sunPosition} />
      <GroundGrid onPlaceSeed={onPlaceSeed} gridFlash={gridFlash} />

      {seeds.map(seed => (
        <SeedMesh
          key={seed.id}
          seed={seed}
          onClick={() => {
            const clampedX = Math.max(-GRID_SIZE / 2, Math.min(GRID_SIZE / 2, seed.position.x));
            const clampedZ = Math.max(-GRID_SIZE / 2, Math.min(GRID_SIZE / 2, seed.position.z));
            onPlaceSeed(clampedX, clampedZ);
          }}
        />
      ))}

      <VineSegmentInstances vines={vines} onNodeClick={onSplitNode} />
      <CollisionHalos collisions={collisions} />
      <SplitParticlesMesh particles={splitParticles} />
      <TrailParticlesMesh particles={trailParticles} />
    </Canvas>
  );
}
