import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';

import vertShader from './glow.vert.glsl';
import fragShader from './glow.frag.glsl';

export interface TreeData {
  id: number;
  position: [number, number, number];
  frequency: number;
  phase: number;
  height: number;
  hueBase: number;
  seed: number;
  isHighlighted: boolean;
}

interface TreeProps {
  data: TreeData;
  globalFrequency: number;
  segments: number;
  particlesPerTree: number;
  burstProgress: number;
  burstTargetFrequency: number;
  burstActive: boolean;
  isMobile: boolean;
  onDoubleClick?: (treeData: TreeData, event: ThreeEvent<MouseEvent>) => void;
  selected: boolean;
  highlightProgress: number;
  wanderPeriod: number;
  wanderAmplitude: number;
}

const warmColor = new THREE.Color('#FF6B35');
const coolColor = new THREE.Color('#4ECDC4');

const branchCountFromFreq = (freq: number) => {
  return 2 + Math.floor((freq / 100) * 6);
};

const Tree: React.FC<TreeProps> = React.memo(({
  data,
  globalFrequency,
  segments,
  particlesPerTree,
  burstProgress,
  burstTargetFrequency,
  burstActive,
  isMobile,
  onDoubleClick,
  selected,
  highlightProgress,
  wanderAmplitude,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const particleBaseYRef = useRef<Float32Array | null>(null);
  const particleSpeedsRef = useRef<Float32Array | null>(null);

  const { position, height, phase, seed } = data;
  const lineCount = 10;

  const geometryData = useMemo(() => {
    const totalVertices: number[] = [];
    const linePositions: number[] = [];
    const distFromCenter: number[] = [];
    const indices: number[] = [];

    const effectiveFreq = globalFrequency;
    const branchCount = branchCountFromFreq(effectiveFreq);

    for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
      const isTrunk = lineIdx < 3;

      const baseAngle = (lineIdx / lineCount) * Math.PI * 2 + seed * 100;
      const startR = isTrunk ? 0.15 + lineIdx * 0.05 : 0.4 + lineIdx * 0.3;

      const branchIdx = isTrunk ? 0 : (lineIdx - 3) % branchCount;
      const branchAngle = (branchIdx / Math.max(1, branchCount)) * Math.PI * 2 + seed * 50;
      const branchR = isTrunk ? 0 : 1.0 + branchIdx * 0.3;

      const startIdx = totalVertices.length / 3;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = t * height;

        const helixFactor = isTrunk ? 0.3 : t * 1.5 + 0.5;
        const helixAngle = baseAngle + helixFactor * t * 3;
        const helixR = isTrunk
          ? startR * (1 - t * 0.3)
          : startR * (1 + t * 1.2);

        const canopyFactor = Math.pow(t, 1.5);
        const canopyR = isTrunk ? 0 : canopyFactor * branchR * (0.8 + Math.sin(t * Math.PI) * 1.5);
        const canopyAngle = branchAngle + t * 2 + seed * 10;

        const x = helixR * Math.cos(helixAngle) + canopyR * Math.cos(canopyAngle);
        const z = helixR * Math.sin(helixAngle) + canopyR * Math.sin(canopyAngle);

        totalVertices.push(x, y, z);
        linePositions.push(t);
        distFromCenter.push(isTrunk ? t * 0.5 : Math.sqrt(x * x + z * z));

        if (i < segments) {
          const a = startIdx + i;
          const b = startIdx + i + 1;
          indices.push(a, b);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(totalVertices), 3));
    geometry.setAttribute('aLinePosition', new THREE.Float32BufferAttribute(new Float32Array(linePositions), 1));
    geometry.setAttribute('aDistanceFromCenter', new THREE.Float32BufferAttribute(new Float32Array(distFromCenter), 1));
    geometry.setIndex(indices);

    return geometry;
  }, [height, seed, segments, globalFrequency]);

  const particleData = useMemo(() => {
    const count = particlesPerTree;
    const positions = new Float32Array(count * 3);
    const baseY = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.5 + 0.3;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      baseY[i] = Math.random() * height;
      speeds[i] = 0.3 + Math.random() * 0.5;
    }

    particleBaseYRef.current = baseY;
    particleSpeedsRef.current = speeds;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [particlesPerTree, height]);

  const effectiveFreq = useMemo(() => {
    if (!burstActive) return globalFrequency;
    if (burstProgress < 0.5) {
      return globalFrequency * (1 - burstProgress * 2) + burstTargetFrequency * (burstProgress * 2);
    } else {
      return burstTargetFrequency * (2 - 2 * burstProgress) + globalFrequency * (2 * burstProgress - 1);
    }
  }, [globalFrequency, burstActive, burstProgress, burstTargetFrequency]);

  const treeColor = useMemo(() => {
    const freqRatio = effectiveFreq / 100;
    return warmColor.clone().lerp(coolColor, freqRatio);
  }, [effectiveFreq]);

  const glowIntensity = useMemo(() => {
    const base = 0.8;
    const highlightBoost = highlightProgress * 0.15;
    return base + highlightBoost;
  }, [highlightProgress]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = elapsed;
      shaderMaterialRef.current.uniforms.uFrequency.value = effectiveFreq;
      shaderMaterialRef.current.uniforms.uPhase.value = phase;
      shaderMaterialRef.current.uniforms.uGlowIntensity.value = glowIntensity;
      shaderMaterialRef.current.uniforms.uColor.value.copy(treeColor);
      shaderMaterialRef.current.uniforms.uWanderAmount.value = wanderAmplitude;
    }

    if (particleMaterialRef.current && particleBaseYRef.current && particleSpeedsRef.current) {
      particleMaterialRef.current.uniforms.uTime.value = elapsed;
      particleMaterialRef.current.uniforms.uColor.value.copy(treeColor);
      particleMaterialRef.current.uniforms.uHeightMax.value = height;

      const positions = particleData.attributes.position.array as Float32Array;
      const baseY = particleBaseYRef.current;
      const speeds = particleSpeedsRef.current;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        const idx = (elapsed * speeds[i] + baseY[i]) % height;
        positions[i * 3 + 1] = idx;
      }
      particleData.attributes.position.needsUpdate = true;
    }

    if (groupRef.current) {
      const subtle = Math.sin(elapsed * 0.4 + phase * 3) * 0.01;
      groupRef.current.rotation.y = subtle;
    }
  });

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onDoubleClick?.(data, event);
  };

  const lineWidth = selected ? 2 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      onDoubleClick={handleDoubleClick}
    >
      <lineSegments
        geometry={geometryData}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={shaderMaterialRef}
          vertexShader={vertShader}
          fragmentShader={fragShader}
          uniforms={{
            uTime: { value: 0 },
            uFrequency: { value: globalFrequency },
            uPhase: { value: phase },
            uGlowIntensity: { value: glowIntensity },
            uColor: { value: treeColor },
            uWanderAmount: { value: wanderAmplitude },
          }}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          linewidth={lineWidth}
        />
      </lineSegments>

      {!isMobile && (
        <points geometry={particleData} frustumCulled={false}>
          <shaderMaterial
            ref={particleMaterialRef}
            vertexShader={`
              precision highp float;
              uniform float uTime;
              uniform float uHeightMax;
              varying float vAlpha;
              varying float vYPos;
              void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float normalized = position.y / uHeightMax;
                vYPos = normalized;
                vAlpha = 0.3 + normalized * 0.3;
                gl_Position = projectionMatrix * mvPosition;
                float size = 1.5 + position.y * 0.3;
                gl_PointSize = size * (300.0 / -mvPosition.z);
              }
            `}
            fragmentShader={`
              precision highp float;
              uniform vec3 uColor;
              uniform float uTime;
              varying float vAlpha;
              varying float vYPos;
              void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                float pulse = 0.85 + 0.15 * sin(uTime * 3.0 + vYPos * 10.0);
                vec3 finalColor = uColor * (1.2 + vYPos * 0.8);
                float alpha = vAlpha * glow * pulse;
                alpha = clamp(alpha, 0.0, 0.6);
                gl_FragColor = vec4(finalColor, alpha);
              }
            `}
            uniforms={{
              uTime: { value: 0 },
              uColor: { value: treeColor },
              uHeightMax: { value: height },
            }}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
});

Tree.displayName = 'Tree';

export default Tree;
