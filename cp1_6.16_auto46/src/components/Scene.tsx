import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { generateTailParticles, OrbitPoint } from '../lib/cometEngine';
import type { SceneParams } from '../App';

interface SunProps {
  position?: [number, number, number];
}

const Sun: React.FC<SunProps> = ({ position = [0, 0, 0] }) => {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      <mesh ref={glowRef} scale={1.3}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#FFA500" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
      <pointLight color="#FFD700" intensity={2} distance={100} />
    </group>
  );
};

interface OrbitLineProps {
  points: OrbitPoint[];
  color?: string;
  opacity?: number;
  dashed?: boolean;
}

const OrbitLine: React.FC<OrbitLineProps> = ({ points, color = '#FFFFFF', opacity = 0.3, dashed = false }) => {
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  const material = useMemo(() => {
    if (dashed) {
      return new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: 0.3,
        gapSize: 0.2,
        linewidth: 2
      });
    }
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      linewidth: 1
    });
  }, [color, opacity, dashed]);

  const lineObject = useMemo(() => {
    const line = new THREE.Line(geometry, material);
    if (dashed) {
      line.computeLineDistances();
    }
    return line;
  }, [geometry, material, dashed]);

  return (
    <primitive object={lineObject} ref={lineRef} />
  );
};

interface CometCoreProps {
  position: [number, number, number];
  color?: string;
}

const CometCore: React.FC<CometCoreProps> = ({ position, color = '#B0B0B0' }) => {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.5;
      coreRef.current.rotation.x += delta * 0.3;
    }
  });

  return (
    <mesh ref={coreRef} position={position}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
    </mesh>
  );
};

interface CometMarkerProps {
  position: [number, number, number];
}

const CometMarker: React.FC<CometMarkerProps> = ({ position }) => {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#E74C3C" />
    </mesh>
  );
};

interface TailParticlesProps {
  cometPosition: [number, number, number];
  sunPosition: [number, number, number];
  distanceToSun: number;
}

const TailParticles: React.FC<TailParticlesProps> = ({ cometPosition, sunPosition, distanceToSun }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const [particleData, setParticleData] = useState<{
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
  }>({
    positions: new Float32Array(0),
    colors: new Float32Array(0),
    sizes: new Float32Array(0)
  });

  useEffect(() => {
    const particles = generateTailParticles(
      { x: cometPosition[0], y: cometPosition[1], z: cometPosition[2] },
      { x: sunPosition[0], y: sunPosition[1], z: sunPosition[2] },
      distanceToSun
    );

    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
    });

    setParticleData({ positions, colors, sizes });
  }, [cometPosition[0], cometPosition[1], cometPosition[2], distanceToSun]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));
    return geo;
  }, [particleData.positions, particleData.colors]);

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface SceneContentProps {
  params: SceneParams;
}

const SceneContent: React.FC<SceneContentProps> = ({ params }) => {
  const { orbitPoints, position, distanceToSun, historicalTrajectories, cometColor } = params;
  const sunPos: [number, number, number] = [0, 0, 0];
  const cometPos: [number, number, number] = [position.x, position.y, position.z];

  return (
    <>
      <ambientLight intensity={0.1} />
      <Sun position={sunPos} />

      <OrbitLine points={orbitPoints} color="#FFFFFF" opacity={0.3} dashed={false} />

      {historicalTrajectories.map((traj) => (
        <OrbitLine
          key={traj.year}
          points={traj.points}
          color="#AED6F1"
          opacity={traj.opacity}
          dashed={true}
        />
      ))}

      <CometCore position={cometPos} color={cometColor} />
      <CometMarker position={cometPos} />
      <TailParticles
        cometPosition={cometPos}
        sunPosition={sunPos}
        distanceToSun={distanceToSun}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={200}
        autoRotate={false}
      />

      <Stars
        radius={300}
        depth={60}
        count={2000}
        factor={7}
        saturation={0}
        fade
        speed={0.5}
      />
    </>
  );
};

interface SceneProps {
  params: SceneParams;
}

const Scene: React.FC<SceneProps> = ({ params }) => {
  return (
    <Canvas
      camera={{ position: [20, 10, 30], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0B0C10', width: '100%', height: '100%' }}
    >
      <SceneContent params={params} />
    </Canvas>
  );
};

export default Scene;
