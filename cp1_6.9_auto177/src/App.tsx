import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import PrismArray from './scene/PrismArray';
import ControlPanel from './ui/ControlPanel';
import { HSLParams, ControlPoint } from './types';

const DEFAULT_HSL: HSLParams = {
  hue: 0,
  saturation: 80,
  lightness: 55
};

const DEFAULT_TILT_CURVE: ControlPoint[] = [
  { x: 0, y: 0.3 },
  { x: 0.5, y: 0.8 },
  { x: 1, y: 0.3 }
];

const DEFAULT_ROTATION_CURVE: ControlPoint[] = [
  { x: 0, y: 0.2 },
  { x: 0.5, y: 0.5 },
  { x: 1, y: 0.9 }
];

const Scene: React.FC<{
  hsl: HSLParams;
  tiltCurve: ControlPoint[];
  rotationCurve: ControlPoint[];
}> = ({ hsl, tiltCurve, rotationCurve }) => {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-8, 10, -5]} intensity={0.4} color="#4488ff" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#00BFFF" distance={30} />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#FF6B9D" distance={25} />

      <Suspense fallback={null}>
        <PrismArray
          hsl={hsl}
          tiltCurve={tiltCurve}
          rotationCurve={rotationCurve}
        />
      </Suspense>

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#0B0E14"
          transparent
          opacity={0.9}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={30}
        minPolarAngle={15 * Math.PI / 180}
        maxPolarAngle={75 * Math.PI / 180}
      />
    </>
  );
};

const FPSMonitor: React.FC = () => {
  const [fps, setFps] = useState(60);
  const framesRef = React.useRef(0);
  const lastTimeRef = React.useRef(performance.now());

  React.useEffect(() => {
    let rafId: number;
    const measure = () => {
      framesRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current);
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      rafId = requestAnimationFrame(measure);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const fpsColor = fps >= 50 ? '#00FF88' : (fps >= 30 ? '#FFAA00' : '#FF4444');

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      color: 'rgba(255,255,255,0.8)',
      fontFamily: 'monospace',
      fontSize: '13px',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: fpsColor,
        boxShadow: `0 0 8px ${fpsColor}`
      }} />
      <span style={{ letterSpacing: '1px' }}>
        FPS: <span style={{ color: fpsColor, fontWeight: 600 }}>{fps}</span>
      </span>
    </div>
  );
};

const App: React.FC = () => {
  const [hsl, setHsl] = useState<HSLParams>(DEFAULT_HSL);
  const [tiltCurve, setTiltCurve] = useState<ControlPoint[]>(DEFAULT_TILT_CURVE);
  const [rotationCurve, setRotationCurve] = useState<ControlPoint[]>(DEFAULT_ROTATION_CURVE);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: '#0B0E14',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse at 20% 80%, rgba(0, 100, 200, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(100, 0, 150, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0, 50, 100, 0.05) 0%, transparent 70%)
        `,
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <Canvas
        shadows
        camera={{ position: [12, 12, 16], fov: 50, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: 3,
          toneMappingExposure: 1.1
        }}
        dpr={[1, 2]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      >
        <color attach="background" args={['#0B0E14']} />
        <fog attach="fog" args={['#0B0E14', 25, 60]} />
        <Scene
          hsl={hsl}
          tiltCurve={tiltCurve}
          rotationCurve={rotationCurve}
        />
      </Canvas>

      <FPSMonitor />

      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3vw, 32px)',
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '8px',
          textShadow: '0 0 30px rgba(0,191,255,0.5), 0 0 60px rgba(0,191,255,0.2)'
        }}>
          光 棱 矩 阵
        </h1>
        <p style={{
          margin: '6px 0 0',
          fontSize: 'clamp(11px, 1vw, 13px)',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '3px'
        }}>
          PRISM · MATRIX · INTERACTIVE
        </p>
      </div>

      <ControlPanel
        hsl={hsl}
        tiltCurve={tiltCurve}
        rotationCurve={rotationCurve}
        onHslChange={setHsl}
        onTiltCurveChange={setTiltCurve}
        onRotationCurveChange={setRotationCurve}
      />
    </div>
  );
};

export default App;
