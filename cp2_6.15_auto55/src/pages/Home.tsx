import { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import GeologyLayer from '@/components/GeologyLayer';
import WaterParticles from '@/components/WaterParticles';
import ControlPanel from '@/components/ControlPanel';
import InfoPanel from '@/components/InfoPanel';
import Compass from '@/components/Compass';
import { useStore } from '@/store';

function Scene() {
  const { camera, scene, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraResetKey = useStore((state) => state.cameraResetKey);
  const queryPoint = useStore((state) => state.queryPoint);

  const glRef = useRef(gl);
  const sceneRef = useRef(scene);
  const cameraRef = useRef(camera);

  useEffect(() => {
    glRef.current = gl;
    sceneRef.current = scene;
    cameraRef.current = camera;
  }, [gl, scene, camera]);

  const isResettingRef = useRef(false);
  const targetPosition = useRef(new THREE.Vector3(50, 40, 50));
  const currentPosition = useRef(new THREE.Vector3(50, 40, 50));

  useEffect(() => {
    if (cameraResetKey > 0 && controlsRef.current) {
      isResettingRef.current = true;
      targetPosition.current.set(50, 40, 50);
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [cameraResetKey]);

  useFrame((_, delta) => {
    if (isResettingRef.current && controlsRef.current) {
      currentPosition.current.lerp(targetPosition.current, Math.min(1, delta * 3));
      camera.position.copy(currentPosition.current);
      controlsRef.current.update();

      const dist = currentPosition.current.distanceTo(targetPosition.current);
      if (dist < 0.1) {
        isResettingRef.current = false;
        currentPosition.current.copy(targetPosition.current);
      }
    }
  });

  const handleSceneClick = (e: any) => {
    e.stopPropagation();
    const point = e.point as THREE.Vector3;
    queryPoint(point.x, point.y, point.z);
  };

  return (
    <group onClick={handleSceneClick}>
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 60, 120]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 30]} intensity={0.8} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
      />

      <GeologyLayer />
      <WaterParticles />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <Compass position="top-left" />
    </group>
  );
}

export default function Home() {
  const fetchLayers = useStore((state) => state.fetchLayers);
  const fetchParticles = useStore((state) => state.fetchParticles);

  useEffect(() => {
    fetchLayers();
    fetchParticles(0);
  }, [fetchLayers, fetchParticles]);

  const handleCreated = ({ gl, scene, camera }: any) => {
    (window as any).__threeGL = gl;
    (window as any).__threeScene = scene;
    (window as any).__threeCamera = camera;
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a1a',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{ position: [50, 40, 50], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={handleCreated}
      >
        <Scene />
      </Canvas>

      <ControlPanel />
      <InfoPanel />
    </div>
  );
}
