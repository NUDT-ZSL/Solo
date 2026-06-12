import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnergyRippleData } from '../core/SimulationEngine';

interface OceanRendererProps {
  resolution: number;
  onMeshClick: (x: number, y: number) => void;
  rippleDataRef: React.MutableRefObject<EnergyRippleData[]>;
  heightMapRef: React.MutableRefObject<Float32Array | null>;
}

const waterVertexShader = `
  varying vec3 vWorldNormal;
  varying float vHeight;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    vHeight = position.y;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorPeak;
  uniform vec3 uColorMid;
  uniform vec3 uColorTrough;
  uniform float uSpecIntensity;
  uniform float uSpecSharpness;
  uniform float uTroughSaturationFactor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform vec3 uLightDir;

  varying vec3 vWorldNormal;
  varying float vHeight;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  vec3 rgb2hsl(vec3 c) {
    float cMax = max(max(c.r, c.g), c.b);
    float cMin = min(min(c.r, c.g), c.b);
    float delta = cMax - cMin;
    vec3 hsl = vec3(0.0, 0.0, (cMax + cMin) * 0.5);
    if (delta > 0.0001) {
      hsl.y = hsl.z < 0.5 ? delta / (cMax + cMin) : delta / (2.0 - cMax - cMin);
      if (cMax == c.r) hsl.x = mod(((c.g - c.b) / delta), 6.0) / 6.0;
      else if (cMax == c.g) hsl.x = ((c.b - c.r) / delta + 2.0) / 6.0;
      else hsl.x = ((c.r - c.g) / delta + 4.0) / 6.0;
      if (hsl.x < 0.0) hsl.x += 1.0;
    }
    return hsl;
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    if (hsl.y < 0.0001) return vec3(hsl.z);
    float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
    float p = 2.0 * hsl.z - q;
    float r = hue2rgb(p, q, hsl.x + 1.0/3.0);
    float g = hue2rgb(p, q, hsl.x);
    float b = hue2rgb(p, q, hsl.x - 1.0/3.0);
    return vec3(r, g, b);
  }

  void main() {
    float normalizedH = clamp((vHeight + 0.8) / 2.0, 0.0, 1.0);
    vec3 baseColor;
    if (normalizedH <= 0.5) {
      float t = normalizedH / 0.5;
      baseColor = mix(uColorTrough, uColorMid, smoothstep(0.0, 1.0, t));
    } else {
      float t = (normalizedH - 0.5) / 0.5;
      baseColor = mix(uColorMid, uColorPeak, smoothstep(0.0, 1.0, t));
    }

    if (vHeight < 0.0) {
      vec3 hsl = rgb2hsl(baseColor);
      hsl.y *= uTroughSaturationFactor;
      baseColor = hsl2rgb(hsl);
    }

    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uLightDir);
    float NdotL = max(dot(N, L), 0.0);
    float diffuse = NdotL * 0.6 + 0.4;

    vec3 V = normalize(vViewDir);
    vec3 H = normalize(L + V);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, uSpecSharpness) * uSpecIntensity;

    float heightSpec = smoothstep(0.6, 1.2, vHeight) * 0.4;
    spec += heightSpec;

    float fresnel = pow(1.0 - max(dot(V, N), 0.0), 3.0);
    vec3 fresnelColor = vec3(0.7, 0.85, 1.0);
    baseColor = mix(baseColor, fresnelColor, fresnel * 0.25);

    vec3 finalColor = baseColor * diffuse + vec3(1.0) * spec;

    float dist = length(vWorldPos - cameraPosition);
    float fogFactor = 1.0 - exp(-uFogDensity * dist * dist);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    finalColor = mix(finalColor, uFogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

const starVertexShader = `
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vAlpha = 0.6 + 0.4 * (aSize / 2.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aParticleColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aParticleColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const COLOR_PEAK = new THREE.Color('#6BB5FF');
const COLOR_MID = new THREE.Color('#2E6E9E');
const COLOR_TROUGH = new THREE.Color('#082D4F');
const FOG_COLOR = new THREE.Color('#B0D4F1');
const LIGHT_DIR = new THREE.Vector3(0.5, 1.0, 0.5).normalize();

function StarField() {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const r = 35 + Math.random() * 15;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 3;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1 + Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

function RippleParticles({ rippleDataRef }: { rippleDataRef: React.MutableRefObject<EnergyRippleData[]> }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const maxParticles = 300;
    const positions = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const alphas = new Float32Array(maxParticles);
    const colors = new Float32Array(maxParticles * 3);

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      alphas[i] = 0;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.84;
      colors[i * 3 + 2] = 0.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aParticleColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    const ripples = rippleDataRef.current;
    if (!ripples || ripples.length === 0) return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const sizeAttr = geometry.attributes.aSize as THREE.BufferAttribute;
    const alphaAttr = geometry.attributes.aAlpha as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.aParticleColor as THREE.BufferAttribute;

    let idx = 0;
    const maxCount = posAttr.count;

    for (let i = 0; i < maxCount; i++) {
      posAttr.setXYZ(i, 0, -100, 0);
      sizeAttr.setX(i, 0);
      alphaAttr.setX(i, 0);
    }

    for (const ripple of ripples) {
      if (!ripple.particles) continue;
      for (const p of ripple.particles) {
        if (idx >= maxCount) break;
        posAttr.setXYZ(idx, p.x, p.z, p.y);
        sizeAttr.setX(idx, p.size);
        alphaAttr.setX(idx, p.alpha * ripple.alpha);
        colorAttr.setXYZ(idx, 1.0, 0.84, 0.0);
        idx++;
      }
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

function RippleRings({ rippleDataRef }: { rippleDataRef: React.MutableRefObject<EnergyRippleData[]> }) {
  const [rings, setRings] = useState<{ id: number; x: number; y: number; radius: number; alpha: number }[]>([]);

  useFrame(() => {
    const ripples = rippleDataRef.current;
    if (!ripples) return;

    const newRings = ripples.map((r, i) => ({
      id: i,
      x: r.x,
      y: r.y,
      radius: r.radius,
      alpha: r.alpha
    }));
    setRings(newRings);
  });

  return (
    <group>
      {rings.map((ring) => (
        <mesh key={ring.id} position={[ring.x, 0.05, ring.y]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.01, ring.radius - 0.1), ring.radius, 64]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={ring.alpha * 0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

export const OceanRenderer: React.FC<OceanRendererProps> = ({
  resolution,
  onMeshClick,
  rippleDataRef,
  heightMapRef
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorPeak: { value: COLOR_PEAK },
    uColorMid: { value: COLOR_MID },
    uColorTrough: { value: COLOR_TROUGH },
    uSpecIntensity: { value: 0.6 },
    uSpecSharpness: { value: 32.0 },
    uTroughSaturationFactor: { value: 0.8 },
    uFogColor: { value: FOG_COLOR },
    uFogDensity: { value: 0.003 },
    uLightDir: { value: LIGHT_DIR }
  }), []);

  const gridSize = 10;

  const createGeometry = useCallback((res: number) => {
    const geo = new THREE.PlaneGeometry(gridSize, gridSize, res - 1, res - 1);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, 0);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [gridSize]);

  useEffect(() => {
    if (!meshRef.current) return;
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }
    geometryRef.current = createGeometry(resolution);
    meshRef.current.geometry = geometryRef.current;
  }, [resolution, createGeometry]);

  useFrame((_, delta) => {
    if (meshRef.current && geometryRef.current) {
      const positions = geometryRef.current.attributes.position;
      const heightMap = heightMapRef.current;

      if (heightMap && heightMap.length === positions.count) {
        for (let i = 0; i < positions.count; i++) {
          const h = Math.max(-0.8, Math.min(1.2, heightMap[i]));
          positions.setY(i, h);
        }
        positions.needsUpdate = true;
        geometryRef.current.computeVertexNormals();
      }

      uniforms.uTime.value += delta;
    }
  });

  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    const point = event.point;
    const x = Math.max(-5, Math.min(5, point.x));
    const y = Math.max(-5, Math.min(5, point.z));
    onMeshClick(x, y);
  }, [onMeshClick]);

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      <StarField />
      <RippleParticles rippleDataRef={rippleDataRef} />
      <RippleRings rippleDataRef={rippleDataRef} />
    </group>
  );
};
