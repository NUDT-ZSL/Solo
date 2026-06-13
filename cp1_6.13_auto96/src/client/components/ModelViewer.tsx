import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ModelViewerProps {
  modelUrl: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showControls?: boolean;
  className?: string;
}

function Model({ url, autoRotateSpeed }: { url: string; autoRotateSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const { camera } = useThree();
  const userInteractingRef = useRef(false);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;
    
    camera.position.set(distance * 0.7, distance * 0.5, distance);
    camera.lookAt(center);
    
    scene.position.sub(center);
  }, [scene, camera]);

  useFrame((_, delta) => {
    if (groupRef.current && !userInteractingRef.current) {
      groupRef.current.rotation.y += delta * (autoRotateSpeed * (Math.PI / 180));
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function AutoRotateController({ speed }: { speed: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (controlsRef.current && !controlsRef.current?.isUserInteracting) {
      camera.position.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        delta * (speed * (Math.PI / 180))
      );
    }
  });

  return null;
}

function Scene({
  modelUrl,
  autoRotate,
  autoRotateSpeed,
}: {
  modelUrl: string;
  autoRotate: boolean;
  autoRotateSpeed: number;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      
      <Model url={modelUrl} autoRotateSpeed={autoRotate ? autoRotateSpeed : 0} />
      
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />
      
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={20}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
      />
    </>
  );
}

export default function ModelViewer({
  modelUrl,
  autoRotate = true,
  autoRotateSpeed = 5,
  showControls = true,
  className = '',
}: ModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [modelUrl]);

  return (
    <div className={`relative w-full h-full bg-gradient-to-b from-indigo-950 to-slate-900 rounded-xl overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            <span className="text-sm text-slate-400">加载3D模型中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [5, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        onCreated={() => setIsLoading(false)}
      >
        <color attach="background" args={['#1e1b4b']} />
        <fog attach="fog" args={['#1e1b4b', 8, 25]} />
        
        <Scene
          modelUrl={modelUrl}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      </Canvas>

      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50">
          <button
            className="p-2 text-slate-400 hover:text-white transition-colors duration-200"
            title="重置视角"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700" />
          <button
            className="p-2 text-slate-400 hover:text-white transition-colors duration-200"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-slate-400 hover:text-white transition-colors duration-200"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700" />
          <button
            className="p-2 text-slate-400 hover:text-white transition-colors duration-200"
            title="全屏"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="absolute top-3 right-3 text-xs text-slate-500 bg-slate-900/60 px-2 py-1 rounded">
        拖拽旋转 · 滚轮缩放
      </div>
    </div>
  );
}
