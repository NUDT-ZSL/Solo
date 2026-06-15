import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { planets, SUN_RADIUS, ORBIT_SCALE } from './data';
import { PlanetData } from './types';
import Planet from './Planet';
import Orbit from './Orbit';

interface CameraControllerProps {
  target: PlanetData | null;
}

function CameraController({ target }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPosition = useRef(new THREE.Vector3(30, 25, 30));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (target) {
      if (target.isSun) {
        targetLookAt.current.set(0, 0, 0);
        const distance = SUN_RADIUS * 8;
        targetPosition.current.set(distance, distance * 0.7, distance);
      } else {
        const orbitRadius = target.orbitRadiusRatio * ORBIT_SCALE;
        const planetRadius = SUN_RADIUS * target.radiusRatio;
        const distance = Math.max(planetRadius * 8, 8);
        const angle = target.initialAngle;
        const px = Math.cos(angle) * orbitRadius;
        const pz = Math.sin(angle) * orbitRadius;
        targetLookAt.current.set(px, 0, pz);
        targetPosition.current.set(
          px + distance * 0.7,
          distance * 0.5,
          pz + distance * 0.7
        );
      }
    } else {
      targetLookAt.current.set(0, 0, 0);
      targetPosition.current.set(55, 40, 55);
    }
  }, [target]);

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.04);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, 0.04);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={200}
      makeDefault
    />
  );
}

function InfoPanel({ planet }: { planet: PlanetData | null }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(planet ? 1 : 0);
  }, [planet]);

  if (!planet) return null;

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 24,
    left: 24,
    padding: '20px 24px',
    background: 'rgba(11, 13, 26, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(64, 224, 208, 0.3)',
    borderRadius: 12,
    color: '#fff',
    minWidth: 240,
    opacity: opacity,
    transition: 'opacity 0.6s ease-in-out',
    pointerEvents: 'none',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 10
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16,
    color: planet.color,
    textShadow: `0 0 20px ${planet.color}50`,
    letterSpacing: 1
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontSize: 14
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5
  };

  const valueStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums'
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>{planet.nameCN}</div>
      <div style={rowStyle}>
        <span style={labelStyle}>半径比例</span>
        <span style={valueStyle}>{planet.radiusRatio.toFixed(3)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>自转周期</span>
        <span style={valueStyle}>{planet.rotationPeriodDays.toFixed(2)} 地球日</span>
      </div>
      {!planet.isSun && (
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>公转周期</span>
          <span style={valueStyle}>{planet.orbitPeriodYears.toFixed(2)} 地球年</span>
        </div>
      )}
    </div>
  );
}

function Header() {
  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 24,
    right: 24,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'right',
    zIndex: 10,
    letterSpacing: 2,
    pointerEvents: 'none'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    color: '#40E0D0',
    letterSpacing: 6,
    marginBottom: 6,
    textShadow: '0 0 30px rgba(64,224,208,0.4)'
  };

  return (
    <div style={headerStyle}>
      <div style={titleStyle}>行星·律动</div>
      <div>PLANET · RHYTHM</div>
    </div>
  );
}

function Hint() {
  const hintStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 1,
    zIndex: 10,
    textAlign: 'center',
    pointerEvents: 'none'
  };

  return (
    <div style={hintStyle}>
      鼠标拖拽旋转视角 · 滚轮缩放 · 点击行星聚焦 · ESC 取消聚焦
    </div>
  );
}

function Scene({ focusedPlanet, hoveredPlanet, onPlanetClick, onPlanetHover }: {
  focusedPlanet: PlanetData | null;
  hoveredPlanet: string | null;
  onPlanetClick: (p: PlanetData) => void;
  onPlanetHover: (name: string | null) => void;
}) {
  const orbitLines = useMemo(() => {
    return planets
      .filter(p => !p.isSun)
      .map(p => ({
        name: p.name,
        orbitRadius: p.orbitRadiusRatio * ORBIT_SCALE
      }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight
        position={[0, 0, 0]}
        intensity={2.5}
        distance={300}
        decay={1.8}
        color="#FFF4D6"
      />
      <Stars
        radius={300}
        depth={60}
        count={8000}
        factor={7}
        saturation={0}
        fade
        speed={0.5}
      />

      {orbitLines.map(orbit => (
        <Orbit
          key={`orbit-${orbit.name}`}
          orbitRadius={orbit.orbitRadius}
          color="rgba(64,224,208,0.4)"
          highlighted={
            (focusedPlanet?.name === orbit.name) ||
            (hoveredPlanet === orbit.name)
          }
        />
      ))}

      {planets.map(planet => (
        <Planet
          key={planet.name}
          data={planet}
          onClick={onPlanetClick}
          isFocused={focusedPlanet?.name === planet.name}
          isHovered={hoveredPlanet === planet.name}
          setHovered={onPlanetHover}
        />
      ))}

      <CameraController target={focusedPlanet} />
    </>
  );
}

export default function App() {
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetData | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const handlePlanetClick = (planet: PlanetData) => {
    setFocusedPlanet(prev => prev?.name === planet.name ? null : planet);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedPlanet(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [55, 40, 55], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => setFocusedPlanet(null)}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0B0D1A']} />
        <fog attach="fog" args={['#0B0D1A', 80, 250]} />
        <Scene
          focusedPlanet={focusedPlanet}
          hoveredPlanet={hoveredPlanet}
          onPlanetClick={handlePlanetClick}
          onPlanetHover={setHoveredPlanet}
        />
      </Canvas>
      <InfoPanel planet={focusedPlanet} />
      <Header />
      <Hint />
    </div>
  );
}
