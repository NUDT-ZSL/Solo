import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Trail, DisplayMode } from './types';

interface StarFieldProps {
  trails: Trail[];
  displayMode: DisplayMode;
  onHover: (trail: Trail | null, point: { x: number; y: number }) => void;
  onClick: (trail: Trail) => void;
}

interface StarData {
  position: THREE.Vector3;
  size: number;
  color: THREE.Color;
  trail: Trail;
  phase: number;
}

const NUM_ARMS = 3;
const ARM_OFFSET = (Math.PI * 2) / NUM_ARMS;
const SPIRAL_GROWTH = 0.18;
const SPIRAL_TURNS = 2.2;
const MIN_RADIUS = 3;
const MAX_RADIUS = 38;
const MIN_SPACING = 1.2;

function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function hexToThreeColor(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color('#ffffff');
  }
}

function computeSpiralPosition(
  index: number,
  total: number,
  armIndex: number,
  dateBucketOffset: number
): THREE.Vector3 {
  const t = total <= 1 ? 0 : index / (total - 1);
  const radius = MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
  const angle =
    t * SPIRAL_TURNS * Math.PI * 2 +
    armIndex * ARM_OFFSET +
    dateBucketOffset * 0.6;

  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  const z = (Math.random() - 0.5) * 1.5;

  return new THREE.Vector3(x, y, z);
}

function getDateBucket(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay) % 365;
}

function buildStars(trails: Trail[], mode: DisplayMode): StarData[] {
  if (trails.length === 0) return [];

  const sorted = [...trails];
  if (mode === 'timeline') {
    sorted.sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
  } else if (mode === 'duration') {
    sorted.sort((a, b) => a.duration - b.duration);
  } else if (mode === 'category') {
    sorted.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
    });
  }

  const usedPositions: THREE.Vector3[] = [];
  const stars: StarData[] = [];
  const categoryArmMap: Record<string, number> = {};
  let catCounter = 0;

  sorted.forEach((trail, idx) => {
    let armIndex: number;
    if (mode === 'category') {
      if (!(trail.category in categoryArmMap)) {
        categoryArmMap[trail.category] = catCounter % NUM_ARMS;
        catCounter++;
      }
      armIndex = categoryArmMap[trail.category];
    } else if (mode === 'duration') {
      armIndex = idx % NUM_ARMS;
    } else {
      armIndex = idx % NUM_ARMS;
    }

    const dateBucket = getDateBucket(trail.visitedAt);
    let pos = computeSpiralPosition(idx, sorted.length, armIndex, dateBucket);

    for (const existing of usedPositions) {
      if (pos.distanceTo(existing) < MIN_SPACING) {
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * MIN_SPACING * 1.4,
          (Math.random() - 0.5) * MIN_SPACING * 1.4,
          (Math.random() - 0.5) * 1.2
        );
        pos = pos.clone().add(jitter);
      }
    }
    usedPositions.push(pos);

    const sizeNorm = Math.min(Math.max(trail.duration, 30), 600);
    const size = 2 + ((sizeNorm - 30) / 570) * 10;

    stars.push({
      position: pos,
      size,
      color: hexToThreeColor(trail.themeColor),
      trail,
      phase: Math.random() * Math.PI * 2,
    });
  });

  return stars;
}

const StarField: React.FC<StarFieldProps> = ({ trails, displayMode, onHover, onClick }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  const stars = useMemo(() => buildStars(trails, displayMode), [trails, displayMode]);
  const hoveredIdxRef = useRef<number>(-1);
  const { camera, raycaster, pointer, gl } = useThree();

  const { geometry, material } = useMemo(() => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseSizes = new Float32Array(count);
    const phases = new Float32Array(count);

    stars.forEach((s, i) => {
      positions[i * 3] = s.position.x;
      positions[i * 3 + 1] = s.position.y;
      positions[i * 3 + 2] = s.position.z;
      colors[i * 3] = s.color.r;
      colors[i * 3 + 1] = s.color.g;
      colors[i * 3 + 2] = s.color.b;
      baseSizes[i] = s.size;
      phases[i] = s.phase;
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('baseSize', new THREE.BufferAttribute(baseSizes, 1));
    geom.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uScale: { value: 1.0 },
        uHovered: { value: -1 },
        uTexture: { value: glowTexture },
      },
      vertexShader: `
        attribute float baseSize;
        attribute float phase;
        varying vec3 vColor;
        varying float vSize;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uScale;
        uniform int uHovered;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float breathe = 0.8 + 0.4 * sin(uTime * 1.3 + phase);
          float hoverBoost = (gl_VertexID == uHovered) ? 1.6 : 1.0;
          float size = baseSize * breathe * hoverBoost * uScale * uPixelRatio * 16.0;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          vSize = gl_PointSize;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          if (tex.a < 0.02) discard;
          vec3 finalColor = vColor * tex.rgb;
          float glow = smoothstep(0.0, 0.4, tex.a);
          gl_FragColor = vec4(finalColor, tex.a * (0.85 + glow * 0.15));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    return { geometry: geom, material: mat };
  }, [stars, glowTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (material) {
      material.uniforms.uTime.value = t;
    }

    if (pointsRef.current && stars.length > 0) {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(pointsRef.current);

      let newHoveredIdx = -1;
      if (intersects.length > 0) {
        newHoveredIdx = intersects[0].index ?? -1;
      }

      if (newHoveredIdx !== hoveredIdxRef.current) {
        hoveredIdxRef.current = newHoveredIdx;
        if (material) {
          material.uniforms.uHovered.value = newHoveredIdx;
        }

        if (newHoveredIdx >= 0 && newHoveredIdx < stars.length) {
          const pos3d = stars[newHoveredIdx].position.clone();
          const projected = pos3d.project(camera);
          const x = (projected.x * 0.5 + 0.5) * gl.domElement.clientWidth;
          const y = (-projected.y * 0.5 + 0.5) * gl.domElement.clientHeight;
          onHover(stars[newHoveredIdx].trail, { x, y });
          document.body.style.cursor = 'pointer';
        } else {
          onHover(null, { x: 0, y: 0 });
          document.body.style.cursor = 'default';
        }
      }
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (hoveredIdxRef.current >= 0 && hoveredIdxRef.current < stars.length) {
        onClick(stars[hoveredIdxRef.current].trail);
      }
    };
    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [stars, onClick, gl]);

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={material} />
      <BackgroundStars />
      <SpiralGuides />
    </>
  );
};

const BackgroundStars: React.FC = React.memo(() => {
  const ref = useRef<THREE.Points>(null);
  const { count, positions, sizes } = useMemo(() => {
    const c = 400;
    const pos = new Float32Array(c * 3);
    const sz = new Float32Array(c);
    for (let i = 0; i < c; i++) {
      const r = 45 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = 0.3 + Math.random() * 0.9;
    }
    return { count: c, positions: pos, sizes: sz };
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [positions, sizes]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.01;
      ref.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        uniform float uTime;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + position.x * 10.0 + position.y * 5.0);
          gl_PointSize = aSize * twinkle * (200.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(0.9, 0.95, 1.0, a * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points ref={ref} geometry={geom} material={mat} />;
});
BackgroundStars.displayName = 'BackgroundStars';

const SpiralGuides: React.FC = React.memo(() => {
  const lines = useMemo(() => {
    const result: THREE.BufferGeometry[] = [];
    for (let arm = 0; arm < NUM_ARMS; arm++) {
      const segments = 150;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const radius = MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
        const angle = t * SPIRAL_TURNS * Math.PI * 2 + arm * ARM_OFFSET;
        points.push(new THREE.Vector3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geom = new THREE.TubeGeometry(curve, segments, 0.02, 4, false);
      result.push(geom);
    }
    return result;
  }, []);

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  return (
    <group>
      {lines.map((geom, i) => (
        <mesh key={i} geometry={geom} material={material} />
      ))}
    </group>
  );
});
SpiralGuides.displayName = 'SpiralGuides';

export default StarField;
