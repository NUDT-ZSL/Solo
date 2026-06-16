import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShippingRoute } from '../types';
import { GLOBE_RADIUS } from '../utils/geoMath';
import { interpolateHeatColor, hexToRgb, normalize } from '../analysis/colorScale';
import { useGlobalStore, selectYearlyEmission } from '../store/useGlobalStore';

const HEATMAP_WIDTH = 360;
const HEATMAP_HEIGHT = 180;
const REFRESH_EVERY_N_FRAMES = 5;

interface HeatmapProps {
  visible: boolean;
  routes: ShippingRoute[];
  year: number;
}

export function Heatmap({ visible, routes, year }: HeatmapProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const gridRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = HEATMAP_WIDTH;
    canvas.height = HEATMAP_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
      imageDataRef.current = ctx.createImageData(HEATMAP_WIDTH, HEATMAP_HEIGHT);
    }
    canvasRef.current = canvas;
    gridRef.current = new Float32Array(HEATMAP_WIDTH * HEATMAP_HEIGHT);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureRef.current = texture;

    return () => {
      texture.dispose();
    };
  }, []);

  useFrame(() => {
    if (!visible || !ctxRef.current || !canvasRef.current || !textureRef.current || !imageDataRef.current || !gridRef.current) return;

    frameCountRef.current += 1;
    if (frameCountRef.current < REFRESH_EVERY_N_FRAMES) return;
    frameCountRef.current = 0;

    const grid = gridRef.current;
    grid.fill(0);

    let maxVal = 0;
    for (const route of routes) {
      const yd = selectYearlyEmission(route, year);
      const weight = Math.pow(yd.emission / 1_000_000, 0.7);

      rasterizeGreatCircle(
        route.from.lat, route.from.lng,
        route.to.lat, route.to.lng,
        grid, HEATMAP_WIDTH, HEATMAP_HEIGHT,
        weight
      );

      depositPoint(route.from.lat, route.from.lng, grid, HEATMAP_WIDTH, HEATMAP_HEIGHT, weight * 2);
      depositPoint(route.to.lat, route.to.lng, grid, HEATMAP_WIDTH, HEATMAP_HEIGHT, weight * 2);
    }

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > maxVal) maxVal = grid[i];
    }

    const data = imageDataRef.current.data;
    for (let i = 0; i < grid.length; i++) {
      const t = normalize(grid[i], 0, maxVal || 1);
      const tEased = Math.pow(t, 0.55);
      const px = i * 4;
      if (tEased < 0.05) {
        data[px] = 0;
        data[px + 1] = 0;
        data[px + 2] = 0;
        data[px + 3] = 0;
      } else {
        const hex = interpolateHeatColor(tEased);
        const rgb = hexToRgb(hex);
        data[px] = rgb.r;
        data[px + 1] = rgb.g;
        data[px + 2] = rgb.b;
        data[px + 3] = Math.round(200 * tEased);
      }
    }

    ctxRef.current.putImageData(imageDataRef.current, 0, 0);
    textureRef.current.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} visible={visible}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.003, 64, 64]} />
      <meshBasicMaterial
        map={textureRef.current}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function depositPoint(
  lat: number, lng: number,
  grid: Float32Array,
  w: number, h: number,
  weight: number
) {
  const x = Math.floor(((lng + 180) / 360) * w);
  const y = Math.floor(((90 - lat) / 180) * h);
  const radius = 5;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = (x + dx + w) % w;
      const ny = Math.max(0, Math.min(h - 1, y + dy));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const falloff = 1 - dist / radius;
        grid[ny * w + nx] += weight * falloff * falloff;
      }
    }
  }
}

function rasterizeGreatCircle(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  grid: Float32Array,
  w: number, h: number,
  weight: number
) {
  const steps = 80;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const phi1 = toRad(90 - lat1);
  const theta1 = toRad(lng1);
  const phi2 = toRad(90 - lat2);
  const theta2 = toRad(lng2);

  const x1 = Math.sin(phi1) * Math.cos(theta1);
  const y1 = Math.cos(phi1);
  const z1 = Math.sin(phi1) * Math.sin(theta1);

  const x2 = Math.sin(phi2) * Math.cos(theta2);
  const y2 = Math.cos(phi2);
  const z2 = Math.sin(phi2) * Math.sin(theta2);

  const omega = Math.acos(
    Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))
  );
  const sinOmega = Math.sin(omega) || 1;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;

    const phi = Math.acos(Math.max(-1, Math.min(1, y)));
    const theta = Math.atan2(z, x);

    const lat = 90 - toDeg(phi);
    const lng = toDeg(theta);
    depositPoint(lat, lng, grid, w, h, weight * 0.6);
  }
}

export function HeatmapLayer() {
  const visible = useGlobalStore(s => s.showHeatmap);
  const routes = useGlobalStore(s => s.routes);
  const year = useGlobalStore(s => s.currentYear);
  return <Heatmap visible={visible} routes={routes} year={year} />;
}
