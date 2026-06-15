import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import StratumModel from './modules/visualization/StratumModel';
import SceneControls from './modules/visualization/Controls';
import CuttingPlanesManager from './modules/visualization/CuttingPlanes';
import RippleEffects from './modules/visualization/RippleEffects';
import AnnotationLabels from './modules/visualization/AnnotationLabels';
import AnnotationPanel from './modules/annotation/AnnotationPanel';
import { STRATUM } from './store';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleReset = () => {
    if ((window as any).__resetStratumCamera) {
      (window as any).__resetStratumCamera();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#1a1a2e',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: isMobile ? 0 : 350,
          overflow: 'hidden',
        }}
      >
        <Canvas
          camera={{ position: [200, 180, 200], fov: 45, near: 0.1, far: 2000 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            localClippingEnabled: true,
          }}
          dpr={[1, 2]}
          shadows={false}
          style={{ background: '#1a1a2e' }}
        >
          <color attach="background" args={['#1a1a2e']} />
          <fog attach="fog" args={['#1a1a2e', 400, 800]} />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[150, 200, 100]}
            intensity={0.9}
            color="#ffffff"
          />
          <directionalLight
            position={[-100, 150, -80]}
            intensity={0.4}
            color="#90caf9"
          />
          <pointLight position={[0, -80, 0]} intensity={0.3} color="#ffcc80" distance={300} />

          <GroundPlane />
          <StratumModel />
          <CuttingPlanesManager />
          <AnnotationLabels />
          <RippleEffects />
          <SceneControls />
        </Canvas>

        <button
          onClick={handleReset}
          title="重置视角"
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: '#4db6ac',
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(77, 182, 172, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'transform 0.15s ease, background 0.2s ease',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#26a69a';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4db6ac';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        >
          ⟲
        </button>

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#37474f',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#263238' }}>操作提示</div>
          <div>🖱️ 左键拖拽：旋转视角</div>
          <div>🖱️ 滚轮：缩放</div>
          <div>🖱️ 右键拖拽：平移</div>
          <div>🎯 拖动红色切面/手柄：切割地层</div>
          <div>👆 点击截面：查询岩性</div>
        </div>
      </div>

      <AnnotationPanel />
    </div>
  );
}

function GroundPlane() {
  return (
    <group>
      <gridHelper
        args={[300, 30, '#90a4ae', '#90a4ae']}
        position={[0, STRATUM.yTop, 0]}
        rotation={[0, 0, 0]}
      >
        <meshBasicMaterial transparent opacity={0.2} />
      </gridHelper>

      <mesh position={[0, STRATUM.yTop - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial color="#37474f" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>

      <axesHelper args={[50]} position={[-150, STRATUM.yTop, 150]} />
    </group>
  );
}
