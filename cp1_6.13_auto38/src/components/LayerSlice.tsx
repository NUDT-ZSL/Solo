import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Layer } from '@/types';
import { easeInOutCubic } from '@/utils/easing';

interface LayerSliceProps {
  layer: Layer;
  isSelected: boolean;
  onClick: () => void;
  timelineProgress: number;
  animationSpeed: number;
  baseY: number;
  layerHeight: number;
  totalLayers: number;
}

export function LayerSlice({
  layer,
  isSelected,
  onClick,
  timelineProgress,
  animationSpeed,
  baseY,
  layerHeight,
  totalLayers,
}: LayerSliceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const edgesMaterialRef = useRef<THREE.LineBasicMaterial>(null);

  const animState = useRef({
    currentY: baseY - totalLayers * (layerHeight + 1),
    currentOpacity: 0,
    currentScaleY: 0,
    targetY: baseY - totalLayers * (layerHeight + 1),
    targetOpacity: 0,
    targetScaleY: 0,
    animating: false,
    startY: 0,
    startOpacity: 0,
    startScaleY: 0,
    animDuration: 1.5 / animationSpeed,
    animStart: -9999,
    selectOffset: 0,
    selectAnimStart: -9999,
  });

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const halfSize = 90;
    const cornerOffsets = [
      [3, -2], [-2, 4], [4, -3], [-3, 2],
      [2, -4], [-4, 3], [3, 3], [-2, -3],
      [4, 2], [-3, -4], [2, 3], [-4, 2],
      [3, -4], [-2, 4], [4, -2], [-3, 3],
    ];
    const vertices: [number, number][] = [
      [-halfSize, -halfSize],
      [-halfSize * 0.6, -halfSize + 4],
      [0, -halfSize - 2],
      [halfSize * 0.6, -halfSize + 3],
      [halfSize, -halfSize],
      [halfSize + 3, -halfSize * 0.6],
      [halfSize - 2, 0],
      [halfSize + 2, halfSize * 0.6],
      [halfSize, halfSize],
      [halfSize * 0.6, halfSize - 3],
      [0, halfSize + 2],
      [-halfSize * 0.6, halfSize - 4],
      [-halfSize, halfSize],
      [-halfSize - 3, halfSize * 0.6],
      [-halfSize + 2, 0],
      [-halfSize - 2, -halfSize * 0.6],
    ];

    for (let i = 0; i < vertices.length; i++) {
      const [vx, vy] = vertices[i];
      const [ox, oy] = cornerOffsets[i % cornerOffsets.length];
      if (i === 0) {
        shape.moveTo(vx + ox, vy + oy);
      } else {
        const prevI = i - 1;
        const [pvx, pvy] = vertices[prevI];
        const [pox, poy] = cornerOffsets[prevI % cornerOffsets.length];
        const cpx = (pvx + pox + vx + ox) / 2 + (Math.random() - 0.5) * 6;
        const cpy = (pvy + poy + vy + oy) / 2 + (Math.random() - 0.5) * 6;
        shape.quadraticCurveTo(cpx, cpy, vx + ox, vy + oy);
      }
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: layerHeight,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2,
      curveSegments: 8,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, [layerHeight]);

  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);

  useFrame((_state, delta) => {
    if (!groupRef.current || !materialRef.current || !edgesMaterialRef.current) return;

    const layerThreshold = ((layer.order - 1) / totalLayers) * 100;
    const shouldBeVisible = timelineProgress > layerThreshold;
    const withinRange = timelineProgress >= layerThreshold && timelineProgress <= layerThreshold + (100 / totalLayers) + 0.01;
    const progressWithin = withinRange
      ? Math.min(1, (timelineProgress - layerThreshold) / (100 / totalLayers))
      : shouldBeVisible ? 1 : 0;

    const easedProgress = easeInOutCubic(progressWithin);

    const finalTargetY = baseY + (1 - easedProgress) * (-totalLayers * (layerHeight + 1) * 2);
    const finalTargetOpacity = easedProgress * (isSelected ? 0.85 : 0.7);
    const finalTargetScaleY = 0.2 + easedProgress * 0.8;

    const selectTarget = isSelected ? 8 : 0;
    animState.current.selectOffset += (selectTarget - animState.current.selectOffset) * Math.min(1, delta * 8);

    const lerpFactor = Math.min(1, delta * 4 * animationSpeed);
    animState.current.currentY += (finalTargetY - animState.current.currentY) * lerpFactor;
    animState.current.currentOpacity += (finalTargetOpacity - animState.current.currentOpacity) * lerpFactor;
    animState.current.currentScaleY += (finalTargetScaleY - animState.current.currentScaleY) * lerpFactor;

    groupRef.current.position.y = animState.current.currentY + animState.current.selectOffset;
    groupRef.current.scale.y = animState.current.currentScaleY;
    materialRef.current.opacity = animState.current.currentOpacity;

    const baseC = new THREE.Color(layer.color);
    if (isSelected) {
      const hsl = { h: 0, s: 0, l: 0 };
      baseC.getHSL(hsl);
      hsl.s = Math.min(1, hsl.s + 0.2);
      baseC.setHSL(hsl.h, hsl.s, hsl.l);
    }
    materialRef.current.color.copy(baseC);
    edgesMaterialRef.current.opacity = isSelected ? 1 : 0;
    edgesMaterialRef.current.visible = isSelected;
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        geometry={geometry}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={layer.color}
          transparent
          opacity={0.7}
          roughness={0.8}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial
          ref={edgesMaterialRef}
          color="#ffffff"
          transparent
          opacity={0}
          visible={false}
        />
      </lineSegments>
    </group>
  );
}
