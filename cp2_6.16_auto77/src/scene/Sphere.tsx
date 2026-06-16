import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { EARTH_RADIUS } from '@/utils/currentData';

const generateContourDataURL = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#0a1628');
  gradient.addColorStop(0.3, '#0d2240');
  gradient.addColorStop(0.5, '#102a4e');
  gradient.addColorStop(0.7, '#0d2240');
  gradient.addColorStop(1, '#0a1628');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.fillStyle = 'rgba(40, 80, 120, 0.5)';
  const continents = [
    { x: 240, y: 360, w: 360, h: 300, name: '北美洲' },
    { x: 640, y: 400, w: 440, h: 360, name: '非洲/欧洲' },
    { x: 1120, y: 360, w: 320, h: 240, name: '亚洲' },
    { x: 1300, y: 560, w: 240, h: 320, name: '澳大利亚' },
    { x: 1560, y: 400, w: 360, h: 280, name: '亚洲东部' },
    { x: 700, y: 800, w: 560, h: 160, name: '南极洲' },
    { x: 200, y: 700, w: 280, h: 200, name: '南美洲' },
  ];
  continents.forEach((cont) => {
    ctx.beginPath();
    ctx.ellipse(
      cont.x + cont.w / 2, cont.y + cont.h / 2,
      cont.w / 2, cont.h / 2, Math.random() * 0.2, 0, Math.PI * 2
    );
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(30, 60, 90, 0.4)';
  const smallLandmasses = [
    { x: 1050, y: 320, w: 100, h: 80 },
    { x: 1400, y: 280, w: 120, h: 100 },
    { x: 500, y: 520, w: 80, h: 120 },
  ];
  smallLandmasses.forEach((cont) => {
    ctx.beginPath();
    ctx.ellipse(
      cont.x + cont.w / 2, cont.y + cont.h / 2,
      cont.w / 2, cont.h / 2, Math.random() * 0.3, 0, Math.PI * 2
    );
    ctx.fill();
  });

  ctx.strokeStyle = 'rgba(80, 140, 200, 0.2)';
  ctx.lineWidth = 1.5;
  for (let lat = -80; lat <= 80; lat += 10) {
    const y = ((90 - lat) / 180) * 1024;
    ctx.beginPath();
    for (let lon = 0; lon <= 2048; lon += 8) {
      const offset = Math.sin((lon / 2048) * Math.PI * 6 + lat * 0.15) * 4;
      if (lon === 0) ctx.moveTo(lon, y + offset);
      else ctx.lineTo(lon, y + offset);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(80, 140, 200, 0.12)';
  ctx.lineWidth = 1;
  for (let lon = 0; lon < 360; lon += 15) {
    const x = (lon / 360) * 2048;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let lat = 0; lat <= 1024; lat += 8) {
      const offset = Math.sin((lat / 1024) * Math.PI * 3) * 3;
      ctx.lineTo(x + offset, lat);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(60, 120, 180, 0.15)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const r = 10 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

const EARTH_TEXTURE_URL = generateContourDataURL();

function EarthMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(TextureLoader, EARTH_TEXTURE_URL);

  useMemo(() => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
    }
  }, [texture]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <mesh ref={meshRef} receiveShadow castShadow>
      <sphereGeometry args={[EARTH_RADIUS, 64, 32]} />
      <meshPhongMaterial
        map={texture}
        transparent
        opacity={0.9}
        shininess={15}
        specular={new THREE.Color(0x222244)}
      />
    </mesh>
  );
}

export default function Sphere() {
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

      <EarthMesh />

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
