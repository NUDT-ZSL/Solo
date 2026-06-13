import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TattooTransform {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

interface PreviewCanvasProps {
  patternImage?: string;
  patternName?: string;
  onTransformChange?: (transform: TattooTransform) => void;
}

const SkinEllipsoid: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 6, 0, 0]}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhysicalMaterial
        color="#fde5d4"
        transparent
        opacity={0.9}
        roughness={0.7}
        metalness={0.1}
        sheen={0.3}
        sheenColor="#ffd4b8"
        emissive="#5c2c1a"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
};

interface TattooPlaneProps {
  imageSrc: string;
  transform: TattooTransform;
  isDragging: boolean;
  onDragStart: () => void;
}

const TattooPlane: React.FC<TattooPlaneProps> = ({ imageSrc, transform, isDragging, onDragStart }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const [fadeIn, setFadeIn] = useState(0);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageSrc, () => {
      setFadeIn(1);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
    return tex;
  }, [imageSrc]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetOpacity = isDragging ? 0.9 : 0.85;
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * delta * 5;
    }
  });

  const scale = transform.scale;

  return (
    <mesh
      ref={meshRef}
      position={[transform.position.x, transform.position.y, 1.85]}
      rotation={[0, 0, transform.rotation * Math.PI / 180]}
      scale={[scale, scale, scale]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
    >
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={fadeIn * 0.85}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface SceneProps {
  patternImage?: string;
  transform: TattooTransform;
  onTransformChange: (t: TattooTransform) => void;
}

const Scene: React.FC<SceneProps> = ({ patternImage, transform, onTransformChange }) => {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!patternImage) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.position.x,
      ty: transform.position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [patternImage, transform.position.x, transform.position.y]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !patternImage) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndx = (dx / rect.width) * 4;
    const ndy = -(dy / rect.height) * 4;

    const minStep = 2 / 100;
    let newX = dragStart.current.tx + ndx;
    let newY = dragStart.current.ty + ndy;

    newX = Math.round(newX / minStep) * minStep;
    newY = Math.round(newY / minStep) * minStep;

    newX = Math.max(-1.5, Math.min(1.5, newX));
    newY = Math.max(-1.5, Math.min(1.5, newY));

    onTransformChange({
      ...transform,
      position: { x: newX, y: newY },
    });
  }, [isDragging, patternImage, transform, onTransformChange, gl]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!patternImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2.0, transform.scale + delta));
    onTransformChange({
      ...transform,
      scale: Math.round(newScale * 100) / 100,
    });
  }, [patternImage, transform, onTransformChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!patternImage) return;
    if (e.key === 'r' || e.key === 'R') {
      onTransformChange({
        ...transform,
        rotation: (transform.rotation + 15) % 360,
      });
    }
  }, [patternImage, transform, onTransformChange]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gl, handlePointerMove, handlePointerUp, handleWheel, handleKeyDown]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5eb" />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#d4b5ff" />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#ffd4b8" />

      <SkinEllipsoid />

      {patternImage && (
        <TattooPlane
          imageSrc={patternImage}
          transform={transform}
          isDragging={isDragging}
          onDragStart={() => {}}
        />
      )}

      <mesh
        onPointerDown={handlePointerDown}
        position={[0, 0, 1.8]}
        visible={false}
      >
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
};

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  patternImage,
  patternName,
  onTransformChange,
}) => {
  const [transform, setTransform] = useState<TattooTransform>({
    position: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
  });

  useEffect(() => {
    setTransform({
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
    });
  }, [patternImage]);

  const handleTransformChange = useCallback((t: TattooTransform) => {
    setTransform(t);
    onTransformChange?.(t);
  }, [onTransformChange]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        position: 'relative',
        background: 'linear-gradient(180deg, #1a0f0a 0%, #0f172a 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          patternImage={patternImage}
          transform={transform}
          onTransformChange={handleTransformChange}
        />
      </Canvas>

      {!patternImage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#94a3b8',
            fontSize: '16px',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>请从右侧选择一个纹身图案</p>
          <p style={{ fontSize: '13px', opacity: 0.7 }}>拖拽移动 · 滚轮缩放 · R键旋转</p>
        </div>
      )}

      {patternImage && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#e2e8f0',
            fontSize: '12px',
            opacity: 0.8,
          }}
        >
          <span>{patternName}</span>
          <span>缩放: {(transform.scale * 100).toFixed(0)}% | 旋转: {transform.rotation}°</span>
        </div>
      )}
    </div>
  );
};

export default PreviewCanvas;
