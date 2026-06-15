import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import GalleryRenderer from './GalleryRenderer';
import ExhibitObject from './ExhibitObject';
import type { Exhibit } from '../store/useStore';

interface SceneProps {
  exhibits: Exhibit[];
  allExhibits: Exhibit[];
  selectedExhibit: Exhibit | null;
  onSelectExhibit: (exhibit: Exhibit | null) => void;
  themeMode: 'day' | 'night';
  isTransitioning: boolean;
  filterCategory: string;
  galleryName: string;
}

function CameraController({ selectedExhibit, isTransitioning }: { selectedExhibit: Exhibit | null; isTransitioning: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPosition = useRef(new THREE.Vector3(0, 5, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const prevSelectedId = useRef<number | null>(null);

  useEffect(() => {
    if (selectedExhibit && selectedExhibit.id !== prevSelectedId.current) {
      startPosition.current.copy(camera.position);
      startLookAt.current.copy(controlsRef.current?.target || new THREE.Vector3());
      targetPosition.current.set(
        selectedExhibit.position.x,
        selectedExhibit.position.y + 2,
        selectedExhibit.position.z + 5
      );
      targetLookAt.current.set(
        selectedExhibit.position.x,
        selectedExhibit.position.y,
        selectedExhibit.position.z
      );
      isAnimating.current = true;
      animationProgress.current = 0;
      prevSelectedId.current = selectedExhibit.id;
    } else if (!selectedExhibit && prevSelectedId.current !== null) {
      startPosition.current.copy(camera.position);
      startLookAt.current.copy(controlsRef.current?.target || new THREE.Vector3());
      targetPosition.current.set(0, 5, 15);
      targetLookAt.current.set(0, 0, 0);
      isAnimating.current = true;
      animationProgress.current = 0;
      prevSelectedId.current = null;
    }
  }, [selectedExhibit, camera]);

  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useFrame((_, delta) => {
    if (isAnimating.current) {
      animationProgress.current += delta / 1.2;
      if (animationProgress.current >= 1) {
        animationProgress.current = 1;
        isAnimating.current = false;
      }
      const t = easeInOutCubic(animationProgress.current);
      camera.position.lerpVectors(startPosition.current, targetPosition.current, t);
      const newLookAt = new THREE.Vector3().lerpVectors(startLookAt.current, targetLookAt.current, t);
      if (controlsRef.current) {
        controlsRef.current.target.copy(newLookAt);
      }
    }
  });

  const handleReset = () => {
    startPosition.current.copy(camera.position);
    startLookAt.current.copy(controlsRef.current?.target || new THREE.Vector3());
    targetPosition.current.set(0, 5, 15);
    targetLookAt.current.set(0, 0, 0);
    isAnimating.current = true;
    animationProgress.current = 0;
  };

  useEffect(() => {
    (window as any).resetCamera = handleReset;
    return () => {
      delete (window as any).resetCamera;
    };
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={30}
      enabled={!isAnimating.current && !isTransitioning}
    />
  );
}

function Lighting({ themeMode }: { themeMode: 'day' | 'night' }) {
  const [intensity, setIntensity] = useState(themeMode === 'day' ? 1 : 0.3);
  const [color, setColor] = useState(themeMode === 'day' ? '#fff5e6' : '#a0c4ff');
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const targetIntensity = themeMode === 'day' ? 1 : 0.3;
    const targetColor = themeMode === 'day' ? '#fff5e6' : '#a0c4ff';
    const duration = 1000;
    const startTime = Date.now();
    const startIntensity = intensity;
    const startColor = new THREE.Color(color);
    const endColor = new THREE.Color(targetColor);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = progress;

      setIntensity(startIntensity + (targetIntensity - startIntensity) * t);

      const currentColor = new THREE.Color().lerpColors(startColor, endColor, t);
      setColor('#' + currentColor.getHexString());

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [themeMode]);

  return (
    <>
      <ambientLight ref={ambientRef} intensity={intensity * 0.4} color={color} />
      <directionalLight
        ref={directionalRef}
        position={[10, 15, 10]}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {themeMode === 'night' && (
        <>
          <pointLight position={[-8, 3, -8]} intensity={0.6} color="#809fff" distance={15} />
          <pointLight position={[8, 3, -8]} intensity={0.6} color="#809fff" distance={15} />
          <pointLight position={[0, 3, 8]} intensity={0.6} color="#809fff" distance={15} />
        </>
      )}
    </>
  );
}

function SceneContent({
  exhibits,
  allExhibits,
  selectedExhibit,
  onSelectExhibit,
  filterCategory,
  isTransitioning,
}: Omit<SceneProps, 'themeMode' | 'galleryName'>) {
  const groupRef = useRef<THREE.Group>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'fadeOut' | 'fadeIn'>('idle');
  const [rotationY, setRotationY] = useState(0);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (isTransitioning) {
      setAnimationState('fadeOut');
      const startTime = Date.now();
      const fadeOutDuration = 500;

      const animateFadeOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeOutDuration, 1);
        const t = 1 - Math.pow(1 - progress, 3);
        setScale(1 - t);
        setOpacity(1 - t);

        if (progress < 1) {
          requestAnimationFrame(animateFadeOut);
        } else {
          setAnimationState('fadeIn');
          const fadeInStart = Date.now();
          const fadeInDuration = 600;

          const animateFadeIn = () => {
            const elapsed = Date.now() - fadeInStart;
            const progress = Math.min(elapsed / fadeInDuration, 1);
            const t = 1 - Math.pow(1 - progress, 3);
            setScale(t);
            setRotationY(Math.PI * 2 * t);
            setOpacity(t);

            if (progress < 1) {
              requestAnimationFrame(animateFadeIn);
            } else {
              setAnimationState('idle');
              setRotationY(0);
            }
          };
          animateFadeIn();
        }
      };
      animateFadeOut();
    }
  }, [isTransitioning]);

  return (
    <group ref={groupRef} scale={scale} rotation={[0, rotationY, 0]}>
      <GalleryRenderer opacity={opacity} />
      {exhibits.map((exhibit) => {
        const isFiltered = filterCategory !== 'all' && exhibit.category !== filterCategory;
        return (
          <ExhibitObject
            key={exhibit.id}
            exhibit={exhibit}
            isSelected={selectedExhibit?.id === exhibit.id}
            onClick={() => onSelectExhibit(exhibit)}
            isFiltered={isFiltered}
            opacity={opacity}
          />
        );
      })}
    </group>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 15], fov: 60 }}
      style={{ background: props.themeMode === 'day' ? '#1a1a3a' : '#0a0a1a' }}
      gl={{ antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2) }}
    >
      <CameraController selectedExhibit={props.selectedExhibit} isTransitioning={props.isTransitioning} />
      <Lighting themeMode={props.themeMode} />
      {props.themeMode === 'night' && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />}
      <SceneContent {...props} />
    </Canvas>
  );
}
