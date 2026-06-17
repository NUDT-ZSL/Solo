import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNebulaStore } from '../store/useNebulaStore';
import type { PresetType } from '../types';

function generateSpiralPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const arms = 4;
  const armSpread = 0.5;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const arm = Math.floor(Math.random() * arms);
    const angle = t * Math.PI * 8 + (arm / arms) * Math.PI * 2;
    const r = t * radius * (0.6 + Math.random() * 0.4);

    const spread = (Math.random() - 0.5) * armSpread * r * 0.4;
    const x = Math.cos(angle) * r + spread * Math.cos(angle + Math.PI / 2);
    const z = Math.sin(angle) * r + spread * Math.sin(angle + Math.PI / 2);
    const y = (Math.random() - 0.5) * radius * 0.2 * (1 - t * 0.5);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

function generateEllipticalPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const a = radius;
  const b = radius * 0.4;
  const c = radius * 0.7;

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const r = Math.pow(Math.random(), 0.5);

    const x = r * a * Math.sin(phi) * Math.cos(theta);
    const y = r * b * Math.cos(phi);
    const z = r * c * Math.sin(phi) * Math.sin(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

function generateIrregularPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const clumps = 5;
  const clumpCenters: Array<{ x: number; y: number; z: number; r: number }> = [];

  for (let i = 0; i < clumps; i++) {
    clumpCenters.push({
      x: (Math.random() - 0.5) * radius * 1.2,
      y: (Math.random() - 0.5) * radius * 0.5,
      z: (Math.random() - 0.5) * radius * 1.2,
      r: radius * (0.3 + Math.random() * 0.4),
    });
  }

  for (let i = 0; i < count; i++) {
    const clumpIndex = Math.floor(Math.random() * clumps);
    const clump = clumpCenters[clumpIndex];

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.7) * clump.r;

    positions[i * 3] = clump.x + r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = clump.y + r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = clump.z + r * Math.cos(phi);
  }
  return positions;
}

function generateColors(
  count: number,
  positions: Float32Array,
  radius: number,
  hueOffset: number,
  primaryColor: string
): Float32Array {
  const colors = new Float32Array(count * 3);
  const primary = new THREE.Color(primaryColor);

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    const t = Math.min(dist / radius, 1);

    const centerHue = (30 + hueOffset) / 360;
    const edgeHue = (220 + hueOffset) / 360;
    const hue = centerHue + (edgeHue - centerHue) * t;

    const saturation = 0.8 - t * 0.2;
    const lightness = 0.6 - t * 0.2;

    const tempColor = new THREE.Color().setHSL(hue, saturation, lightness);
    tempColor.lerp(primary, 0.3);

    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }
  return colors;
}

function generateSizes(count: number): Float32Array {
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sizes[i] = 0.1 + Math.random() * 0.4;
  }
  return sizes;
}

function generateOpacities(count: number, baseOpacity: number): Float32Array {
  const opacities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    opacities[i] = Math.min(1, Math.max(0.1, baseOpacity * (0.6 + Math.random() * 0.8)));
  }
  return opacities;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpArray(a: Float32Array, b: Float32Array, t: number, out: Float32Array): void {
  const len = Math.min(a.length, b.length, out.length);
  for (let i = 0; i < len; i++) {
    out[i] = a[i] + (b[i] - a[i]) * t;
  }
}

interface NebulaParticlesProps {
  preset: PresetType;
  density: number;
  hueOffset: number;
  sizeScale: number;
  rotationSpeed: number;
  brightness: number;
  opacityBase: number;
  primaryColor: string;
}

function NebulaParticles({
  preset,
  density,
  hueOffset,
  sizeScale,
  rotationSpeed,
  brightness,
  opacityBase,
  primaryColor,
}: NebulaParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const nebulaRadius = 20;

  const [targetPositions, setTargetPositions] = useState<Float32Array>(() =>
    generateSpiralPositions(density, nebulaRadius)
  );
  const [targetColors, setTargetColors] = useState<Float32Array>(() =>
    generateColors(density, targetPositions, nebulaRadius, hueOffset, primaryColor)
  );
  const [targetSizes, setTargetSizes] = useState<Float32Array>(() => generateSizes(density));
  const [targetOpacities, setTargetOpacities] = useState<Float32Array>(() =>
    generateOpacities(density, opacityBase)
  );

  const [currentPositions, setCurrentPositions] = useState<Float32Array>(() =>
    new Float32Array(targetPositions)
  );
  const [currentColors, setCurrentColors] = useState<Float32Array>(() =>
    new Float32Array(targetColors)
  );

  const [transitionProgress, setTransitionProgress] = useState(1);
  const [isPresetChange, setIsPresetChange] = useState(false);
  const lastPresetRef = useRef<PresetType>(preset);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));
    return geo;
  }, []);

  useEffect(() => {
    let newPositions: Float32Array;

    switch (preset) {
      case 'spiral':
        newPositions = generateSpiralPositions(density, nebulaRadius);
        break;
      case 'elliptical':
        newPositions = generateEllipticalPositions(density, nebulaRadius);
        break;
      case 'irregular':
        newPositions = generateIrregularPositions(density, nebulaRadius);
        break;
    }

    const newColors = generateColors(density, newPositions, nebulaRadius, hueOffset, primaryColor);
    const newSizes = generateSizes(density);
    const newOpacities = generateOpacities(density, opacityBase);

    const presetChanged = lastPresetRef.current !== preset;
    lastPresetRef.current = preset;

    setCurrentPositions(new Float32Array(targetPositions));
    setCurrentColors(new Float32Array(targetColors));

    setTargetPositions(newPositions);
    setTargetColors(newColors);
    setTargetSizes(newSizes);
    setTargetOpacities(newOpacities);

    setTransitionProgress(0);
    setIsPresetChange(presetChanged);
  }, [preset, density, hueOffset, primaryColor, opacityBase]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const transitionDuration = isPresetChange ? 1.0 : 0.5;
    const progressDelta = delta / transitionDuration;
    const newProgress = Math.min(1, transitionProgress + progressDelta);
    setTransitionProgress(newProgress);

    const t = 1 - Math.pow(1 - newProgress, 3);

    const posAttr = meshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = meshRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    lerpArray(currentPositions, targetPositions, t, posArray);
    lerpArray(currentColors, targetColors, t, colArray);

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    meshRef.current.rotation.y += rotationSpeed * delta * 60;

    const material = meshRef.current.material as THREE.PointsMaterial;
    material.size = 0.5 * sizeScale * brightness;
    material.opacity = 1;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Starfield() {
  const starsRef = useRef<THREE.Points>(null);
  const starCount = 200;

  const { positions, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const siz = new Float32Array(starCount);
    const ph = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      siz[i] = 1;
      ph[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, sizes: siz, phases: ph };
  }, []);

  useFrame(({ clock }) => {
    if (!starsRef.current) return;

    const material = starsRef.current.material as THREE.PointsMaterial;
    const time = clock.getElapsedTime();

    const geometry = starsRef.current.geometry;
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < starCount; i++) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + phases[i]);
      (sizeAttr.array as Float32Array)[i] = 0.5 + twinkle * 0.8;
    }
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function WASDControls() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const baseSpeed = keys.current['shift'] ? 5 : 2;
    const speed = baseSpeed * delta;

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    if (keys.current['w']) {
      direction.add(forward);
    }
    if (keys.current['s']) {
      direction.sub(forward);
    }
    if (keys.current['a']) {
      direction.sub(right);
    }
    if (keys.current['d']) {
      direction.add(right);
    }

    if (direction.length() > 0) {
      direction.normalize();
      velocity.current.lerp(direction.multiplyScalar(speed), 0.1);
      camera.position.add(velocity.current);
    } else {
      velocity.current.multiplyScalar(0.9);
      camera.position.add(velocity.current);
    }
  });

  return null;
}

function SceneContent() {
  const {
    density,
    hueOffset,
    sizeScale,
    rotationSpeed,
    brightness,
    opacityBase,
    primaryColor,
    preset,
  } = useNebulaStore();

  return (
    <>
      <ambientLight intensity={0.1} />
      <NebulaParticles
        preset={preset}
        density={density}
        hueOffset={hueOffset}
        sizeScale={sizeScale}
        rotationSpeed={rotationSpeed}
        brightness={brightness}
        opacityBase={opacityBase}
        primaryColor={primaryColor}
      />
      <Starfield />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
        enablePan={false}
      />
      <WASDControls />
    </>
  );
}

export function NebulaScene() {
  return (
    <div className="nebula-scene">
      <Canvas
        camera={{ position: [0, 5, 30], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color('#000011');
          gl.setClearColor('#000011');
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
