// ============================================================
// LayerSlice 组件 —— 单个地层切片
// 数据流向：Scene3D(父) -> 传入 layer / isSelected / timelineProgress 等
// 输出：Three.js 3D 对象（ExtrudeGeometry 挤压不规则多边形）
// 交互：onClick -> 调用 Scene3D 传入的 selectLayer 回调更新 store
// ============================================================
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Layer } from '@/types';
import { easeInOutCubic } from '@/utils/easing';

export interface LayerSliceProps {
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
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const edgesMatRef = useRef<THREE.LineBasicMaterial>(null);

  const animRef = useRef({
    posY: baseY,
    opacity: 0,
    scaleY: 0,
    selectOffset: 0,
    lastTimeline: -1,
    timelineAnimStart: -9999,
    timelineAnimDuration: 1.5,
    timelineStartPosY: baseY,
    timelineStartOpacity: 0,
    timelineStartScaleY: 0,
  });

  // ------------------------------------------------------------
  // 生成不规则多边形（模拟自然断层的不规则边界）
  // 使用 Shape + quadraticCurveTo 构造弯曲边缘
  // 然后通过 ExtrudeGeometry 沿 Z 轴（之后旋转到 Y）挤压出地层厚度
  // ------------------------------------------------------------
  const { geometry, edgesGeometry } = useMemo(() => {
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
        const cpx = (pvx + pox + vx + ox) / 2 + (Math.sin(i * 1.3) * 6);
        const cpy = (pvy + poy + vy + oy) / 2 + (Math.cos(i * 1.7) * 6);
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
      steps: 1,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    const edges = new THREE.EdgesGeometry(geo, 20);
    return { geometry: geo, edgesGeometry: edges };
  }, [layerHeight]);

  // ------------------------------------------------------------
  // 每帧更新：处理 timeline 动画 + 选中动画
  // 使用 easeInOutCubic 插值实现 1.5 秒缓动
  // ------------------------------------------------------------
  useFrame((_state, delta) => {
    if (!groupRef.current || !materialRef.current || !edgesMatRef.current) return;

    const st = animRef.current;
    const now = performance.now() / 1000;
    const total = totalLayers;

    const layerThreshold = ((layer.order - 1) / total) * 100;
    const targetVisibility = timelineProgress >= layerThreshold ? 1 : 0;

    if (Math.abs(timelineProgress - st.lastTimeline) > 0.01) {
      st.lastTimeline = timelineProgress;
      st.timelineAnimStart = now;
      st.timelineStartPosY = st.posY;
      st.timelineStartOpacity = st.opacity;
      st.timelineStartScaleY = st.scaleY;
    }

    const elapsed = now - st.timelineAnimStart;
    const duration = st.timelineAnimDuration / animationSpeed;
    const rawT = Math.min(elapsed / duration, 1);
    const tEased = easeInOutCubic(rawT);

    const belowHideY = baseY - (total * (layerHeight + 1)) * 1.2;
    const finalTargetPos = targetVisibility > 0.5 ? baseY : belowHideY;
    const finalTargetOpacity = targetVisibility > 0.5 ? (isSelected ? 0.85 : 0.7) : 0;
    const finalTargetScaleY = targetVisibility > 0.5 ? 1 : 0;

    st.posY = st.timelineStartPosY + (finalTargetPos - st.timelineStartPosY) * tEased;
    st.opacity = st.timelineStartOpacity + (finalTargetOpacity - st.timelineStartOpacity) * tEased;
    st.scaleY = st.timelineStartScaleY + (finalTargetScaleY - st.timelineStartScaleY) * tEased;

    const selectTarget = isSelected ? 8 : 0;
    const selectSpeed = 1 / 0.3;
    const selectLerp = Math.min(1, delta * selectSpeed);
    st.selectOffset += (selectTarget - st.selectOffset) * selectLerp;

    groupRef.current.position.y = st.posY + st.selectOffset;
    groupRef.current.scale.y = Math.max(0.001, st.scaleY);
    materialRef.current.opacity = st.opacity;

    const baseC = new THREE.Color(layer.color);
    if (isSelected) {
      const hsl = { h: 0, s: 0, l: 0 };
      baseC.getHSL(hsl);
      hsl.s = Math.min(1, hsl.s + 0.2);
      baseC.setHSL(hsl.h, hsl.s, hsl.l);
    }
    materialRef.current.color.copy(baseC);

    edgesMatRef.current.opacity = isSelected ? 1 : 0;
    edgesMatRef.current.visible = isSelected;
  });

  // 将 XY 平面的几何体旋转到 XZ 平面（使挤压方向变为 Y 轴高度）
  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
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
          ref={edgesMatRef}
          color="#ffffff"
          transparent
          opacity={0}
          visible={false}
        />
      </lineSegments>
    </group>
  );
}
