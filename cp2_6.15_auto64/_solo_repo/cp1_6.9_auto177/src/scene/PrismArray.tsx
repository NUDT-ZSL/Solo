import React, { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HSLParams, ControlPoint } from '../types';

interface PrismArrayProps {
  hsl: HSLParams;
  tiltCurve: ControlPoint[];
  rotationCurve: ControlPoint[];
}

const GRID_SIZE = 10;
const SPACING = 20 / (GRID_SIZE - 1);
const START_POS = -10;
const BASE_HEIGHT = 2;
const BASE_SIZE = 0.5;

interface PrismState {
  height: number;
  targetHeight: number;
  clickAnim: number;
  neighborTilt: number;
  neighborTiltTarget: number;
}

const bernstein = (n: number, i: number, t: number) => {
  const binomial = (a: number, b: number) => {
    let result = 1;
    for (let k = 0; k < b; k++) {
      result = result * (a - k) / (k + 1);
    }
    return result;
  };
  return binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
};

const evalCurve = (points: ControlPoint[], t: number): number => {
  const n = points.length - 1;
  let y = 0;
  for (let i = 0; i <= n; i++) {
    const b = bernstein(n, i, t);
    y += points[i].y * b;
  }
  return Math.max(0, Math.min(1, y));
};

const hslToColor = (h: number, s: number, l: number): THREE.Color => {
  const hue = ((h % 360) + 360) % 360;
  return new THREE.Color().setHSL(hue / 360, s / 100, l / 100);
};

interface PrismMeshProps {
  position: [number, number, number];
  row: number;
  col: number;
  topColorRef: React.MutableRefObject<THREE.Color>;
  tiltXRef: React.MutableRefObject<number>;
  tiltZRef: React.MutableRefObject<number>;
  rotationSpeedRef: React.MutableRefObject<number>;
  onClick: (row: number, col: number) => void;
}

const PrismMesh: React.FC<PrismMeshProps> = ({
  position,
  row,
  col,
  topColorRef,
  tiltXRef,
  tiltZRef,
  rotationSpeedRef,
  onClick
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const topMeshRef = useRef<THREE.Mesh>(null);
  const rotationRef = useRef(0);
  const prismState = useRef<PrismState>({
    height: BASE_HEIGHT,
    targetHeight: BASE_HEIGHT,
    clickAnim: 0,
    neighborTilt: 0,
    neighborTiltTarget: 0
  });

  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(BASE_SIZE, BASE_SIZE, BASE_HEIGHT, 3, 1);
  }, []);

  const sideMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide
    });
  }, []);

  const topGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(BASE_SIZE * 0.98, BASE_SIZE * 0.98, 0.05, 3, 1);
    geo.translate(0, BASE_HEIGHT / 2 + 0.025, 0);
    return geo;
  }, []);

  const topMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0xcccccc,
      emissive: 0x000000,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1
    });
  }, []);

  useFrame((_, delta) => {
    const state = prismState.current;

    rotationRef.current += rotationSpeedRef.current * (delta * Math.PI / 180);

    state.height += (state.targetHeight - state.height) * Math.min(1, delta * 8);

    if (state.clickAnim > 0) {
      state.clickAnim = Math.max(0, state.clickAnim - delta * 3.33);
    }
    if (state.neighborTiltTarget > 0) {
      state.neighborTiltTarget = Math.max(0, state.neighborTiltTarget - delta * 2);
    }
    state.neighborTilt += (state.neighborTiltTarget - state.neighborTilt) * Math.min(1, delta * 10);

    if (meshRef.current) {
      const scaleY = state.height / BASE_HEIGHT;
      meshRef.current.scale.set(1, scaleY, 1);
      meshRef.current.rotation.y = rotationRef.current;
    }
    if (topMeshRef.current) {
      const scaleY = state.height / BASE_HEIGHT;
      topMeshRef.current.scale.set(1, 1, 1);
      topMeshRef.current.position.y = 0;
      (topMeshRef.current.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
      topMeshRef.current.rotation.y = rotationRef.current;
      const topMat = topMeshRef.current.material as THREE.MeshPhysicalMaterial;
      topMat.color.copy(topColorRef.current);
      topMat.emissive.copy(topColorRef.current).multiplyScalar(0.2);
    }

    if (groupRef.current) {
      const tiltBaseX = tiltXRef.current;
      const tiltBaseZ = tiltZRef.current;
      const neighborTiltAngle = state.neighborTilt * 5 * Math.PI / 180;
      const totalTiltX = tiltBaseX + neighborTiltAngle;
      const totalTiltZ = tiltBaseZ + neighborTiltAngle * 0.7;
      groupRef.current.rotation.x = totalTiltX;
      groupRef.current.rotation.z = totalTiltZ;
      groupRef.current.position.y = position[1] + (state.height - BASE_HEIGHT) / 2;
    }
  });

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    onClick(row, col);
  }, [row, col, onClick]);

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={sideMaterial}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
      />
      <mesh
        ref={topMeshRef}
        geometry={topGeometry}
        material={topMaterial}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
};

const PrismArray: React.FC<PrismArrayProps> = ({ hsl, tiltCurve, rotationCurve }) => {
  const prismRefs = useRef<Map<string, { stateRef: React.MutableRefObject<PrismState> | null }>>(new Map());
  const [, forceUpdate] = useState(0);

  const prismData = useMemo(() => {
    const data: Array<{
      row: number;
      col: number;
      position: [number, number, number];
      topColorRef: React.MutableRefObject<THREE.Color>;
      tiltXRef: React.MutableRefObject<number>;
      tiltZRef: React.MutableRefObject<number>;
      rotationSpeedRef: React.MutableRefObject<number>;
      stateRef: React.MutableRefObject<any>;
    }> = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = START_POS + col * SPACING;
        const z = START_POS + row * SPACING;
        data.push({
          row,
          col,
          position: [x, 0, z],
          topColorRef: { current: new THREE.Color(0xcccccc) },
          tiltXRef: { current: 0 },
          tiltZRef: { current: 0 },
          rotationSpeedRef: { current: 0 },
          stateRef: { current: null }
        });
      }
    }
    return data;
  }, []);

  useFrame(() => {
    const time = performance.now() * 0.001;

    prismData.forEach(({ row, col, topColorRef, tiltXRef, tiltZRef, rotationSpeedRef }) => {
      const waveProgress = ((row + col) / (2 * (GRID_SIZE - 1)) + time * 0.15) % 1;
      const waveVal = 0.5 + 0.5 * Math.sin(waveProgress * Math.PI * 2);

      const peakColor = hslToColor(hsl.hue, hsl.saturation, hsl.lightness);
      const complementaryHue = (hsl.hue + 180) % 360;
      const valleyColor = hslToColor(complementaryHue, Math.max(hsl.saturation * 0.7, 20), Math.min(hsl.lightness * 1.2, 85));
      topColorRef.current.copy(valleyColor).lerp(peakColor, waveVal);

      const tiltT = ((row + col) / (2 * (GRID_SIZE - 1)) + time * 0.3) % 1;
      const tiltT2 = ((GRID_SIZE - 1 - row + col) / (2 * (GRID_SIZE - 1)) + time * 0.25) % 1;
      const tiltAmpX = evalCurve(tiltCurve, tiltT) * 30 * Math.PI / 180;
      const tiltAmpZ = evalCurve(tiltCurve, tiltT2) * 30 * Math.PI / 180;
      tiltXRef.current = tiltAmpX;
      tiltZRef.current = tiltAmpZ;

      const rotT = (row * GRID_SIZE + col) / (GRID_SIZE * GRID_SIZE - 1);
      rotationSpeedRef.current = evalCurve(rotationCurve, rotT) * 360;
    });
  });

  const handlePrismClick = useCallback((clickRow: number, clickCol: number) => {
    prismData.forEach(({ row, col, stateRef }) => {
      if (row === clickRow && col === clickCol) {
        if (stateRef.current) {
          stateRef.current.targetHeight = 4;
          stateRef.current.clickAnim = 1;
          setTimeout(() => {
            if (stateRef.current) {
              stateRef.current.targetHeight = BASE_HEIGHT;
            }
          }, 300);
        }
      } else {
        const dx = col - clickCol;
        const dz = row - clickRow;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0 && dist <= 1.5) {
          if (stateRef.current) {
            stateRef.current.neighborTiltTarget = 1;
          }
        }
      }
    });
    forceUpdate(v => v + 1);
  }, [prismData]);

  return (
    <group>
      {prismData.map(({ row, col, position, topColorRef, tiltXRef, tiltZRef, rotationSpeedRef }, idx) => (
        <PrismMesh
          key={`${row}-${col}`}
          position={position}
          row={row}
          col={col}
          topColorRef={topColorRef}
          tiltXRef={tiltXRef}
          tiltZRef={tiltZRef}
          rotationSpeedRef={rotationSpeedRef}
          onClick={handlePrismClick}
        />
      ))}
    </group>
  );
};

export default PrismArray;
