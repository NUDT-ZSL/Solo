import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Background } from '@react-three/drei';
import * as THREE from 'three';
import { useMeteoStore } from '@/store/useMeteoStore';
import Terrain from './Terrain';
import Chart3D from './Chart3D';

function SceneContent() {
  const groupRef = useRef<THREE.Group>(null);
  const { sceneRotation, setIsLoaded } = useMeteoStore();
  const animationRef = useRef({ progress: 0, duration: 2 });

  useEffect(() => {
    animationRef.current.progress = 0;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const anim = animationRef.current;

    if (anim.progress < 1) {
      anim.progress = Math.min(anim.progress + delta / anim.duration, 1);

      if (anim.progress >= 1) {
        setIsLoaded(true);
      }
    }

    const t = anim.progress;
    const easeOutCubic = 1 - Math.pow(1 - t, 3);

    const scale = easeOutCubic;
    groupRef.current.scale.setScalar(scale);

    if (anim.progress < 1) {
      const startRotation = -Math.PI / 4;
      groupRef.current.rotation.y = startRotation * (1 - easeOutCubic);
    } else {
      groupRef.current.rotation.y = sceneRotation;
    }

    const opacity = easeOutCubic;
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            mat.transparent = true;
            mat.opacity = opacity;
          }
        });
      }
    });
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
