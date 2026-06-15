import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HourglassProps {
  timeSpeed: number;
  resetSignal: number;
  clickSignal: number;
}

const PARTICLE_COUNT = 10000;
const TOP_RADIUS_MAX = 50;
const TOP_RADIUS_MIN = 30;
const HALF_HEIGHT = 60;
const NECK_RADIUS = 5;
const BOTTOM_RADIUS_MAX = 50;

function randomInTopCone(): THREE.Vector3 {
  const h = Math.random() * HALF_HEIGHT;
  const t = h / HALF_HEIGHT;
  const radius = TOP_RADIUS_MAX - (TOP_RADIUS_MAX - NECK_RADIUS) * t;
  const angle = Math.random() * Math.PI * 2;
  const r = radius * Math.sqrt(Math.random());
  return new THREE.Vector3(
    Math.cos(angle) * r,
    HALF_HEIGHT - h,
    Math.sin(angle) * r
  );
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, Math.max(0, Math.min(1, t)));
}

function speedToTHREEColor(speed: number): THREE.Color {
  const t = (speed - 0.5) / (3.0 - 0.5);
  const blue = new THREE.Color(0x1E90FF);
  const red = new THREE.Color(0xFF4500);
  return lerpColor(blue, red, t);
}

function noise2D(x: number, z: number): number {
  return (
    Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3 +
    Math.sin(x * 0.05 + 1.5) * Math.cos(z * 0.07 + 2.3) * 5 +
    Math.sin(x * 0.25 + z * 0.2) * 1.5
  );
}

function Hourglass({ timeSpeed, resetSignal, clickSignal }: HourglassProps) {
  const rotationRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  const sizesRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const settledRef = useRef<Uint8Array | null>(null);
  const particleSpeedsRef = useRef<Float32Array | null>(null);
  const targetSpeedsRef = useRef<Float32Array | null>(null);
  const colorTransitionStartRef = useRef<number>(0);
  const prevSpeedColorRef = useRef<THREE.Color>(speedToTHREEColor(1.0));
  const currentSpeedColorRef = useRef<THREE.Color>(speedToTHREEColor(1.0));
  const rotationAngleRef = useRef(0);
  const clickAnimRef = useRef({ active: false, startTime: 0, originalY: new Float32Array(PARTICLE_COUNT) });
  const glowAnimRef = useRef({ active: false, startTime: 0 });
  const currentSpeedRef = useRef(1.0);
  const lastSpeedChangeRef = useRef(0);

  const { positions, colors, sizes, velocities, settled, particleSpeeds, targetSpeeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const siz = new Float32Array(PARTICLE_COUNT);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const set = new Uint8Array(PARTICLE_COUNT);
    const pSpeeds = new Float32Array(PARTICLE_COUNT);
    const tSpeeds = new Float32Array(PARTICLE_COUNT);
    
    const baseColor = speedToTHREEColor(1.0);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v = randomInTopCone();
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      
      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;
      
      siz[i] = 1.5 + Math.random() * 2.5;
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;
      set[i] = 0;
      pSpeeds[i] = 1.0;
      tSpeeds[i] = 1.0;
    }
    
    return { positions: pos, colors: col, sizes: siz, velocities: vel, settled: set, particleSpeeds: pSpeeds, targetSpeeds: tSpeeds };
  }, []);

  useEffect(() => {
    positionsRef.current = positions;
    colorsRef.current = colors;
    sizesRef.current = sizes;
    velocitiesRef.current = velocities;
    settledRef.current = settled;
    particleSpeedsRef.current = particleSpeeds;
    targetSpeedsRef.current = targetSpeeds;
  }, [positions, colors, sizes, velocities, settled, particleSpeeds, targetSpeeds]);

  useEffect(() => {
    if (currentSpeedRef.current !== timeSpeed) {
      prevSpeedColorRef.current = currentSpeedColorRef.current.clone();
      currentSpeedColorRef.current = speedToTHREEColor(timeSpeed);
      lastSpeedChangeRef.current = performance.now() / 1000;
      currentSpeedRef.current = timeSpeed;
      
      if (targetSpeedsRef.current) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          targetSpeedsRef.current[i] = timeSpeed;
        }
      }
    }
  }, [timeSpeed]);

  useEffect(() => {
    const pos = positionsRef.current;
    const set = settledRef.current;
    const pSpeeds = particleSpeedsRef.current;
    const tSpeeds = targetSpeedsRef.current;
    const col = colorsRef.current;
    
    if (!pos || !set || !pSpeeds || !tSpeeds || !col) return;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v = randomInTopCone();
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      set[i] = 0;
      pSpeeds[i] = timeSpeed;
      tSpeeds[i] = timeSpeed;
      
      const c = speedToTHREEColor(timeSpeed);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    
    prevSpeedColorRef.current = speedToTHREEColor(timeSpeed);
    currentSpeedColorRef.current = speedToTHREEColor(timeSpeed);
    lastSpeedChangeRef.current = performance.now() / 1000;
    
    if (particlesRef.current) {
      (particlesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (particlesRef.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }, [resetSignal, timeSpeed]);

  useEffect(() => {
    if (clickSignal === 0) return;
    
    clickAnimRef.current.active = true;
    clickAnimRef.current.startTime = performance.now() / 1000;
    
    glowAnimRef.current.active = true;
    glowAnimRef.current.startTime = performance.now() / 1000;
    
    const pos = positionsRef.current;
    if (pos) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        clickAnimRef.current.originalY[i] = pos[i * 3 + 1];
      }
    }
    
    const set = settledRef.current;
    if (set) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        set[i] = 0;
      }
    }
  }, [clickSignal]);

  useFrame((_, delta) => {
    if (rotationRef.current) {
      const rotSpeed = ((2 * Math.PI) / 5) * (1 + (timeSpeed - 0.5) * (4 / 2.5) * 0);
      const mappedRotSpeed = (2 * Math.PI) / (5 - (timeSpeed - 0.5) * (4 / 2.5));
      rotationAngleRef.current += mappedRotSpeed * delta;
      rotationRef.current.rotation.y = rotationAngleRef.current;
    }
    
    const pos = positionsRef.current;
    const vel = velocitiesRef.current;
    const set = settledRef.current;
    const col = colorsRef.current;
    const pSpeeds = particleSpeedsRef.current;
    const tSpeeds = targetSpeedsRef.current;
    
    if (!pos || !vel || !set || !col || !pSpeeds || !tSpeeds) return;
    
    const now = performance.now() / 1000;
    const colorTransitionT = Math.min(1, (now - lastSpeedChangeRef.current) / 2.0);
    
    let settledCount = 0;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const speedDiff = tSpeeds[i] - pSpeeds[i];
      pSpeeds[i] += speedDiff * Math.min(1, delta * 2);
      
      const cR = prevSpeedColorRef.current.r + (currentSpeedColorRef.current.r - prevSpeedColorRef.current.r) * colorTransitionT;
      const cG = prevSpeedColorRef.current.g + (currentSpeedColorRef.current.g - prevSpeedColorRef.current.g) * colorTransitionT;
      const cB = prevSpeedColorRef.current.b + (currentSpeedColorRef.current.b - prevSpeedColorRef.current.b) * colorTransitionT;
      col[i * 3] = cR;
      col[i * 3 + 1] = cG;
      col[i * 3 + 2] = cB;
      
      let px = pos[i * 3];
      let py = pos[i * 3 + 1];
      let pz = pos[i * 3 + 2];
      
      if (clickAnimRef.current.active) {
        const t = (now - clickAnimRef.current.startTime);
        const originalY = clickAnimRef.current.originalY[i];
        
        if (t < 0.3) {
          const floatT = t / 0.3;
          const ease = 1 - Math.pow(1 - floatT, 3);
          py = originalY + 10 * ease;
          pos[i * 3 + 1] = py;
          continue;
        } else if (t < 0.8) {
          if (t - delta < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const offsetR = Math.random() * 15;
            pos[i * 3] = Math.cos(angle) * offsetR;
            pos[i * 3 + 2] = Math.sin(angle) * offsetR;
          }
          
          const fallT = (t - 0.3) / 0.5;
          const topY = originalY + 10;
          const targetY = -HALF_HEIGHT + 1 + noise2D(pos[i * 3], pos[i * 3 + 2]);
          const ease = fallT * fallT;
          py = topY + (targetY - topY) * ease;
          
          if (fallT >= 1) {
            set[i] = 1;
            py = targetY;
          }
          pos[i * 3 + 1] = py;
          continue;
        } else {
          clickAnimRef.current.active = false;
        }
      }
      
      if (set[i]) {
        settledCount++;
        continue;
      }
      
      let fallSpeed = 15 * pSpeeds[i];
      
      if (py < NECK_RADIUS * 2 && py > -NECK_RADIUS * 2) {
        const distFromCenter = Math.sqrt(px * px + pz * pz);
        if (distFromCenter < NECK_RADIUS * 2) {
          fallSpeed *= 1.2;
        }
      }
      
      if (py > 0 && py < HALF_HEIGHT) {
        const t = (HALF_HEIGHT - py) / HALF_HEIGHT;
        const coneRadius = TOP_RADIUS_MAX - (TOP_RADIUS_MAX - NECK_RADIUS) * t;
        const distFromCenter = Math.sqrt(px * px + pz * pz);
        if (distFromCenter > coneRadius - 1) {
          const scale = (coneRadius - 1) / distFromCenter;
          px *= scale;
          pz *= scale;
        }
      }
      
      py -= fallSpeed * delta;
      
      if (py <= -HALF_HEIGHT + 1) {
        const noiseH = noise2D(px, pz);
        const stackY = -HALF_HEIGHT + 1 + noiseH + settledCount / PARTICLE_COUNT * 15;
        const distFromCenter = Math.sqrt(px * px + pz * pz);
        const bottomT = 1 - Math.min(1, distFromCenter / BOTTOM_RADIUS_MAX);
        const finalY = Math.max(-HALF_HEIGHT + 1, stackY * bottomT + (-HALF_HEIGHT + 1) * (1 - bottomT));
        
        if (py <= finalY) {
          py = finalY;
          set[i] = 1;
          settledCount++;
        }
      }
      
      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;
    }
    
    if (particlesRef.current) {
      (particlesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (particlesRef.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
    
    if (glowRingRef.current && glowAnimRef.current.active) {
      const t = (now - glowAnimRef.current.startTime);
      if (t < 1.0) {
        const scale = 0.1 + t * 5;
        glowRingRef.current.scale.set(scale, scale, scale);
        const mat = glowRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.7 * (1 - t);
      } else {
        glowAnimRef.current.active = false;
        const mat = glowRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
      }
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.8, 1, 64), []);
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x7FFFD4,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  return (
    <group ref={rotationRef}>
      <HourglassShell />
      <points ref={particlesRef} geometry={geometry}>
        <pointsMaterial
          vertexColors
          size={2}
          sizeAttenuation
          transparent
          opacity={0.95}
          color={new THREE.Color(0xFFD8A0)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <mesh ref={glowRingRef} geometry={ringGeometry} material={ringMaterial} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
    </group>
  );
}

function HourglassShell() {
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.6,
    thickness: 0.5,
    ior: 1.5,
    side: THREE.DoubleSide,
  }), []);

  const frameMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.8,
  }), []);

  const topConeGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(50, 60, 64, 1, true);
    g.translate(0, 30, 0);
    return g;
  }, []);

  const bottomConeGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(50, 60, 64, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, -30, 0);
    return g;
  }, []);

  const neckGeo = useMemo(() => new THREE.CylinderGeometry(5, 5, 10, 64, 1, true), []);

  const topRingGeo = useMemo(() => new THREE.TorusGeometry(50, 0.8, 16, 100), []);
  const bottomRingGeo = useMemo(() => new THREE.TorusGeometry(50, 0.8, 16, 100), []);
  const midRingGeo = useMemo(() => new THREE.TorusGeometry(5, 0.5, 12, 64), []);

  return (
    <group>
      <mesh geometry={topConeGeo} material={glassMaterial} />
      <mesh geometry={bottomConeGeo} material={glassMaterial} />
      <mesh geometry={neckGeo} material={glassMaterial} />
      
      <mesh geometry={topRingGeo} material={frameMaterial} position={[0, 60, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={bottomRingGeo} material={frameMaterial} position={[0, -60, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={midRingGeo} material={frameMaterial} rotation={[Math.PI / 2, 0, 0]} />
      
      <SupportLines />
    </group>
  );
}

function SupportLines() {
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.6,
  }), []);

  const createLine = (angle: number) => {
    const points = [];
    const x1 = Math.cos(angle) * 50;
    const z1 = Math.sin(angle) * 50;
    points.push(new THREE.Vector3(x1, 60, z1));
    points.push(new THREE.Vector3(x1 * 0.1, 0, z1 * 0.1));
    points.push(new THREE.Vector3(x1, -60, z1));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const lineObj = new THREE.Line(geo, lineMaterial);
    return <primitive key={angle} object={lineObj} />;
  };

  return (
    <group>
      {createLine(0)}
      {createLine(Math.PI / 2)}
      {createLine(Math.PI)}
      {createLine(Math.PI * 1.5)}
    </group>
  );
}

export default Hourglass;
