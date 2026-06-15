import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ParticleField from './ParticleField';
import type { ClimateVariable } from '../utils/dataLoader';

interface EarthProps {
  variable: ClimateVariable;
  month: number;
}

export default function Earth({ variable, month }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);

  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(0.2, '#2563eb');
    gradient.addColorStop(0.4, '#3b82f6');
    gradient.addColorStop(0.5, '#0ea5e9');
    gradient.addColorStop(0.6, '#3b82f6');
    gradient.addColorStop(0.8, '#2563eb');
    gradient.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2d5016';
    const drawContinent = (x: number, y: number, w: number, h: number, irregularity = 0.3) => {
      ctx.beginPath();
      const points = 20;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const rx = w / 2 + (Math.random() - 0.5) * w * irregularity;
        const ry = h / 2 + (Math.random() - 0.5) * h * irregularity;
        const px = x + Math.cos(angle) * rx;
        const py = y + Math.sin(angle) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    drawContinent(300, 300, 250, 180);
    drawContinent(450, 500, 120, 200);
    drawContinent(1000, 280, 300, 200);
    drawContinent(1050, 550, 200, 250);
    drawContinent(1400, 350, 250, 150);
    drawContinent(1600, 700, 150, 100);
    drawContinent(300, 850, 800, 120);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <ParticleField variable={variable} month={month} />
    </group>
  );
}
