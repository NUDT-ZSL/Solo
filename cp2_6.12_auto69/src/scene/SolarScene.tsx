import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { planetData, planetsData, sunData, PlanetData } from '@/astronomy/planetData';
import { calculateAllOrbitPositions, generateOrbitPoints, OrbitPosition } from '@/astronomy/orbitCalculator';
import Planet from './Planet';
import StarField from './StarField';

interface SolarSceneProps {
  speedMultiplier: number;
  isPaused: boolean;
  focusedPlanetId: string | null;
  onPlanetClick: (planet: PlanetData, position: THREE.Vector3) => void;
  cameraTarget: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  onCameraTransitionComplete: () => void;
}

function OrbitRing({ planet }: { planet: PlanetData }) {
  const points = useMemo(() => generateOrbitPoints(planet), [planet]);
  
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="rgba(255,255,255,0.3)" linewidth={1} transparent />
    </line>
  );
}

function CameraController({ 
  target, 
  onComplete 
}: { 
  target: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!target || !controlsRef.current) return;

    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const endPos = target.position;
    const endTarget = target.target;

    const duration = target.target.length() === 0 ? 1000 : 1200;
    const startTime = performance.now();
    isAnimatingRef.current = true;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPos, endPos, easeProgress);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, easeProgress);
      controlsRef.current.update();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        onComplete();
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, camera, onComplete]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.9}
      minDistance={5}
      maxDistance={200}
      enablePan={false}
    />
  );
}

function SolarSystemContent({
  speedMultiplier,
  isPaused,
  focusedPlanetId,
  onPlanetClick,
  cameraTarget,
  onCameraTransitionComplete,
}: SolarSceneProps) {
  const [orbitPositions, setOrbitPositions] = useState<OrbitPosition[]>([]);
  const timeRef = useRef(0);
  const { scene } = useThree();

  useEffect(() => {
    const initialPositions = calculateAllOrbitPositions(0, speedMultiplier);
    setOrbitPositions(initialPositions);
  }, [speedMultiplier]);

  useFrame((_, delta) => {
    if (document.hidden) return;
    
    if (!isPaused) {
      timeRef.current += delta * 1000 * speedMultiplier;
      const newPositions = calculateAllOrbitPositions(timeRef.current, 1);
      setOrbitPositions(newPositions);
    }
  });

  const getPlanetPosition = (planetId: string): THREE.Vector3 => {
    if (planetId === 'sun') return new THREE.Vector3(0, 0, 0);
    const orbitPos = orbitPositions.find(p => p.planetId === planetId);
    return orbitPos?.position || new THREE.Vector3(0, 0, 0);
  };

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight
        position={[0, 0, 0]}
        color="#ffaa00"
        intensity={1.5}
        distance={200}
        decay={2}
      />
      <pointLight
        position={[0, 0, 0]}
        color="#ff6600"
        intensity={0.5}
        distance={100}
        decay={2}
      />

      <StarField count={5000} radius={200} />

      <Planet
        data={sunData}
        position={new THREE.Vector3(0, 0, 0)}
        onClick={() => onPlanetClick(sunData, new THREE.Vector3(0, 0, 0))}
        isPaused={isPaused}
      />

      {planetsData.map((planet) => (
        <OrbitRing key={`orbit-${planet.id}`} planet={planet} />
      ))}

      {planetsData.map((planet) => {
        const position = getPlanetPosition(planet.id);
        return (
          <Planet
            key={planet.id}
            data={planet}
            position={position}
            onClick={() => onPlanetClick(planet, position)}
            isPaused={isPaused}
          />
        );
      })}

      <CameraController
        target={cameraTarget}
        onComplete={onCameraTransitionComplete}
      />
    </>
  );
}

export default function SolarScene(props: SolarSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 40, 50], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ background: '#0a0a1a' }}
      dpr={[1, 2]}
    >
      <SolarSystemContent {...props} />
    </Canvas>
  );
}
