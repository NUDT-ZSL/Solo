import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '@/utils/currentData';

const generateContourTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a1628');
  gradient.addColorStop(0.5, '#0d1f3c');
  gradient.addColorStop(1, '#0a1628');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = 'rgba(100, 150, 200, 0.15)';
  ctx.lineWidth = 1;

  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * 512;
    ctx.beginPath();
    for (let lon = 0; lon <= 1024; lon += 4) {
      const offset = Math.sin((lon / 1024) * Math.PI * 4 + lat * 0.1) * 3;
      if (lon === 0) {
        ctx.moveTo(lon, y + offset);
      } else {
        ctx.lineTo(lon, y + offset);
      }
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
  for (let lon = 0; lon < 360; lon += 30) {
    const x = (lon / 360) * 1024;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let lat = 0; lat <= 512; lat += 4) {
      const offset = Math.sin((lat / 512) * Math.PI * 2) * 2;
      ctx.lineTo(x + offset, lat);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(60, 100, 140, 0.25)';
  const continents = [
    { x: 120, y: 180, w: 180, h: 150 },
    { x: 320, y: 200, w: 220, h: 180 },
    { x: 560, y: 180, w: 160, h: 120 },
    { x: 650, y: 280, w: 120, h: 160 },
    { x: 780, y: 200, w: 180, h: 140 },
    { x: 350, y: 400, w: 280, h: 80 },
  ];

  continents.forEach((cont) => {
    ctx.beginPath();
    ctx.ellipse(
      cont.x + cont.w / 2,
      cont.y + cont.h / 2,
      cont.w / 2,
      cont.h / 2,
      Math.random() * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

export default function Sphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => generateContourTexture(), []);

  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    const sizes = new Float32Array(200);

    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 50 + Math.random() * 30;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 1 + Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <>
      <points geometry={starsGeometry}>
        <pointsMaterial
          size={0.3}
          color="#ffffff"
          sizeAttenuation
          transparent
          opacity={0.8}
        />
      </points>

      <mesh ref={meshRef} receiveShadow castShadow>
        <sphereGeometry
          args={[EARTH_RADIUS, 64, 32]}
        />
        <meshPhongMaterial
          map={texture}
          transparent
          opacity={0.85}
          shininess={15}
          specular={new THREE.Color(0x333355)}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[EARTH_RADIUS + 0.1, EARTH_RADIUS + 0.15, 64]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
