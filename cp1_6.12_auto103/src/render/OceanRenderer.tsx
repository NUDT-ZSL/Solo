import React, { useRef, useMemo, useEffect, useCallback } from 'react';
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
  varying vec3 vNormal;
  varying float vHeight;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  void main() {
    vHeight = position.y;
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec3 vPosition;
  varying vec3 vViewDir;

  vec3 hsl2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 rgb2hsl(vec3 col) {
    float minC = min(min(col.r, col.g), col.b);
    float maxC = max(max(col.r, col.g), col.b);
    float delta = maxC - minC;
    vec3 hsl = vec3(0.0, 0.0, (maxC + minC) * 0.5);
    if (delta > 0.0001) {
      hsl.y = (hsl.z < 0.5) ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);
      float deltaR = (((maxC - col.r) / 6.0) + (delta / 2.0)) / delta;
      float deltaG = (((maxC - col.g) / 6.0) + (delta / 2.0)) / delta;
      float deltaB = (((maxC - col.b) / 6.0) + (delta / 2.0)) / delta;
      if (col.r == maxC) hsl.x = deltaB - deltaG;
      else if (col.g == maxC) hsl.x = (1.0/3.0) + deltaR - deltaB;
      else hsl.x = (2.0/3.0) + deltaG - deltaR;
      if (hsl.x < 0.0) hsl.x += 1.0;
      if (hsl.x > 1.0) hsl.x -= 1.0;
    }
    return hsl;
  }

  void main() {
    vec3 colorLow = vec3(0.031, 0.176, 0.310);
    vec3 colorMid = vec3(0.180, 0.431, 0.620);
    vec3 colorHigh = vec3(0.420, 0.710, 1.0);

    float normalizedHeight = clamp((vHeight + 0.8) / 2.0, 0.0, 1.0);
    vec3 baseColor;

    if (normalizedHeight < 0.5) {
      float t = normalizedHeight / 0.5;
      baseColor = mix(colorLow, colorMid, t);
    } else {
      float t = (normalizedHeight - 0.5) / 0.5;
      baseColor = mix(colorMid, colorHigh, t);
    }

    if (vHeight < 0.0) {
      vec3 hsl = rgb2hsl(baseColor);
      hsl.y *= 0.8;
      baseColor = hsl2rgb(hsl);
    }

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
    float diffuse = max(dot(vNormal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + vViewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
    vec3 specular = vec3(1.0) * spec * 0.6;

    float fresnel = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), 3.0);
    baseColor = mix(baseColor, vec3(0.7, 0.85, 1.0), fresnel * 0.2);

    vec3 finalColor = baseColor * (0.4 + 0.6 * diffuse) + specular;

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

export const OceanRenderer: React.FC<OceanRendererProps> = ({
  resolution,
  onMeshClick,
  rippleDataRef,
  heightMapRef
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const particleRef = useRef<THREE.Points | null>(null);
  const rippleMeshRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
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

  useEffect(() => {
    const group = new THREE.Group();
    rippleMeshRef.current = group;

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.84;
      colors[i * 3 + 2] = 0.0;
      sizes[i] = 0;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(particleGeo, particleMat);
    group.add(points);
    particleRef.current = points;

    return () => {
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  useEffect(() => {
    const starCount = 100;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 10;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.5 + 5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = (1 + Math.random()) * 0.1;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false
    });

    starsRef.current = new THREE.Points(starGeo, starMat);

    return () => {
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current && geometryRef.current) {
      const positions = geometryRef.current.attributes.position;
      const heightMap = heightMapRef.current;

      if (heightMap && heightMap.length === positions.count) {
        for (let i = 0; i < positions.count; i++) {
          const h = heightMap[i];
          const clamped = Math.max(-0.8, Math.min(1.2, h));
          positions.setY(i, clamped);
        }
        positions.needsUpdate = true;
        geometryRef.current.computeVertexNormals();
      }

      if (uniforms.uTime) {
        uniforms.uTime.value += delta;
      }
    }

    if (rippleMeshRef.current && particleRef.current) {
      const ripples = rippleDataRef.current;
      const posAttr = particleRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const colorAttr = particleRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const sizeAttr = particleRef.current.geometry.attributes.size as THREE.BufferAttribute;

      let particleIdx = 0;

      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setX(i, 0);
        posAttr.setY(i, -100);
        posAttr.setZ(i, 0);
        sizeAttr.setX(i, 0);
      }

      for (const ripple of ripples) {
        for (const p of ripple.particles) {
          if (particleIdx >= posAttr.count) break;
          posAttr.setXYZ(particleIdx, p.x, p.z, p.y);
          colorAttr.setXYZ(particleIdx, 1.0 * p.alpha, 0.84 * p.alpha, 0.0 * p.alpha);
          sizeAttr.setX(particleIdx, p.size * 0.05 * p.alpha);
          particleIdx++;
        }
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    if (starsRef.current) {
      starsRef.current.rotation.y += 0.001;
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
        onPointerOver={(e) => (document.body.style.cursor = 'pointer')}
        onPointerOut={(e) => (document.body.style.cursor = 'default')}
      >
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      <primitive object={rippleMeshRef.current!} />
      <primitive object={starsRef.current!} />

      <fog attach="fog" args={['#B0D4F1', 20, 80]} />
    </group>
  );
};
