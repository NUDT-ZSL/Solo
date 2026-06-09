import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PrismProps {
  id: number;
  position: [number, number, number];
  rotation: number;
  refraction: number;
  lightSource: [number, number, number];
  lightIntensity: number;
  pulsesRef: React.MutableRefObject<{
    position: THREE.Vector3;
    startTime: number;
    color: THREE.Color;
  }[]>;
}

const PARTICLE_COUNT_PER_BEAM = 200;
const BEAM_COUNT = 7;
const PARTICLE_SPEED = 0.05;
const CURTAIN_Z = -8;

function wavelengthToColor(wavelength: number): THREE.Color {
  let r = 0, g = 0, b = 0;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }
  return new THREE.Color(r, g, b);
}

function createPrismGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const positions = geometry.attributes.position;
  const scale = 1.2;
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(
      i,
      positions.getX(i) * scale,
      positions.getY(i) * scale * 1.5,
      positions.getZ(i) * scale
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  lifeProgress: number;
  colorIndex: number;
  active: boolean;
}

const Prism: React.FC<PrismProps> = ({
  id,
  position,
  rotation,
  refraction,
  lightSource,
  lightIntensity,
  pulsesRef,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<ParticleData[]>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const pulseMeshesRef = useRef<THREE.Mesh[]>([]);

  const prismGeometry = useMemo(() => createPrismGeometry(), []);

  const beamData = useMemo(() => {
    const beams: {
      direction: THREE.Vector3;
      baseColor: THREE.Color;
      wavelength: number;
    }[] = [];

    const rotRad = (rotation * Math.PI) / 180;
    const dispersion = (refraction - 1) * 0.5;

    for (let i = 0; i < BEAM_COUNT; i++) {
      const t = i / (BEAM_COUNT - 1);
      const wavelength = 450 + t * 250;
      const color = wavelengthToColor(wavelength);

      const baseAngle = rotRad + (t - 0.5) * dispersion * 2.5;
      const dir = new THREE.Vector3(
        Math.sin(baseAngle) * 0.6,
        -0.5 - Math.abs(t - 0.5) * 0.3,
        Math.cos(baseAngle) * 0.6 - 0.3
      ).normalize();

      beams.push({ direction: dir, baseColor: color, wavelength });
    }
    return beams;
  }, [rotation, refraction]);

  useEffect(() => {
    particlesRef.current = [];
    for (let beamIdx = 0; beamIdx < BEAM_COUNT; beamIdx++) {
      for (let i = 0; i < PARTICLE_COUNT_PER_BEAM; i++) {
        const beam = beamData[beamIdx];
        const offset = Math.random() * 0.5;
        particlesRef.current.push({
          position: new THREE.Vector3(
            position[0] + beam.direction.x * offset * 2,
            position[1] + beam.direction.y * offset * 2,
            position[2] + beam.direction.z * offset * 2
          ),
          velocity: beam.direction.clone().multiplyScalar(PARTICLE_SPEED),
          size: 3 + Math.random() * 3,
          lifeProgress: Math.random(),
          colorIndex: beamIdx,
          active: true,
        });
      }
    }
  }, [id, position, beamData]);

  const particlesGeometry = useMemo(() => {
    const totalParticles = BEAM_COUNT * PARTICLE_COUNT_PER_BEAM;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geometry;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = (rotation * Math.PI) / 180;

    const positions = particlesGeometry.attributes.position
      .array as Float32Array;
    const colors = particlesGeometry.attributes.color.array as Float32Array;
    const sizes = particlesGeometry.attributes.size.array as Float32Array;
    const currentTime = performance.now();

    particlesRef.current.forEach((p, idx) => {
      if (!p.active) return;

      const beam = beamData[p.colorIndex];
      p.velocity.copy(beam.direction).multiplyScalar(PARTICLE_SPEED);

      p.position.add(p.velocity);
      p.lifeProgress += 0.003;

      if (p.position.z <= CURTAIN_Z + 0.1 && p.position.z >= CURTAIN_Z - 0.5) {
        pulsesRef.current.push({
          position: p.position.clone(),
          startTime: currentTime,
          color: beam.baseColor.clone(),
        });

        p.position.set(
          position[0] + (Math.random() - 0.5) * 0.3,
          position[1] + (Math.random() - 0.5) * 0.3,
          position[2] + (Math.random() - 0.5) * 0.3
        );
        p.lifeProgress = 0;
      }

      if (
        p.lifeProgress > 1 ||
        Math.abs(p.position.x) > 15 ||
        p.position.y < -5 ||
        p.position.z < -10
      ) {
        p.position.set(
          position[0] + (Math.random() - 0.5) * 0.3,
          position[1] + (Math.random() - 0.5) * 0.3,
          position[2] + (Math.random() - 0.5) * 0.3
        );
        p.lifeProgress = 0;
      }

      positions[idx * 3] = p.position.x;
      positions[idx * 3 + 1] = p.position.y;
      positions[idx * 3 + 2] = p.position.z;

      const alphaT = Math.min(p.lifeProgress * 2, 1);
      const whiteT = 1 - alphaT * 0.5;
      const intensity = lightIntensity;

      colors[idx * 3] = THREE.MathUtils.lerp(beam.baseColor.r, 1, whiteT * 0.6) * intensity;
      colors[idx * 3 + 1] = THREE.MathUtils.lerp(beam.baseColor.g, 1, whiteT * 0.6) * intensity;
      colors[idx * 3 + 2] = THREE.MathUtils.lerp(beam.baseColor.b, 1, whiteT * 0.6) * intensity;

      sizes[idx] = p.size * (0.5 + alphaT * 0.8) * intensity;
    });

    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.color.needsUpdate = true;
    particlesGeometry.attributes.size.needsUpdate = true;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={prismGeometry}>
        <meshPhysicalMaterial
          color={0x88ccff}
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
          envMapIntensity={0.3}
          clearcoat={1}
          clearcoatRoughness={0.1}
          ior={refraction}
        />
      </mesh>

      <mesh geometry={prismGeometry}>
        <meshBasicMaterial
          color={0xaaddff}
          transparent
          opacity={0.08}
          wireframe
        />
      </mesh>

      <points ref={pointsRef} geometry={particlesGeometry}>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          emissive={new THREE.Color(0xffffff)}
          emissiveIntensity={0.8}
        />
      </points>
    </group>
  );
};

export default Prism;
