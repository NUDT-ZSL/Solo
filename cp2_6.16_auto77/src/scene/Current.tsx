import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OceanCurrent, EARTH_RADIUS, PARTICLE_COUNT_PER_CURRENT, getSpeedColor } from '@/utils/currentData';

interface CurrentProps {
  current: OceanCurrent;
  isPlaying: boolean;
  isHovered: boolean;
  onHover: (name: string | null) => void;
}

const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const slerp = (v0: THREE.Vector3, v1: THREE.Vector3, t: number): THREE.Vector3 => {
  const dot = v0.dot(v1);
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));

  if (omega < 0.001) {
    return v0.clone().lerp(v1, t);
  }

  const sinOmega = Math.sin(omega);
  const scale0 = Math.sin((1 - t) * omega) / sinOmega;
  const scale1 = Math.sin(t * omega) / sinOmega;

  return v0.clone().multiplyScalar(scale0).add(v1.clone().multiplyScalar(scale1));
};

const generateGreatCirclePoints = (
  start: [number, number],
  end: [number, number],
  segments: number,
  radius: number
): THREE.Vector3[] => {
  const startVec = latLonToVector3(start[0], start[1], radius + 0.2);
  const endVec = latLonToVector3(end[0], end[1], radius + 0.2);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(slerp(startVec, endVec, t));
  }

  return points;
};

const calculateDistance = (start: [number, number], end: [number, number]): number => {
  const R = 6371;
  const dLat = ((end[0] - start[0]) * Math.PI) / 180;
  const dLon = ((end[1] - start[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start[0] * Math.PI) / 180) *
      Math.cos((end[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Current({ current, isPlaying, isHovered, onHover }: CurrentProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const tubeRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT_PER_CURRENT));
  const originalColorsRef = useRef<Float32Array | null>(null);
  const [hovered, setHovered] = useState(false);

  const { particlePositions, particleColors, tubeGeometry, pathLength } = useMemo(() => {
    const pathPoints = generateGreatCirclePoints(current.start, current.end, 100, EARTH_RADIUS);
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5);
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.08, 8, false);

    const positions = new Float32Array(PARTICLE_COUNT_PER_CURRENT * 3);
    const colors = new Float32Array(PARTICLE_COUNT_PER_CURRENT * 3);
    const originalColors = new Float32Array(PARTICLE_COUNT_PER_CURRENT * 3);

    for (let i = 0; i < PARTICLE_COUNT_PER_CURRENT; i++) {
      const t = i / PARTICLE_COUNT_PER_CURRENT;
      const point = curve.getPoint(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const speed = current.speedRange[0] + Math.random() * (current.speedRange[1] - current.speedRange[0]);
      const speedColor = new THREE.Color(getSpeedColor(speed));
      colors[i * 3] = speedColor.r;
      colors[i * 3 + 1] = speedColor.g;
      colors[i * 3 + 2] = speedColor.b;
      originalColors[i * 3] = speedColor.r;
      originalColors[i * 3 + 1] = speedColor.g;
      originalColors[i * 3 + 2] = speedColor.b;

      progressRef.current[i] = t;
    }

    originalColorsRef.current = originalColors;
    const distance = calculateDistance(current.start, current.end);

    return {
      particlePositions: positions,
      particleColors: colors,
      tubeGeometry: tubeGeo,
      pathLength: distance,
    };
  }, [current]);

  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    return geometry;
  }, [particlePositions, particleColors]);

  useEffect(() => {
    if (isHovered !== hovered) {
      setHovered(isHovered);
    }

    if (particlesRef.current && originalColorsRef.current) {
      const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
      const brightness = isHovered ? 1.3 : 1.0;

      for (let i = 0; i < PARTICLE_COUNT_PER_CURRENT; i++) {
        colors[i * 3] = Math.min(1, originalColorsRef.current[i * 3] * brightness);
        colors[i * 3 + 1] = Math.min(1, originalColorsRef.current[i * 3 + 1] * brightness);
        colors[i * 3 + 2] = Math.min(1, originalColorsRef.current[i * 3 + 2] * brightness);
      }

      particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [isHovered, hovered]);

  useFrame((_, delta) => {
    if (!particlesRef.current || !isPlaying) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const pathPoints = generateGreatCirclePoints(current.start, current.end, 100, EARTH_RADIUS);
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5);

    for (let i = 0; i < PARTICLE_COUNT_PER_CURRENT; i++) {
      const baseSpeed = 0.1 + ((current.speedRange[0] + current.speedRange[1]) / 2) * 0.15;
      progressRef.current[i] += delta * baseSpeed;

      if (progressRef.current[i] > 1) {
        progressRef.current[i] -= 1;
      }

      const point = curve.getPoint(progressRef.current[i]);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const materialColor = useMemo(() => {
    const color = new THREE.Color(current.color);
    if (hovered) {
      color.multiplyScalar(1.3);
    }
    return color;
  }, [current.color, hovered]);

  return (
    <>
      <mesh
        ref={tubeRef}
        geometry={tubeGeometry}
        onPointerOver={() => onHover(current.name)}
        onPointerOut={() => onHover(null)}
      >
        <meshBasicMaterial
          color={materialColor}
          transparent
          opacity={hovered ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <points
        ref={particlesRef}
        geometry={pointsGeometry}
        onPointerOver={() => onHover(current.name)}
        onPointerOut={() => onHover(null)}
      >
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={hovered ? 1 : 0.9}
          sizeAttenuation
        />
      </points>
    </>
  );
}

export { calculateDistance };
