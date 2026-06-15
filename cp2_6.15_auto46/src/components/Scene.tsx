import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Background } from '@react-three/drei';
import * as THREE from 'three';
import { useMeteoStore } from '@/store/useMeteoStore';
import Terrain from './Terrain';
import Chart3D from './Chart3D';

function SceneContent() {
  const groupRef = useRef<THREE.Group>(null);
  const { isLoaded, sceneRotation, setIsLoaded } = useMeteoStore();
  const animationRef = useRef({ progress: 0, startRotation: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [setIsLoaded]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const anim = animationRef.current;
    const targetProgress = isLoaded ? 1 : 0;
    const speed = 0.5;

    if (anim.progress < targetProgress) {
      anim.progress = Math.min(anim.progress + delta * speed, targetProgress);
    } else if (anim.progress > targetProgress) {
      anim.progress = Math.max(anim.progress - delta * speed, targetProgress);
    }

    const t = anim.progress;
    const easeOutCubic = 1 - Math.pow(1 - t, 3);

    const scale = easeOutCubic;
    groupRef.current.scale.setScalar(scale);

    const initialRotation = sceneRotation;
    const startRotation = anim.startRotation;
    const currentRotation = startRotation + (initialRotation - startRotation) * easeOutCubic;
    groupRef.current.rotation.y = currentRotation;
  });

  useFrame(() => {
    if (groupRef.current && isLoaded) {
      groupRef.current.rotation.y = sceneRotation;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <pointLight intensity={1} position={[10, 20, 10]} />
      <Terrain />
      <Chart3D />
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

export default function Scene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas shadows>
        <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={30} />
        <CameraController />
        <Background
          gradient
          topColor="#0a0a2e"
          bottomColor="#1a1a4e"
        />
        <SceneContent />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
