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
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vHeight = position.y;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vViewDir = normalize(-mvPosition.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

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
      if (hsl.x < 0.0) h