// ============================================================
// FossilViewer 组件 —— 化石 3D 模型展示器
// 数据流向：
//   FossilCard "查看3D"按钮 -> useStrataStore.viewFossil(fossil)
//   Scene3D 读取 viewingFossil -> 渲染 FossilViewer
//   本组件 useFrame: 自动旋转 (0.5°/帧)
//   onClick 化石: toggleFossilRotation + setShowFossilDetail(true)
//   FossilDetailModal 读取 viewingFossil 显示拉丁名/年代/地点/特征
//   10 秒后: viewFossil(null) 自动关闭
// ============================================================
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useStrataStore } from '@/store/useStrataStore';
import createFossilModel from '@/utils/fossilModels';

export default function FossilViewer() {
  const viewingFossil = useStrataStore((s) => s.viewingFossil);
  const fossilRotating = useStrataStore((s) => s.fossilRotating);
  const setShowFossilDetail = useStrataStore((s) => s.setShowFossilDetail);
  const viewFossil = useStrataStore((s) => s.viewFossil);
  const toggleFossilRotation = useStrataStore((s) => s.toggleFossilRotation);

  const groupRef = useRef<THREE.Group>(null);
  // 固定 0.5 度每帧
  const rotationSpeedDeg = 0.5;
  const autoCloseTimer = useRef<number | null>(null);

  const fossilModel = useMemo(() => {
    if (!viewingFossil) return new THREE.Group();
    return createFossilModel(viewingFossil.modelType);
  }, [viewingFossil]);

  // ------------------------------------------------------------
  // 10 秒自动关闭逻辑
  // 点击模型时取消计时（用户在观察）
  // ------------------------------------------------------------
  useEffect(() => {
    if (viewingFossil) {
      if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = window.setTimeout(() => {
        viewFossil(null);
        setShowFossilDetail(false);
      }, 10000);
    }
    return () => {
      if (autoCloseTimer.current) {
        window.clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    };
  }, [viewingFossil, viewFossil, setShowFossilDetail]);

  // ------------------------------------------------------------
  // 每帧旋转：0.5 度/帧 绕 Y 轴
  // ------------------------------------------------------------
  useFrame(() => {
    if (groupRef.current && fossilRotating) {
      groupRef.current.rotation.y += (rotationSpeedDeg * Math.PI) / 180;
    }
  });

  if (!viewingFossil) return null;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (autoCloseTimer.current) {
      window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    toggleFossilRotation();
    setShowFossilDetail(true);
  };

  // ------------------------------------------------------------
  // 渲染结构：
  //   背景遮罩 (黑色半透明 PlaneGeometry 覆盖背后)
  //   点光源 (增强视觉)
  //   化石组 (居中 0,60,0 位置)
  // ------------------------------------------------------------
  return (
    <>
      <mesh position={[0, 60, -6]} rotation={[0, 0, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      <pointLight position={[0, 70, 12]} intensity={1.6} color="#ffffff" distance={200} />
      <pointLight position={[-20, 55, 20]} intensity={0.7} color="#60a5fa" distance={150} />
      <pointLight position={[20, 55, 20]} intensity={0.7} color="#60a5fa" distance={150} />
      <group
        ref={groupRef}
        position={[0, 60, 0]}
        scale={18}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
        <primitive object={fossilModel} />
      </group>
    </>
  );
}
