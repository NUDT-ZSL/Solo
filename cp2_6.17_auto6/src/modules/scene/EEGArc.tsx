import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EEGArcProps {
  position: [number, number, number];
  data: number[];
  color: string;
  speed: number;
  isAlert: boolean;
  arcHeight?: number;
  arcRadius?: number;
}

function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(c1, c2, t);
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
  const timeRef = useRef(0);
  const alertPhaseRef = useRef(0);

  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 120;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * t - Math.PI / 2;
      const x = Math.cos(angle) * arcRadius;
      const y = Math.sin(angle) * arcHeight;
      points.push(new THREE.Vector3(x, y, 0));
    }

    return points;
  }, [arcHeight, arcRadius]);

  const { mainLine, glowLine } = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const colorArray = new Float32Array(curvePoints.length * 3);
    
    const coolColor = new THREE.Color(0x00d2ff);
    const warmColor = new THREE.Color(0xff4757);

    for (let i = 0; i < curvePoints.length; i++) {
      const dataIndex = Math.floor((i / curvePoints.length) * data.length);
      const value = data[dataIndex] || 0;
      const normalizedValue = Math.min(1, Math.max(0, (value + 50) / 100));
      const finalColor = lerpColor(coolColor, warmColor, normalizedValue);

      colorArray[i * 3] = finalColor.r;
      colorArray[i * 3 + 1] = finalColor.g;
      colorArray[i * 3 + 2] = finalColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const mainMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      toneMapped: false
    });

    const glowMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });

    const main = new THREE.Line(geo, mainMat);
    const glow = new THREE.Line(geo, glowMat);
    glow.scale.setScalar(1.15);

    return { mainLine: main, glowLine: glow };
  }, [curvePoints, data, color]);

  useEffect(() => {
    return () => {
      mainLine.geometry.dispose();
      (mainLine.material as THREE.Material).dispose();
      (glowLine.material as THREE.Material).dispose();
    };
  }, [mainLine, glowLine]);

  useFrame((_state, delta) => {
    timeRef.current += delta * speed;

    if (isAlert) {
      alertPhaseRef.current += delta * 4;
    }

    const mainMat = mainLine.material as THREE.LineBasicMaterial;
    const glowMat = glowLine.material as THREE.LineBasicMaterial;

    if (isAlert) {
      const flash = Math.sin(alertPhaseRef.current * Math.PI) > 0;
      mainMat.color.set(flash ? '#ffffff' : '#ff4757');
      mainMat.opacity = 0.8 + Math.sin(alertPhaseRef.current * Math.PI * 2) * 0.1;
      mainMat.vertexColors = false;

      glowMat.color.set(flash ? '#ffffff' : '#ff4757');
      glowMat.opacity = 0.35 + Math.sin(alertPhaseRef.current * Math.PI * 2) * 0.15;
    } else {
      mainMat.color.set(color);
      mainMat.opacity = 0.9;
      mainMat.vertexColors = true;

      glowMat.color.set(color);
      glowMat.opacity = 0.25 + Math.sin(timeRef.current * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <primitive object={mainLine} />
      <primitive object={glowLine} />
    </group>
  );
}

export default EEGArc;
