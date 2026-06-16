import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Fish, ControlData, updateFish, FISH_TYPES } from './FishSimulation';

interface SceneProps {
  controlData: ControlData;
  fishData: Fish[];
  onFishClick: (fishId: number) => void;
  onFishUpdate: (fish: Fish[]) => void;
  environmentEnabled: boolean;
}

function createFishGeometry(shape: string): THREE.BufferGeometry {
  switch (shape) {
    case 'triangle': {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -0.3, -0.15, 0,
        0.3, 0, 0,
        -0.3, 0.15, 0,
        -0.3, -0.15, -0.08,
        0.3, 0, -0.08,
        -0.3, 0.15, -0.08,
        -0.3, -0.15, 0,
        -0.3, -0.15, -0.08,
        -0.3, 0.15, -0.08,
        -0.3, 0.15, -0.08,
        -0.3, 0.15, 0,
        -0.3, -0.15, 0,
        0.3, 0, 0,
        0.3, 0, -0.08,
        -0.3, 0.15, -0.08,
        -0.3, 0.15, 0,
        0.3, 0, 0,
        0.3, 0, -0.08,
        -0.3, -0.15, 0,
        -0.5, -0.1, 0,
        -0.3, 0, 0,
        -0.5, 0.1, 0,
        -0.3, 0, 0,
        -0.5, -0.1, -0.04,
        -0.3, 0, -0.04,
        -0.5, 0.1, -0.04,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    }
    case 'circle': {
      const geometry = new THREE.SphereGeometry(0.25, 16, 16);
      geometry.scale(1.2, 0.8, 0.4);
      const tailGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
      tailGeometry.rotateY(Math.PI / 2);
      tailGeometry.translate(-0.35, 0, 0);
      const merged = mergeGeometries([geometry, tailGeometry]);
      return merged;
    }
    case 'streamline': {
      const geometry = new THREE.CapsuleGeometry(0.12, 0.4, 8, 16);
      geometry.rotateZ(Math.PI / 2);
      const tailGeometry = new THREE.ConeGeometry(0.12, 0.25, 4);
      tailGeometry.rotateY(Math.PI / 2);
      tailGeometry.translate(-0.4, 0, 0);
      const merged = mergeGeometries([geometry, tailGeometry]);
      return merged;
    }
    case 'flat': {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -0.3, -0.25, 0,
        0.35, 0, 0,
        -0.3, 0.25, 0,
        -0.3, -0.25, -0.05,
        0.35, 0, -0.05,
        -0.3, 0.25, -0.05,
        -0.3, -0.25, 0,
        -0.3, -0.25, -0.05,
        -0.3, 0.25, -0.05,
        -0.3, 0.25, -0.05,
        -0.3, 0.25, 0,
        -0.3, -0.25, 0,
        0.35, 0, 0,
        0.35, 0, -0.05,
        -0.3, 0.25, -0.05,
        -0.3, 0.25, 0,
        0.35, 0, 0,
        0.35, 0, -0.05,
        -0.3, -0.25, 0,
        -0.5, -0.15, 0,
        -0.3, 0, 0,
        -0.5, 0.15, 0,
        -0.3, 0, 0,
        -0.5, -0.15, -0.025,
        -0.3, 0, -0.025,
        -0.5, 0.15, -0.025,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    }
    case 'long': {
      const geometry = new THREE.CapsuleGeometry(0.1, 0.6, 8, 16);
      geometry.rotateZ(Math.PI / 2);
      const tailGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
      tailGeometry.rotateY(Math.PI / 2);
      tailGeometry.translate(-0.5, 0, 0);
      const topFinGeometry = new THREE.ConeGeometry(0.08, 0.25, 4);
      topFinGeometry.rotateX(Math.PI);
      topFinGeometry.translate(0.1, 0.2, 0);
      const bottomFinGeometry = new THREE.ConeGeometry(0.08, 0.25, 4);
      bottomFinGeometry.translate(0.1, -0.2, 0);
      const merged = mergeGeometries([geometry, tailGeometry, topFinGeometry, bottomFinGeometry]);
      return merged;
    }
    default:
      return new THREE.SphereGeometry(0.2, 8, 8);
  }
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const mergedGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  
  geometries.forEach(geometry => {
    geometry.computeVertexNormals();
    const pos = geometry.attributes.position.array as Float32Array;
    const nor = geometry.attributes.normal.array as Float32Array;
    positions.push(...pos);
    normals.push(...nor);
  });
  
  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  
  return mergedGeometry;
}

function FishMesh({ 
  fish, 
  onClick, 
  geometry,
  isHighlighted 
}: { 
  fish: Fish; 
  onClick: () => void; 
  geometry: THREE.BufferGeometry;
  isHighlighted: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tailWag = useRef(0);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        fish.position.x,
        fish.position.y,
        fish.position.z
      );
      meshRef.current.rotation.set(
        fish.rotation.x,
        fish.rotation.y,
        fish.rotation.z + tailWag.current
      );
      
      if (!fish.isPaused) {
        tailWag.current = Math.sin(fish.wavePhase) * 0.3;
      }
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshStandardMaterial 
        color={fish.color}
        emissive={isHighlighted ? fish.color : '#000000'}
        emissiveIntensity={isHighlighted ? 0.5 : 0}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

function Coral({ position, color, scale, environmentEnabled }: { position: [number, number, number]; color: string; scale: number; environmentEnabled: boolean }) {
  const coralRef = useRef<THREE.Group>(null);
  const timeOffset = useRef(Math.random() * Math.PI * 2);
  const swaySpeed = useRef(0.8 + Math.random() * 0.4);
  
  useFrame(() => {
    if (coralRef.current && environmentEnabled) {
      const time = Date.now() * 0.001;
      const baseSway = Math.sin(time * swaySpeed.current + timeOffset.current) * 0.08;
      const secondarySway = Math.sin(time * swaySpeed.current * 1.3 + timeOffset.current * 0.7) * 0.03;
      
      coralRef.current.rotation.y = baseSway + secondarySway;
      coralRef.current.rotation.x = Math.sin(time * swaySpeed.current * 0.6 + timeOffset.current) * 0.03;
    }
  });
  
  const geometries = useMemo(() => {
    const geoms: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const height = 0.3 + Math.random() * 0.5;
      const geom = new THREE.ConeGeometry(0.08 + Math.random() * 0.05, height, 6);
      geom.translate(
        (Math.random() - 0.5) * 0.3,
        height / 2,
        (Math.random() - 0.5) * 0.3
      );
      geoms.push(geom);
    }
    const baseGeom = new THREE.SphereGeometry(0.15, 8, 8);
    baseGeom.scale(1.5, 0.6, 1.5);
    baseGeom.translate(0, 0.05, 0);
    geoms.push(baseGeom);
    return mergeGeometries(geoms);
  }, []);
  
  return (
    <group ref={coralRef} position={position} scale={scale}>
      <mesh geometry={geometries}>
        <meshStandardMaterial 
          color={color}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

function Seaweed({ position, height, environmentEnabled }: { position: [number, number, number]; height: number; environmentEnabled: boolean }) {
  const seaweedRef = useRef<THREE.Group>(null);
  const timeOffset = useRef(Math.random() * Math.PI * 2);
  const waveSpeed = useRef(1.0 + Math.random() * 0.5);
  
  useFrame(() => {
    if (seaweedRef.current && environmentEnabled) {
      const time = Date.now() * 0.001;
      seaweedRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const wavePhase = time * waveSpeed.current + timeOffset.current + i * 0.4;
          
          const zSway = Math.sin(wavePhase) * 0.12;
          const xSway = Math.sin(wavePhase * 1.3 + timeOffset.current * 0.5) * 0.08;
          
          child.rotation.z = zSway * (1 + i * 0.25);
          child.rotation.x = xSway * (1 + i * 0.15);
        }
      });
    }
  });
  
  const segments = useMemo(() => {
    const segs: { geom: THREE.BufferGeometry; y: number }[] = [];
    const segmentCount = 6;
    const segmentHeight = height / segmentCount;
    
    for (let i = 0; i < segmentCount; i++) {
      const radius = 0.06 * (1 - i / segmentCount * 0.5);
      const geom = new THREE.CylinderGeometry(radius, radius * 0.9, segmentHeight, 6);
      segs.push({ geom, y: i * segmentHeight + segmentHeight / 2 });
    }
    return segs;
  }, [height]);
  
  return (
    <group ref={seaweedRef} position={position}>
      {segments.map((seg, i) => (
        <mesh key={i} geometry={seg.geom} position={[0, seg.y, 0]}>
          <meshStandardMaterial 
            color="#2E8B57"
            metalness={0.1}
            roughness={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Bubbles({ enabled }: { enabled: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const bubbleCount = 65;
  
  const { positions, sizes, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(bubbleCount * 3);
    const sizes = new Float32Array(bubbleCount);
    const speeds = new Float32Array(bubbleCount);
    const offsets = new Float32Array(bubbleCount);
    
    for (let i = 0; i < bubbleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = -3 + Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      sizes[i] = 0.03 + Math.random() * 0.08;
      speeds[i] = 0.5 + Math.random() * 1.5;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions, sizes, speeds, offsets };
  }, []);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);
  
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: window.devicePixelRatio }
    },
    vertexShader: `
      attribute float size;
      uniform float time;
      uniform float pixelRatio;
      varying float vAlpha;
      varying float vSize;
      
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vSize = size;
        vAlpha = 0.3 + 0.4 * sin(position.y * 0.8 + time * 2.0);
        gl_PointSize = size * 300.0 * pixelRatio / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vSize;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float edge = smoothstep(0.5, 0.3, dist);
        float highlight = smoothstep(0.2, 0.0, dist);
        
        vec3 color = vec3(0.9, 0.95, 1.0);
        float alpha = edge * vAlpha;
        
        gl_FragColor = vec4(color + highlight * 0.3, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);
  
  useFrame((_, delta) => {
    if (!particlesRef.current || !enabled) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < bubbleCount; i++) {
      const i3 = i * 3;
      
      positions[i3 + 1] += speeds[i] * delta * 0.8;
      
      positions[i3] += Math.sin(time * speeds[i] + offsets[i]) * delta * 0.3;
      positions[i3 + 2] += Math.cos(time * speeds[i] * 0.7 + offsets[i]) * delta * 0.2;
      
      if (positions[i3 + 1] > 4.5) {
        positions[i3] = (Math.random() - 0.5) * 14;
        positions[i3 + 1] = -2.8;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    
    if (material.uniforms) {
      material.uniforms.time.value = time;
    }
  });
  
  if (!enabled) return null;
  
  return (
    <points ref={particlesRef} geometry={geometry} material={material}>
    </points>
  );
}

function DynamicLighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const topLightRef = useRef<THREE.PointLight>(null);
  const bottomLightRef = useRef<THREE.PointLight>(null);
  const cyclePhase = useRef(0);
  
  const colorA = useMemo(() => new THREE.Color('#87CEEB'), []);
  const colorB = useMemo(() => new THREE.Color('#FFD93D'), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  useFrame((_, delta) => {
    cyclePhase.current += delta * 0.05;
    
    const t = (Math.sin(cyclePhase.current) + 1) * 0.5;
    
    tempColor.copy(colorA).lerp(colorB, t);
    
    if (ambientRef.current) {
      ambientRef.current.color.copy(tempColor).lerp(new THREE.Color('#ffffff'), 0.6);
      ambientRef.current.intensity = 0.35 + t * 0.15;
    }
    
    if (directionalRef.current) {
      directionalRef.current.color.copy(tempColor).lerp(new THREE.Color('#FFFFFF'), 0.7);
      directionalRef.current.intensity = 0.8 + t * 0.4;
    }
    
    if (topLightRef.current) {
      topLightRef.current.color.copy(tempColor);
      topLightRef.current.intensity = 0.4 + t * 0.3;
    }
    
    if (bottomLightRef.current) {
      const warmT = (Math.sin(cyclePhase.current * 0.7 + Math.PI) + 1) * 0.5;
      bottomLightRef.current.color.lerpColors(
        new THREE.Color('#FFA07A'),
        new THREE.Color('#FF6B6B'),
        warmT
      );
      bottomLightRef.current.intensity = 0.2 + warmT * 0.2;
    }
  });
  
  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.4} />
      <directionalLight 
        ref={directionalRef}
        position={[5, 10, 5]} 
        intensity={1} 
        castShadow
      />
      <pointLight ref={topLightRef} position={[0, 4.5, 0]} intensity={0.5} color="#87CEEB" distance={20} />
      <pointLight ref={bottomLightRef} position={[0, -2.5, 0]} intensity={0.3} color="#FFD93D" distance={15} />
    </>
  );
}

function WaterSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    colorA: { value: new THREE.Color('#87CEEB') },
    colorB: { value: new THREE.Color('#4ECDC4') },
    surfaceColor: { value: new THREE.Color('#B0E0E6') }
  }), []);
  
  const vertexShader = `
    uniform float time;
    varying vec2 vUv;
    varying float vWaveHeight;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float wave1 = sin(pos.x * 3.0 + time * 1.5) * 0.06;
      float wave2 = sin(pos.z * 2.5 + time * 1.2) * 0.05;
      float wave3 = sin((pos.x + pos.z) * 2.0 + time * 0.8) * 0.04;
      float wave4 = sin((pos.x - pos.z) * 3.5 + time * 2.0) * 0.03;
      
      float totalWave = wave1 + wave2 + wave3 + wave4;
      pos.y += totalWave;
      vWaveHeight = totalWave;
      
      float dx = cos(pos.x * 3.0 + time * 1.5) * 3.0 * 0.06
               + cos((pos.x + pos.z) * 2.0 + time * 0.8) * 2.0 * 0.04
               + cos((pos.x - pos.z) * 3.5 + time * 2.0) * 3.5 * 0.03;
      float dz = cos(pos.z * 2.5 + time * 1.2) * 2.5 * 0.05
               + cos((pos.x + pos.z) * 2.0 + time * 0.8) * 2.0 * 0.04
               - cos((pos.x - pos.z) * 3.5 + time * 2.0) * 3.5 * 0.03;
      
      vNormal = normalize(vec3(-dx, 1.0, -dz));
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const fragmentShader = `
    uniform float time;
    uniform vec3 colorA;
    uniform vec3 colorB;
    uniform vec3 surfaceColor;
    
    varying vec2 vUv;
    varying float vWaveHeight;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      
      float colorMix = (vWaveHeight + 0.18) * 2.5;
      colorMix = clamp(colorMix, 0.0, 1.0);
      vec3 baseColor = mix(colorA, colorB, colorMix * 0.3 + 0.35);
      
      float highlight1 = smoothstep(0.08, 0.15, vWaveHeight);
      float highlight2 = smoothstep(0.05, 0.12, vWaveHeight) * (1.0 - smoothstep(0.1, 0.15, vWaveHeight));
      vec3 highlight = surfaceColor * (highlight1 * 0.5 + highlight2 * 0.3);
      
      float ripple1 = sin(vUv.x * 50.0 + time * 3.0) * 0.5 + 0.5;
      float ripple2 = sin(vUv.y * 45.0 + time * 2.5) * 0.5 + 0.5;
      float ripples = ripple1 * ripple2 * 0.15;
      
      vec3 finalColor = baseColor + highlight + vec3(ripples);
      float finalAlpha = mix(0.25, 0.55, fresnel);
      
      finalColor = mix(finalColor, vec3(1.0), fresnel * 0.3);
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;
  
  useFrame(() => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.time.value = Date.now() * 0.001;
    }
  });
  
  const waterMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  }), [uniforms, vertexShader, fragmentShader]);
  
  return (
    <mesh ref={meshRef} position={[0, 4.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[17, 11, 64, 64]} />
      <primitive object={waterMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

function TankGlass() {
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.15,
    roughness: 0,
    metalness: 0,
    transmission: 0.9,
    thickness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0,
    side: THREE.DoubleSide
  }), []);
  
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.8,
    roughness: 0.3
  }), []);
  
  const tankSize = { width: 17, height: 8, depth: 11 };
  
  return (
    <group>
      {/* Bottom */}
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[tankSize.width, tankSize.depth]} />
        <meshStandardMaterial color="#0a1628" metalness={0.3} roughness={0.8} />
      </mesh>
      
      {/* Glass walls */}
      {/* Front */}
      <mesh position={[0, 0.5, -tankSize.depth / 2]} material={glassMaterial}>
        <boxGeometry args={[tankSize.width, tankSize.height, 0.1]} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.5, tankSize.depth / 2]} material={glassMaterial}>
        <boxGeometry args={[tankSize.width, tankSize.height, 0.1]} />
      </mesh>
      {/* Left */}
      <mesh position={[-tankSize.width / 2, 0.5, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, tankSize.height, tankSize.depth]} />
      </mesh>
      {/* Right */}
      <mesh position={[tankSize.width / 2, 0.5, 0]} material={glassMaterial}>
        <boxGeometry args={[0.1, tankSize.height, tankSize.depth]} />
      </mesh>
      
      {/* Frame edges */}
      {/* Bottom frame */}
      <mesh position={[0, -3, -tankSize.depth / 2]} material={frameMaterial}>
        <boxGeometry args={[tankSize.width + 0.4, 0.2, 0.3]} />
      </mesh>
      <mesh position={[0, -3, tankSize.depth / 2]} material={frameMaterial}>
        <boxGeometry args={[tankSize.width + 0.4, 0.2, 0.3]} />
      </mesh>
      <mesh position={[-tankSize.width / 2, -3, 0]} material={frameMaterial}>
        <boxGeometry args={[0.3, 0.2, tankSize.depth]} />
      </mesh>
      <mesh position={[tankSize.width / 2, -3, 0]} material={frameMaterial}>
        <boxGeometry args={[0.3, 0.2, tankSize.depth]} />
      </mesh>
      
      {/* Top frame */}
      <mesh position={[0, 5, -tankSize.depth / 2]} material={frameMaterial}>
        <boxGeometry args={[tankSize.width + 0.4, 0.2, 0.3]} />
      </mesh>
      <mesh position={[0, 5, tankSize.depth / 2]} material={frameMaterial}>
        <boxGeometry args={[tankSize.width + 0.4, 0.2, 0.3]} />
      </mesh>
      <mesh position={[-tankSize.width / 2, 5, 0]} material={frameMaterial}>
        <boxGeometry args={[0.3, 0.2, tankSize.depth]} />
      </mesh>
      <mesh position={[tankSize.width / 2, 5, 0]} material={frameMaterial}>
        <boxGeometry args={[0.3, 0.2, tankSize.depth]} />
      </mesh>
    </group>
  );
}

export default function Scene({ controlData, fishData, onFishClick, onFishUpdate, environmentEnabled }: SceneProps) {
  const { camera } = useThree();
  const elapsedTime = useRef(0);
  const [highlightedFishId, setHighlightedFishId] = useState<number | null>(null);
  
  useEffect(() => {
    camera.position.set(0, 3, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  const fishGeometries = useMemo(() => {
    return FISH_TYPES.map(type => createFishGeometry(type.shape));
  }, []);
  
  const coralData = useMemo(() => {
    const corals: { position: [number, number, number]; color: string; scale: number }[] = [];
    const coralColors = ['#FF6B6B', '#FFD93D', '#6BCB77'];
    
    for (let i = 0; i < 12; i++) {
      corals.push({
        position: [
          (Math.random() - 0.5) * 14,
          -2.8,
          (Math.random() - 0.5) * 8
        ],
        color: coralColors[i % 3],
        scale: 0.8 + Math.random() * 1.2
      });
    }
    return corals;
  }, []);
  
  const seaweedData = useMemo(() => {
    const seaweeds: { position: [number, number, number]; height: number }[] = [];
    
    for (let i = 0; i < 8; i++) {
      seaweeds.push({
        position: [
          (Math.random() - 0.5) * 14,
          -2.8,
          (Math.random() - 0.5) * 8
        ],
        height: 1.5 + Math.random() * 2
      });
    }
    return seaweeds;
  }, []);
  
  useFrame((_, delta) => {
    elapsedTime.current += delta;
    const updatedFish = updateFish(fishData, delta, elapsedTime.current, controlData);
    onFishUpdate(updatedFish);
  });
  
  const handleFishClick = (fishId: number) => {
    setHighlightedFishId(fishId);
    onFishClick(fishId);
    
    setTimeout(() => {
      setHighlightedFishId(null);
    }, 500);
  };
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1} 
        castShadow
      />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#87CEEB" />
      <pointLight position={[0, -2, 0]} intensity={0.3} color="#FFD93D" />
      
      <fog attach="fog" args={['#0B3D91', 10, 25]} />
      
      <TankGlass />
      
      <Bubbles enabled={environmentEnabled} />
      
      {coralData.map((coral, i) => (
        <Coral key={`coral-${i}`} {...coral} environmentEnabled={environmentEnabled} />
      ))}
      
      {seaweedData.map((seaweed, i) => (
        <Seaweed key={`seaweed-${i}`} {...seaweed} environmentEnabled={environmentEnabled} />
      ))}
      
      {fishData.map(fish => (
        <FishMesh
          key={fish.id}
          fish={fish}
          geometry={fishGeometries[fish.type]}
          onClick={() => handleFishClick(fish.id)}
          isHighlighted={highlightedFishId === fish.id || fish.isPaused}
        />
      ))}
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={20}
        enablePan={true}
        panSpeed={0.5}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  );
}
