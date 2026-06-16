import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { CausticSpot, Vector3, RaySegment } from '../types/physicsTypes';
import { useLightSimulation } from '../hooks/useLightSimulation';

const WaterSurface: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const timeRef = useRef(0);
  const originalPositions = useRef<Float32Array | null>(null);

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (!meshRef.current || !geometryRef.current) return;
    const positions = geometryRef.current.attributes.position;
    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(positions.array);
    }

    const positionsArr = positions.array as Float32Array;
    const origArr = originalPositions.current;
    const t = timeRef.current;

    for (let i = 0; i < positions.count; i++) {
      const x = origArr[i * 3];
      const z = origArr[i * 3 + 2];

      const amp1 = 0.02 + Math.sin(x * 0.5 + z * 0.3) * 0.015;
      const amp2 = 0.015 + Math.cos(x * 0.3 - z * 0.7) * 0.01;
      const amp3 = 0.01 + Math.sin(x * 1.1 + z * 0.9 + t) * 0.005;
      const totalAmp = Math.min(Math.max(amp1 + amp2 + amp3, 0.02), 0.05);

      const freq1 = 0.5 + Math.sin(t * 0.3) * 0.2;
      const freq2 = 0.8 + Math.cos(t * 0.5) * 0.3;
      const freq3 = 1.2 + Math.sin(t * 0.7) * 0.3;

      const wave1 = Math.sin(x * 1.5 + t * freq1 * Math.PI * 2) * Math.cos(z * 1.2 + t * freq1 * 0.7);
      const wave2 = Math.sin(x * 0.8 - z * 1.5 + t * freq2 * Math.PI * 2) * 0.6;
      const wave3 = Math.cos(x * 2.0 + z * 0.5 - t * freq3 * Math.PI * 2) * 0.4;

      positionsArr[i * 3 + 1] = (wave1 + wave2 + wave3) * totalAmp;
    }

    positions.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
    geometryRef.current.attributes.normal.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry ref={geometryRef} args={[20, 20, 100, 100]} />
      <meshPhysicalMaterial
        color="#1a6b8a"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        roughness={0.1}
        metalness={0.05}
        transmission={0.9}
        thickness={0.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        ior={1.33}
      />
    </mesh>
  );
};

const WaterVolume: React.FC = () => {
  return (
    <mesh position={[0, -1.25, 0]}>
      <boxGeometry args={[20, 2.5, 20]} />
      <meshPhysicalMaterial
        color="#1a6b8a"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        roughness={0.1}
        transmission={0.95}
        thickness={5}
        ior={1.33}
      />
    </mesh>
  );
};

const SandFloor: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 50, 50]} />
      <meshStandardMaterial color="#d4bf8e" roughness={0.9} metalness={0.02} />
    </mesh>
  );
};

interface LightSourceProps {
  position: Vector3;
  onPositionChange: (pos: Vector3) => void;
}

const LightSource: React.FC<LightSourceProps> = ({ position, onPositionChange }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const dragOffset = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (!meshRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.current.setFromCamera(mouse, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);

      if (intersects.length > 0) {
        setIsDragging(true);
        const hitPoint = intersects[0].point;
        dragOffset.current.set(
          hitPoint.x - position.x,
          hitPoint.y - position.y,
          0
        );
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.current.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane.current, intersectPoint);

      if (intersectPoint) {
        onPositionChange({
          x: intersectPoint.x - dragOffset.current.x,
          y: intersectPoint.y - dragOffset.current.y,
          z: 0
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [isDragging, camera, gl, position, onPositionChange]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <pointLight color="#ffffff" intensity={2} distance={10} decay={2} />
    </group>
  );
};

const RayRenderer: React.FC<{ rays: RaySegment[] }> = ({ rays }) => {
  return (
    <>
      {rays.map((ray, index) => {
        const points: [number, number, number][] = [
          [ray.start.x, ray.start.y, ray.start.z],
          [ray.end.x, ray.end.y, ray.end.z]
        ];
        return (
          <Line
            key={index}
            points={points}
            color={ray.color}
            lineWidth={ray.lineWidth}
            transparent
            opacity={ray.opacity}
            dashed={ray.isDashed}
            dashSize={ray.isDashed ? 0.1 : 0}
            gapSize={ray.isDashed ? 0.05 : 0}
          />
        );
      })}
    </>
  );
};

interface CausticSpotMeshProps {
  spot: CausticSpot;
  getWobbledPosition: (spot: CausticSpot) => Vector3;
}

const CausticSpotMesh: React.FC<CausticSpotMeshProps> = ({ spot, getWobbledPosition }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const wobbled = getWobbledPosition(spot);
    meshRef.current.position.set(wobbled.x, wobbled.y, wobbled.z);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[spot.size, 32]} />
      <meshBasicMaterial
        color={spot.color}
        transparent
        opacity={spot.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

const CausticRenderer: React.FC<{
  spots: CausticSpot[];
  getWobbledPosition: (spot: CausticSpot) => Vector3;
}> = ({ spots, getWobbledPosition }) => {
  return (
    <>
      {spots.map((spot) => (
        <CausticSpotMesh key={spot.id} spot={spot} getWobbledPosition={getWobbledPosition} />
      ))}
    </>
  );
};

const FlashEffectMesh: React.FC<{
  position: Vector3;
  getOpacity: () => number;
}> = ({ position, getOpacity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const opacity = getOpacity();
    meshRef.current.visible = opacity > 0;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <circleGeometry args={[0.1, 32]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const AngleLabels: React.FC<{
  position: Vector3;
  incidentAngle: number;
  refractedAngle: number;
  isTotalReflection: boolean;
}> = ({ position, incidentAngle, refractedAngle, isTotalReflection }) => {
  return (
    <Html position={[position.x + 0.3, position.y + 0.3, position.z]} center>
      <div
        style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '6px 10px',
          borderRadius: '4px',
          color: '#ffffff',
          fontSize: '14px',
          fontFamily: 'monospace',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap'
        }}
      >
        <div>入射角: {incidentAngle.toFixed(1)}°</div>
        {!isTotalReflection ? (
          <div>折射角: {refractedAngle.toFixed(1)}°</div>
        ) : (
          <div style={{ color: '#ef4444' }}>全反射</div>
        )}
      </div>
    </Html>
  );
};

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  phase: number;
}

const UnderwaterParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 100;

  const { positions, sizes, originalPositions } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const sz = new Float32Array(particleCount);
    const orig = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = -Math.random() * 2.3;
      const z = (Math.random() - 0.5) * 18;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      orig[i * 3] = x;
      orig[i * 3 + 1] = y;
      orig[i * 3 + 2] = z;
      sz[i] = 0.02 + Math.random() * 0.02;
    }

    return { positions: pos, sizes: sz, originalPositions: orig };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      posAttr.array[ix] = originalPositions[ix] + Math.sin(t * 0.5 + i * 0.1) * 0.1;
      posAttr.array[ix + 1] = originalPositions[ix + 1] + Math.cos(t * 0.3 + i * 0.15) * 0.05 + t * 0.02 % 2.5 - 2.5;
      posAttr.array[ix + 2] = originalPositions[ix + 2] + Math.sin(t * 0.4 + i * 0.2) * 0.08;

      if (posAttr.array[ix + 1] > 0) {
        posAttr.array[ix + 1] = -2.5;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface SimulationProps {
  sim: ReturnType<typeof useLightSimulation>;
}

const SimulationScene: React.FC<SimulationProps> = ({ sim }) => {
  useFrame((_, delta) => {
    sim.updateCausticWobble(delta);
  });

  return (
    <>
      <ambientLight intensity={0.3} color="#404060" />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
      <WaterVolume />
      <WaterSurface />
      <SandFloor />
      <LightSource position={sim.lightSource.position} onPositionChange={sim.setLightPosition} />
      <RayRenderer rays={sim.rays} />
      <CausticRenderer spots={sim.causticSpots} getWobbledPosition={sim.getWobbledPosition} />
      <FlashEffectMesh position={sim.intersectionPoint} getOpacity={sim.getFlashOpacity} />
      <AngleLabels
        position={sim.intersectionPoint}
        incidentAngle={sim.angles.incidentAngle}
        refractedAngle={sim.angles.refractedAngle}
        isTotalReflection={sim.angles.isTotalReflection}
      />
      <UnderwaterParticles />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
};

export const Scene3D: React.FC<{ simulation: ReturnType<typeof useLightSimulation> }> = ({
  simulation
}) => {
  return (
    <Canvas
      camera={{ position: [0, 1, 6], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0b0f1a', width: '100%', height: '100%' }}
    >
      <SimulationScene sim={simulation} />
    </Canvas>
  );
};
