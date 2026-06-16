import React, { useRef, useMemo } from 'react';
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
  currentIndex: number;
  distanceToSun: number;
  opacity: number;
  isHistorical?: boolean;
  historicalOpacity?: number;
}

const getDistanceColor = (distance: number, minDist: number, maxDist: number): THREE.Color => {
  const normalized = Math.min(1, Math.max(0, (distance - minDist) / (maxDist - minDist)));
  
  const warmColor = new THREE.Color('#FF6B35');
  const coolColor = new THREE.Color('#E8F4F8');
  const midColor = new THREE.Color('#FFFFFF');
  
  if (normalized < 0.5) {
    const t = normalized * 2;
    return warmColor.clone().lerp(midColor, t);
  } else {
    const t = (normalized - 0.5) * 2;
    return midColor.clone().lerp(coolColor, t);
  }
};

const OrbitLine: React.FC<OrbitLineProps> = ({
  points,
  currentIndex,
  distanceToSun,
  opacity,
  isHistorical = false,
  historicalOpacity = 0.5
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const glowLineRef = useRef<THREE.Line>(null);

  const { geometry, glowGeometry, distances, minDist, maxDist } = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const glowColors = new Float32Array(points.length * 3);
    const distances: number[] = [];

    let minDist = Infinity;
    let maxDist = -Infinity;

    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      distances.push(p.distanceToSun);
      minDist = Math.min(minDist, p.distanceToSun);
      maxDist = Math.max(maxDist, p.distanceToSun);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));

    return { geometry: geo, glowGeometry: glowGeo, distances, minDist, maxDist };
  }, [points]);

  useFrame(() => {
    if (!lineRef.current || !glowLineRef.current) return;

    const colorAttr = lineRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
    const glowColorAttr = glowLineRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < points.length; i++) {
      const idx = (i + currentIndex) % points.length;
      const distance = distances[idx];
      const color = getDistanceColor(distance, minDist, maxDist);

      if (!isHistorical) {
        const glowIntensity = Math.max(0, 1 - Math.abs(i - points.length / 2) / (points.length / 2));
        const segmentOpacity = opacity * (0.3 + glowIntensity * 0.7);
        
        if (i >= points.length - 30 && i < points.length) {
          const trailIntensity = (i - (points.length - 30)) / 30;
          const trailOpacity = opacity * (0.3 + trailIntensity * 0.7);
          colorAttr.setXYZ(i, color.r * (trailOpacity / opacity), color.g * (trailOpacity / opacity), color.b * (trailOpacity / opacity));
        } else {
          colorAttr.setXYZ(i, color.r * (segmentOpacity / opacity), color.g * (segmentOpacity / opacity), color.b * (segmentOpacity / opacity));
        }
      } else {
        colorAttr.setXYZ(i, color.r, color.g, color.b);
      }

      const glowIntensity = isHistorical ? 0 : Math.max(0, 1 - Math.abs(i - points.length + 5) / 20);
      const glowColor = isHistorical
        ? new THREE.Color('#AED6F1')
        : new THREE.Color('#FFD700').lerp(new THREE.Color('#FF6B35'), 1 - distanceToSun / maxDist);
      
      glowColorAttr.setXYZ(
        i,
        glowColor.r * (isHistorical ? historicalOpacity : glowIntensity),
        glowColor.g * (isHistorical ? historicalOpacity : glowIntensity),
        glowColor.b * (isHistorical ? historicalOpacity : glowIntensity)
      );
    }

    colorAttr.needsUpdate = true;
    glowColorAttr.needsUpdate = true;
  });

  const lineObject = useMemo(() => {
    const material = isHistorical
      ? new THREE.LineDashedMaterial({
          vertexColors: true,
          transparent: true,
          opacity: historicalOpacity,
          dashSize: 0.3,
          gapSize: 0.2,
          linewidth: 2
        })
      : new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity,
          linewidth: 2
        });

    const line = new THREE.Line(geometry, material);
    if (isHistorical) {
      line.computeLineDistances();
    }
    return line;
  }, [geometry, isHistorical, opacity, historicalOpacity]);

  const glowLineObject = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isHistorical ? historicalOpacity * 0.5 : 0.8,
      linewidth: 4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(glowGeometry, material);
    return line;
  }, [glowGeometry, isHistorical, historicalOpacity]);

  return (
    <group>
      <primitive object={lineObject} ref={lineRef} />
      {!isHistorical && <primitive object={glowLineObject} ref={glowLineRef} />}
    </group>
  );
};

interface OrbitGlowMarkerProps {
  position: [number, number, number];
  distanceToSun: number;
}

const OrbitGlowMarker: React.FC<OrbitGlowMarkerProps> = ({ position, distanceToSun }) => {
  const markerRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    const normalized = Math.min(1, Math.max(0, distanceToSun / 15));
    return new THREE.Color('#FFD700').lerp(new THREE.Color('#FF6B35'), 1 - normalized);
  }, [distanceToSun]);

  useFrame((_, delta) => {
    if (markerRef.current) {
      markerRef.current.rotation.y += delta * 2;
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
      markerRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh scale={2}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
      <mesh scale={3}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </group>
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
  const positionsRef = useRef<Float32Array>(new Float32Array(0));
  const colorsRef = useRef<Float32Array>(new Float32Array(0));

  const { positions, colors, count } = useMemo(() => {
    const particles = generateTailParticles(
      { x: cometPosition[0], y: cometPosition[1], z: cometPosition[2] },
      { x: sunPosition[0], y: sunPosition[1], z: sunPosition[2] },
      distanceToSun
    );

    const maxParticles = 3000;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const count = Math.min(particles.length, maxParticles);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
    }

    positionsRef.current = positions;
    colorsRef.current = colors;

    return { positions, colors, count };
  }, [cometPosition[0], cometPosition[1], cometPosition[2], distanceToSun]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, count);
    return geo;
  }, [positions, colors, count]);

  useFrame(() => {
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particlesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
      
      if (posAttr.array !== positionsRef.current) {
        posAttr.array = positionsRef.current;
        posAttr.needsUpdate = true;
      }
      if (colAttr.array !== colorsRef.current) {
        colAttr.array = colorsRef.current;
        colAttr.needsUpdate = true;
      }
      particlesRef.current.geometry.setDrawRange(0, count);
    }
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface SceneContentProps {
  params: SceneParams;
}

const SceneContent: React.FC<SceneContentProps> = ({ params }) => {
  const {
    orbitPoints,
    position,
    distanceToSun,
    historicalTrajectories,
    cometColor,
    orbitOpacity,
    currentOrbitIndex
  } = params;
  
  const sunPos: [number, number, number] = [0, 0, 0];
  const cometPos: [number, number, number] = [position.x, position.y, position.z];

  return (
    <>
      <ambientLight intensity={0.1} />
      <Sun position={sunPos} />

      <OrbitLine
        points={orbitPoints}
        currentIndex={currentOrbitIndex}
        distanceToSun={distanceToSun}
        opacity={orbitOpacity}
        isHistorical={false}
      />

      <OrbitGlowMarker position={cometPos} distanceToSun={distanceToSun} />

      {historicalTrajectories.map((traj) => (
        <OrbitLine
          key={traj.year}
          points={traj.points}
          currentIndex={0}
          distanceToSun={distanceToSun}
          opacity={orbitOpacity * traj.opacity}
          isHistorical={true}
          historicalOpacity={traj.opacity * orbitOpacity}
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
