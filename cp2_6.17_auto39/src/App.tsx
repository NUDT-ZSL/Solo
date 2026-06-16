import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Globe } from './earth/globe';
import { Atmosphere } from './earth/atmosphere';
import { RoutesLayer } from './earth/routes';
import { HeatmapLayer } from './analysis/heatmap';
import { Timeline } from './ui/timeline';
import { InfoPanel } from './ui/infoPanel';
import { HeatmapToggle } from './ui/heatmapToggle';
import { RouteTooltip } from './ui/routeTooltip';
import { Header } from './ui/header';
import { StatusBar } from './ui/statusBar';
import { useFetchRoutes } from './hooks/useFetchRoutes';
import { useGlobalStore } from './store/useGlobalStore';

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.35} color="#aaccff" />
      <hemisphereLight args={['#6688bb', '#332211', 0.4]} />
      <directionalLight
        position={[8, 6, 5]}
        intensity={1.3}
        color="#fff4e0"
        castShadow
      />
      <directionalLight
        position={[-6, 2, -4]}
        intensity={0.25}
        color="#8899ff"
      />
    </>
  );
}

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        color: '#c9d1d9',
        fontFamily: "'SF Mono', monospace",
        flexDirection: 'column',
        gap: 16
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid #21262d',
          borderTopColor: '#4ecdc4',
          animation: 'spin 0.9s linear infinite'
        }}
      />
      <div style={{ fontSize: 14, letterSpacing: 2 }}>加载全球航运数据中…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        color: '#c9d1d9',
        flexDirection: 'column',
        gap: 16,
        padding: 20
      }}
    >
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 15, color: '#ff6b6b', fontWeight: 600 }}>数据加载失败</div>
      <div style={{ fontSize: 12, color: '#8b949e' }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          padding: '10px 24px',
          borderRadius: 6,
          background: '#4ecdc4',
          color: '#0d1117',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 13
        }}
      >
        重新加载
      </button>
    </div>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 2.5, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    // 轻微相机浮动呼吸效果
    const t = performance.now() * 0.00015;
    camera.position.y = 2.5 + Math.sin(t) * 0.08;
  });

  return null;
}

function Scene3D() {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2.5, 12] }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0d1117', 1);
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      dpr={[1, 2]}
    >
      <CameraSetup />
      <SceneLights />
      <Suspense fallback={null}>
        <Stars
          radius={120}
          depth={50}
          count={3500}
          factor={4}
          saturation={0}
          fade
          speed={0.3}
        />
        <Atmosphere />
        <Globe />
        <RoutesLayer />
        <HeatmapLayer />
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={2}
        maxDistance={20}
        enablePan={false}
        enableTouch
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        }}
      />
    </Canvas>
  );
}

export default function App() {
  useFetchRoutes();
  const loading = useGlobalStore(s => s.routesLoading);
  const error = useGlobalStore(s => s.routesError);
  const setError = useGlobalStore(s => s.setRoutesError);
  const setLoading = useGlobalStore(s => s.setRoutesLoading);
  const retryKeyRef = useRef(0);

  function retryLoad() {
    setError(null);
    setLoading(true);
    retryKeyRef.current++;
    window.location.reload();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        minWidth: 800,
        minHeight: 500,
        background: '#0d1117',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 20% 10%, rgba(68, 136, 255, 0.08), transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(255, 107, 107, 0.06), transparent 50%), #0d1117'
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>
        <Scene3D key={retryKeyRef.current} />
      </div>
      <Header />
      <HeatmapToggle />
      <InfoPanel />
      <Timeline />
      <StatusBar />
      <RouteTooltip />
      {loading && <LoadingOverlay />}
      {error && !loading && <ErrorOverlay message={error} onRetry={retryLoad} />}
    </div>
  );
}
