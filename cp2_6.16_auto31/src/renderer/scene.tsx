import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SeabedTerrain, Shipwreck, Artifacts, FishSchool, Annotations } from './objects';
import { useAppStore } from '../data/store';
import { getAllAnnotations, addAnnotation as saveAnnotation } from '../data/storage';
import type { Annotation } from '../data/store';

function Lights() {
  return (
    <>
      <ambientLight color="#1565c0" intensity={0.3} />
      <directionalLight
        position={[5, 8, 10]}
        color="#4fc3f7"
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[0, -3, 0]}
        color="#00bcd4"
        intensity={0.6}
        distance={15}
      />
      <hemisphereLight
        color="#4fc3f7"
        groundColor="#0a2a4a"
        intensity={0.4}
      />
    </>
  );
}

function SceneContent() {
  const setAnnotations = useAppStore((s) => s.setAnnotations);

  useEffect(() => {
    getAllAnnotations()
      .then((anns) => {
        setAnnotations(anns);
      })
      .catch((err) => console.error('Failed to load annotations:', err));
  }, [setAnnotations]);

  return (
    <>
      <Lights />
      <fog attach="fog" args={['#0a2a4a', 15, 50]} />
      <SeabedTerrain />
      <Shipwreck />
      <Artifacts />
      <FishSchool />
      <Annotations />
    </>
  );
}

export function Scene() {
  const controlsRef = useRef<any>(null);
  const setRightClickMenu = useAppStore((s) => s.setRightClickMenu);
  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const isMarkerMode = useAppStore((s) => s.isMarkerMode);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isMarkerMode) return;

    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas || !controlsRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const camera = controlsRef.current.object;
    if (!camera) return;

    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (intersectPoint) {
      intersectPoint.y = -1.5;
      setRightClickMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        position: [intersectPoint.x, intersectPoint.y + 0.1, intersectPoint.z],
      });
    }
  };

  const handleClick = () => {
    const menu = useAppStore.getState().rightClickMenu;
    if (menu.visible) {
      setRightClickMenu({ ...menu, visible: false });
    }
  };

  const addAnnotationAtPosition = async (name: string, color: string, position: [number, number, number]) => {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      position,
      createdAt: Date.now(),
    };

    addAnnotation(newAnnotation);
    try {
      await saveAnnotation(newAnnotation);
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }
  };

  return (
    <div
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <Canvas
        camera={{ position: [8, 4, 8], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0d47a1');
        }}
        style={{ background: 'linear-gradient(to bottom, #0d47a1, #000000)' }}
      >
        <Suspense fallback={null}>
          <SceneContent />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2 - 0.1}
            target={[0, -1, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
