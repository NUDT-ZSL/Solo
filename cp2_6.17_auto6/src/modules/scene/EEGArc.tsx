import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';

interface EEGArcProps {
  position: [number, number, number];
  data: number[];
  color: string;
  speed: number;
  isAlert: boolean;
  arcHeight?: number;
  arcRadius?: number;
}

function EEGArc({
  position,
  data,
  color,
  speed,
  isAlert,
  arcHeight = 0.5,
  arcRadius = 0.6
}: EEGArcProps) {
  const lineRef = useRef<Line2>(null);
  const timeRef = useRef(0);
  const alertPhaseRef = useRef(0);

  const curvePoints = useMemo(() => {
    const points: [number, number, number][] = [];
    const segments = 120;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * t - Math.PI / 2;
      const x = Math.cos(angle) * arcRadius;
      const y = Math.sin(angle) * arcHeight;
      points.push([x, y, 0]);
    }

    return points;
  }, [arcHeight, arcRadius]);

  const pointColors = useMemo(() => {
    const colors: string[] = [];
    const coolColor = new THREE.Color(0x00d2ff);
    const warmColor = new THREE.Color(0xff4757);

    for (let i = 0; i < curvePoints.length; i++) {
      const dataIndex = Math.floor((i / curvePoints.length) * data.length);
      const value = data[dataIndex] || 0;
      const normalizedValue = Math.min(1, Math.max(0, (value + 50) / 100));
      const finalColor = new THREE.Color().lerpColors(coolColor, warmColor, normalizedValue);
      colors.push(`#${finalColor.getHexString()}`);
    }

    return colors;
  }, [data, curvePoints.length]);

  useFrame((_state, delta) => {
    timeRef.current += delta * speed;

    if (isAlert) {
      alertPhaseRef.current += delta * 4;
    }
  });

  const getDisplayColor = (): string => {
    if (isAlert) {
      return Math.sin(alertPhaseRef.current * Math.PI) > 0 ? '#ffffff' : '#ff4757';
    }
    return color;
  };

  const getGlowOpacity = (): number => {
    if (isAlert) {
      return 0.4 + Math.sin(alertPhaseRef.current * Math.PI * 2) * 0.2;
    }
    return 0.3 + Math.sin(timeRef.current * 2) * 0.1;
  };

  return (
    <group position={position}>
      <Line
        ref={lineRef}
        points={curvePoints}
        color={getDisplayColor()}
        lineWidth={3}
        transparent
        opacity={0.9}
        vertexColors={pointColors}
      />

      <Line
        points={curvePoints}
        color={getDisplayColor()}
        lineWidth={8}
        transparent
        opacity={getGlowOpacity()}
        blending={THREE.AdditiveBlending}
      />
    </group>
  );
}

export default EEGArc;
