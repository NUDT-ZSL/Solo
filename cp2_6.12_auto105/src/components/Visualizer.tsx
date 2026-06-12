import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SpectrumData } from '../audio/analyzer';
import { VisualizerParams, ColorTheme, ViewMode } from './ControlPanel';

interface VisualizerProps {
  spectrumData: SpectrumData | null;
  params: VisualizerParams;
  onFPSUpdate?: (fps: number) => void;
}

interface ThemeRange {
  hStart: number;
  hEnd: number;
  s: number;
  l: number;
}

const colorThemeRanges: Record<ColorTheme, ThemeRange> = {
  aurora: { hStart: 160, hEnd: 200, s: 90, l: 60 },
  lava: { hStart: 0, hEnd: 40, s: 90, l: 55 },
  galaxy: { hStart: 260, hEnd: 300, s: 80, l: 60 },
  neon: { hStart: 320, hEnd: 350, s: 100, l: 65 },
  classic: { hStart: 0, hEnd: 0, s: 0, l: 100 },
};

const viewPositions: Record<ViewMode, [number, number, number]> = {
  front: [0, 0, 20],
  top: [15, 15, 15],
  side: [20, 0, 0],
  free: [0, 0, 20],
};

interface ParticleSystemProps {
  count: number;
  spectrumData: SpectrumData | null;
  colorTheme: ColorTheme;
  sizeMultiplier: number;
  rotationSpeed: number;
  onFPSUpdate: (fps: number) => void;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count,
  spectrumData,
  colorTheme,
  sizeMultiplier,
  rotationSpeed,
  onFPSUpdate,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  const baseDirectionsRef = useRef<Float32Array | null>(null);
  const pulsePhaseRef = useRef<Float32Array | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const smoothRadiusRef = useRef(20);
  const smoothLowRef = useRef(0);
  const smoothMidRef = useRef(0);
  const smoothHighRef = useRef(0);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const dir = new Float32Array(count * 3);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 16 + Math.random() * 4;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      dir[i * 3] = x / len;
      dir[i * 3 + 1] = y / len;
      dir[i * 3 + 2] = z / len;

      col[i * 3] = 1;
      col[i * 3 + 1] = 1;
      col[i * 3 + 2] = 1;

      siz[i] = 0.15;
      phase[i] = Math.random() * Math.PI * 2;
    }

    basePositionsRef.current = pos.slice();
    baseDirectionsRef.current = dir;
    pulsePhaseRef.current = phase;

    return { positions: pos, colors: col, sizes: siz };
  }, [count]);

  useEffect(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.computeBoundingSphere();
  }, [positions, colors, sizes]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute('size') as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    const siz = sizeAttr.array as Float32Array;
    const basePos = basePositionsRef.current!;
    const baseDir = baseDirectionsRef.current!;
    const pulsePhase = pulsePhaseRef.current!;
    const time = clock.getElapsedTime();

    frameCountRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 500) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      onFPSUpdate(fps);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let hasAudio = false;

    if (spectrumData) {
      hasAudio = true;
      const freq = spectrumData.frequencies;
      for (let i = 0; i < 17; i++) lowEnergy += freq[i];
      lowEnergy /= (17 * 255);
      for (let i = 17; i < 49; i++) midEnergy += freq[i];
      midEnergy /= (32 * 255);
      for (let i = 49; i < 64; i++) highEnergy += freq[i];
      highEnergy /= (15 * 255);
    }

    const smoothFactor = 0.15;
    smoothLowRef.current += (lowEnergy - smoothLowRef.current) * smoothFactor;
    smoothMidRef.current += (midEnergy - smoothMidRef.current) * smoothFactor;
    smoothHighRef.current += (highEnergy - smoothHighRef.current) * smoothFactor;

    const targetRadius = 16 + smoothLowRef.current * 14;
    smoothRadiusRef.current += (targetRadius - smoothRadiusRef.current) * smoothFactor;

    const theme = colorThemeRanges[colorTheme];
    const hue = colorTheme === 'classic'
      ? 0
      : theme.hStart - smoothMidRef.current * (theme.hStart - theme.hEnd);

    pointsRef.current.rotation.y = time * rotationSpeed * 0.2;
    pointsRef.current.rotation.x = Math.sin(time * rotationSpeed * 0.1) * 0.1;

    const radialScale = 1 + smoothMidRef.current * 0.6;
    const sizeBase = 0.15;
    const sizeVar = 0.42;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const bx = basePos[i3];
      const by = basePos[i3 + 1];
      const bz = basePos[i3 + 2];

      if (hasAudio) {
        const pulse = Math.sin(time * 3 + pulsePhase[i]) * 0.5 + 0.5;
        const radialOffset = smoothMidRef.current * pulse * 4;
        const scale = (smoothRadiusRef.current / 20) * radialScale;

        pos[i3] = bx * scale + baseDir[i3] * radialOffset;
        pos[i3 + 1] = by * scale + baseDir[i3 + 1] * radialOffset;
        pos[i3 + 2] = bz * scale + baseDir[i3 + 2] * radialOffset;
      } else {
        pos[i3] = bx + (Math.random() - 0.5) * 0.01;
        pos[i3 + 1] = by + (Math.random() - 0.5) * 0.01;
        pos[i3 + 2] = bz + (Math.random() - 0.5) * 0.01;
      }

      if (colorTheme === 'classic') {
        col[i3] = 1;
        col[i3 + 1] = 1;
        col[i3 + 2] = 1;
      } else {
        const particleHue = hue + (i % 20) * 0.5;
        const h = ((particleHue % 360) + 360) % 360;
        const s = theme.s / 100;
        const l = theme.l / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        col[i3] = r + m;
        col[i3 + 1] = g + m;
        col[i3 + 2] = b + m;
      }

      siz[i] = (sizeBase + smoothHighRef.current * sizeVar) * sizeMultiplier;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={0.15}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface CameraControllerProps {
  viewMode: ViewMode;
  controlsRef: React.MutableRefObject<any>;
}

const CameraController: React.FC<CameraControllerProps> = ({ viewMode, controlsRef }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (viewMode === 'free') return;
    const target = viewPositions[viewMode];
    const startX = camera.position.x;
    const startY = camera.position.y;
    const startZ = camera.position.z;
    const duration = 600;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      camera.position.x = startX + (target[0] - startX) * ease;
      camera.position.y = startY + (target[1] - startY) * ease;
      camera.position.z = startZ + (target[2] - startZ) * ease;
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [viewMode, camera, controlsRef]);

  return null;
};

const BackgroundGradient: React.FC = () => {
  return (
    <mesh scale={[100, 100, 1]} position={[0, 0, -50]}>
      <planeGeometry />
      <shaderMaterial
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          void main() {
            vec3 color1 = vec3(0.039, 0.039, 0.18);
            vec3 color2 = vec3(0.18, 0.063, 0.396);
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(vUv, center);
            float mixFactor = smoothstep(0.0, 0.8, dist);
            vec3 color = mix(color1, color2, mixFactor);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
        depthWrite={false}
      />
    </mesh>
  );
};

interface FPSCounterProps {
  fps: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ fps }) => {
  const low = fps < 30;
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        padding: '4px 10px',
        fontSize: 12,
        fontFamily: 'monospace',
        color: low ? '#ff4444' : '#ffffff',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 4,
        zIndex: 200,
        animation: low ? 'blink 0.8s infinite' : 'none',
        pointerEvents: 'none',
      }}
    >
      FPS: {fps}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

const Visualizer: React.FC<VisualizerProps> = ({ spectrumData, params }) => {
  const [fps, setFps] = useState(60);
  const controlsRef = useRef<any>(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <BackgroundGradient />
        <CameraController viewMode={params.viewMode} controlsRef={controlsRef} />
        <ParticleSystem
          key={params.particleDensity}
          count={params.particleDensity}
          spectrumData={spectrumData}
          colorTheme={params.colorTheme}
          sizeMultiplier={params.sizeMultiplier}
          rotationSpeed={params.rotationSpeed}
          onFPSUpdate={setFps}
        />
        <OrbitControls
          ref={controlsRef}
          enablePan={params.viewMode === 'free'}
          enableRotate={params.viewMode === 'free'}
          enableZoom={params.viewMode === 'free'}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
      <FPSCounter fps={fps} />
    </div>
  );
};

export default Visualizer;
