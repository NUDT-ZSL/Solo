import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CrystalEngine } from './CrystalEngine';
import type { EngineParams } from './CrystalEngine';
import { CrystalBead } from './CrystalBead';
import { ControlPanel } from './ControlPanel';
import { InfoCard } from './InfoCard';
import type { InfoCardData } from './InfoCard';

const INITIAL_CAMERA = new THREE.Vector3(0, 2, 12);
const INITIAL_TARGET = new THREE.Vector3(0, -1, 0);

function CrystalScene({
  engineRef,
  onBeadClick,
}: {
  engineRef: React.MutableRefObject<CrystalEngine | null>;
  onBeadClick: (bead: CrystalBead, screenX: number, screenY: number) => void;
}) {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    const engine = new CrystalEngine(scene);
    engineRef.current = engine;

    const ambientLight = new THREE.AmbientLight(0x1a1410, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6a0dad, 1.5, 20);
    pointLight1.position.set(3, 4, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ced1, 1.2, 20);
    pointLight2.position.set(-3, 2, -3);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff6347, 0.8, 15);
    pointLight3.position.set(0, -3, 2);
    scene.add(pointLight3);

    scene.fog = new THREE.FogExp2(0x0a0806, 0.04);

    return () => {
      engine.dispose();
      scene.remove(ambientLight);
      scene.remove(pointLight1);
      scene.remove(pointLight2);
      scene.remove(pointLight3);
    };
  }, [scene]);

  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    engineRef.current?.update(clampedDelta);
  });

  const handleClick = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3; clientX?: number; clientY?: number }) => {
      if (!engineRef.current) return;
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((event.clientX ?? 0) - rect.left) / rect.width * 2 - 1;
      mouse.current.y = -((event.clientY ?? 0) - rect.top) / rect.height * 2 + 1;
      raycaster.setFromCamera(mouse.current, camera);
      const bead = engineRef.current.handleClick(raycaster);
      if (bead) {
        onBeadClick(bead, event.clientX ?? 0, event.clientY ?? 0);
      }
    },
    [gl, camera, engineRef, onBeadClick]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const handler = (e: MouseEvent) => {
      if (!engineRef.current) return;
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX) - rect.left) / rect.width * 2 - 1;
      mouse.current.y = -((e.clientY) - rect.top) / rect.height * 2 + 1;
      raycaster.setFromCamera(mouse.current, camera);
      const bead = engineRef.current.handleClick(raycaster);
      if (bead) {
        onBeadClick(bead, e.clientX, e.clientY);
      }
    };
    canvas.addEventListener('click', handler);
    return () => canvas.removeEventListener('click', handler);
  }, [gl, camera, engineRef, onBeadClick, raycaster]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={30}
      target={INITIAL_TARGET}
    />
  );
}

function BackgroundPlane() {
  return (
    <mesh position={[0, 0, -10]} receiveShadow>
      <planeGeometry args={[60, 40]} />
      <meshStandardMaterial
        color={0x0a0806}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function App() {
  const engineRef = useRef<CrystalEngine | null>(null);
  const [infoCardData, setInfoCardData] = useState<InfoCardData | null>(null);
  const [params, setParams] = useState<EngineParams>({
    growthSpeed: 1.0,
    branchProbability: 0.35,
    glowIntensity: 1.0,
  });
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.params = params;
    }
  }, [params]);

  const handleBeadClick = useCallback(
    (bead: CrystalBead, screenX: number, screenY: number) => {
      setInfoCardData({
        age: bead.getAge(),
        glowIntensity: bead.getGlowIntensity(),
        branchCount: bead.getBranchCount(),
        depth: bead.data.depth,
        screenX,
        screenY,
      });
    },
    []
  );

  const handleResetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  const handleResetScene = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
    setInfoCardData(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: INITIAL_CAMERA,
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: '#000' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <CrystalScene engineRef={engineRef} onBeadClick={handleBeadClick} />
        <BackgroundPlane />
      </Canvas>

      <ControlPanel
        params={params}
        onParamsChange={setParams}
        onResetView={handleResetView}
        onResetScene={handleResetScene}
      />

      <InfoCard data={infoCardData} onClose={() => setInfoCardData(null)} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
