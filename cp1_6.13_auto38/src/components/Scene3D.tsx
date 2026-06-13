// ============================================================
// Scene3D 组件 —— 核心 3D 场景容器
// 数据流向：
//   App(父) -> useStrataStore.layers -> StrataLayers(子) -> LayerSlice(子子)
//   LayerSlice onClick -> useStrataStore.selectLayer -> SidePanel 读取 selectedLayerId
//   useStrataStore.viewingFossil -> FossilViewer(子) 渲染化石模型
//   TimelineSlider -> useStrataStore.timeline -> LayerSlice 读取动画
// ============================================================
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { LayerSlice } from './LayerSlice';
import FossilViewer from './FossilViewer';
import { useStrataStore } from '@/store/useStrataStore';
import type { Layer } from '@/types';
import { useMemo, useRef, useEffect } from 'react';

// 地层间距（单位：Three.js 世界单位）
const LAYER_SPACING = 1;
const BASE_LAYER_HEIGHT = 10;

// ------------------------------------------------------------
// CameraResetInner —— 视角重置控制器
// 数据流：useStrataStore.cameraResetTrigger 变化 -> 平滑恢复默认视角
// ------------------------------------------------------------
function CameraResetInner() {
  const { camera, controls } = useThree() as { camera: THREE.PerspectiveCamera; controls: any };
  const cameraResetTrigger = useStrataStore((s) => s.cameraResetTrigger);
  const defaultPos = useMemo(() => new THREE.Vector3(0, 80, 200), []);
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const isResetting = useRef(false);
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const startTime = useRef(0);
  const duration = 0.5;

  useEffect(() => {
    if (cameraResetTrigger > 0) {
      isResetting.current = true;
      startPos.current.copy(camera.position);
      startTime.current = performance.now() / 1000;
      if (controls && controls.target) {
        startTarget.current.copy(controls.target);
      } else {
        startTarget.current.set(0, 0, 0);
      }
    }
  }, [cameraResetTrigger, camera, controls]);

  useFrame(() => {
    if (!isResetting.current) return;
    const elapsed = performance.now() / 1000 - startTime.current;
    const rawT = Math.min(elapsed / duration, 1);
    const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    camera.position.lerpVectors(startPos.current, defaultPos, t);
    if (controls && controls.target) {
      controls.target.lerpVectors(startTarget.current, defaultTarget, t);
    }
    camera.lookAt(defaultTarget);

    if (rawT >= 1) {
      isResetting.current = false;
    }
  });

  return null;
}

// ------------------------------------------------------------
// StrataLayers —— 地层堆叠容器
// 负责：计算每层的 baseY（堆叠偏移）、从 store 读取 timeline 并分发
// ------------------------------------------------------------
function StrataLayers() {
  const layers = useStrataStore((s) => s.layers);
  const selectedLayerId = useStrataStore((s) => s.selectedLayerId);
  const selectLayer = useStrataStore((s) => s.selectLayer);
  const timeline = useStrataStore((s) => s.timeline);
  const animationSpeed = useStrataStore((s) => s.animationSpeed);
  const viewingFossil = useStrataStore((s) => s.viewingFossil);
  const totalLayers = layers.length || 6;

  const layersInfo = useMemo(() => {
    let cumulativeHeight = 0;
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    return sortedLayers.map((layer: Layer) => {
      const layerHeight = BASE_LAYER_HEIGHT + (layer.thickness / 400) * 10;
      const baseY = cumulativeHeight;
      cumulativeHeight += layerHeight + LAYER_SPACING;
      const isSelected = layer._id === selectedLayerId;
      return { layer, baseY, layerHeight, isSelected };
    });
  }, [layers, selectedLayerId]);

  const centerOffset = useMemo(() => {
    if (layersInfo.length === 0) return 0;
    const last = layersInfo[layersInfo.length - 1];
    return -(last.baseY + last.layerHeight) / 2;
  }, [layersInfo]);

  return (
    <>
      {layersInfo.map(({ layer, baseY, layerHeight, isSelected }) => (
        <LayerSlice
          key={layer._id}
          layer={layer}
          isSelected={isSelected}
          onClick={() => selectLayer(layer._id === selectedLayerId ? null : layer._id)}
          timelineProgress={timeline}
          animationSpeed={animationSpeed}
          baseY={baseY + centerOffset}
          layerHeight={layerHeight}
          totalLayers={totalLayers}
        />
      ))}
      {viewingFossil && <FossilViewer />}
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 80, 200], fov: 50, near: 0.1, far: 2000 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      frameloop="always"
    >
      <color attach="background" args={[0x0f172a]} />
      <fog attach="fog" args={[0x0f172a, 300, 800]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-50, 60, -50]} intensity={0.25} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={40}
        maxDistance={400}
        autoRotate
        autoRotateSpeed={0.1}
        enablePan
      />
      <CameraResetInner />
      <StrataLayers />
      <Stats className="!top-16 !left-4" />
    </Canvas>
  );
}
