import React, { useRef, useState, useEffect, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PartType, MATERIAL_COLORS, PART_DEFINITIONS } from '../store/partsStore';

interface Props {
  type: PartType;
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('3D thumbnail error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function FallbackThumbnail({ type }: { type: PartType }) {
  const def = PART_DEFINITIONS[type];
  const isTenon = type.includes('tenon');
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #3a3a3a 0%, #2c2c2c 100%)',
      borderRadius: '4px',
      gap: '4px',
    }}>
      <div style={{ fontSize: '24px' }}>{isTenon ? '🧩' : '📦'}</div>
      <div style={{ fontSize: '10px', color: '#888' }}>{def.name}</div>
      <div style={{ fontSize: '9px', color: '#666' }}>预览加载失败</div>
    </div>
  );
}

function LoadingThumbnail() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #3a3a3a 0%, #2c2c2c 100%)',
      borderRadius: '4px',
      gap: '6px',
    }}>
      <div
        style={{
          width: '20px',
          height: '20px',
          border: '2px solid #555',
          borderTopColor: '#d4a76a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <div style={{ fontSize: '9px', color: '#777' }}>加载中...</div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function createMiniMaterial() {
  return new THREE.MeshStandardMaterial({
    color: MATERIAL_COLORS.oak,
    roughness: 0.75,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
}

function MiniPartGeometry({ type }: { type: PartType }) {
  const def = PART_DEFINITIONS[type];
  const { width, height, depth } = def.dimensions;
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  const mat = createMiniMaterial();
  const accentMat = new THREE.MeshStandardMaterial({
    color: '#d4a76a',
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const renderShape = () => {
    switch (type) {
      case 'tenon': {
        const tenonW = width * 0.6;
        const tenonD = depth * 0.5;
        const baseD = depth - tenonD;
        return (
          <group>
            <mesh position={[0, 0, -tenonD / 2]} castShadow receiveShadow>
              <boxGeometry args={[width, height, baseD]} />
              <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[0, 0, baseD / 2]} castShadow receiveShadow>
              <boxGeometry args={[tenonW, height * 0.85, tenonD]} />
              <primitive object={accentMat} attach="material" />
            </mesh>
          </group>
        );
      }
      case 'mortise': {
        const mortiseW = width * 0.64;
        const mortiseH = height * 0.88;
        const mortiseD = depth * 0.52;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.lineTo(-width / 2, -height / 2);
        const hole = new THREE.Path();
        hole.moveTo(-mortiseW / 2, -mortiseH / 2);
        hole.lineTo(mortiseW / 2, -mortiseH / 2);
        hole.lineTo(mortiseW / 2, mortiseH / 2);
        hole.lineTo(-mortiseW / 2, mortiseH / 2);
        hole.lineTo(-mortiseW / 2, -mortiseH / 2);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth, bevelEnabled: false });
        geo.center();
        return (
          <mesh geometry={geo} castShadow receiveShadow>
            <primitive object={mat} attach="material" />
          </mesh>
        );
      }
      case 'dovetail_tenon': {
        const baseD = depth * 0.45;
        const tailD = depth * 0.55;
        const tailTopW = width * 0.72;
        const tailBotW = width * 0.52;
        const tailShape = new THREE.Shape();
        tailShape.moveTo(-tailBotW / 2, -height / 2);
        tailShape.lineTo(tailBotW / 2, -height / 2);
        tailShape.lineTo(tailTopW / 2, height / 2);
        tailShape.lineTo(-tailTopW / 2, height / 2);
        tailShape.lineTo(-tailBotW / 2, -height / 2);
        const tailGeo = new THREE.ExtrudeGeometry(tailShape, { steps: 1, depth: tailD, bevelEnabled: false });
        tailGeo.center();
        return (
          <group>
            <mesh position={[0, 0, -tailD / 2]} castShadow receiveShadow>
              <boxGeometry args={[width, height, baseD]} />
              <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[0, 0, baseD / 2]} castShadow receiveShadow>
              <primitive object={tailGeo} attach="geometry" />
              <primitive object={accentMat} attach="material" />
            </mesh>
          </group>
        );
      }
      case 'dovetail_mortise': {
        const slotTopW = width * 0.76;
        const slotBotW = width * 0.56;
        const slotH = height * 0.9;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.lineTo(-width / 2, -height / 2);
        const hole = new THREE.Path();
        hole.moveTo(-slotBotW / 2, -slotH / 2);
        hole.lineTo(slotBotW / 2, -slotH / 2);
        hole.lineTo(slotTopW / 2, slotH / 2);
        hole.lineTo(-slotTopW / 2, slotH / 2);
        hole.lineTo(-slotBotW / 2, -slotH / 2);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth, bevelEnabled: false });
        geo.center();
        return (
          <mesh geometry={geo} castShadow receiveShadow>
            <primitive object={mat} attach="material" />
          </mesh>
        );
      }
      case 'l_tenon': {
        const armW = width * 0.9;
        const tenonExt = depth * 0.55;
        return (
          <group>
            <mesh position={[-width * 0.22, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.56, height, depth * 0.55]} />
              <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[0, 0, -depth * 0.22]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.55, height, depth * 0.56]} />
              <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[width * 0.28, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[tenonExt * 0.8, height * 0.85, depth * 0.28]} />
              <primitive object={accentMat} attach="material" />
            </mesh>
            <mesh position={[0, 0, depth * 0.28]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.28, height * 0.85, tenonExt * 0.8]} />
              <primitive object={accentMat} attach="material" />
            </mesh>
          </group>
        );
      }
      case 'l_mortise': {
        const thick = width * 0.45;
        return (
          <group>
            <mesh position={[0, 0, -depth / 2 + thick / 2]} castShadow receiveShadow>
              <boxGeometry args={[width, height, thick]} />
              <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[width / 2 - thick / 2, 0, thick / 2]} castShadow receiveShadow>
              <boxGeometry args={[thick, height, depth - thick]} />
              <primitive object={mat} attach="material" />
            </mesh>
          </group>
        );
      }
      default:
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.7, height, depth * 0.7]} />
            <primitive object={mat} attach="material" />
          </mesh>
        );
    }
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[-0.35, 0.6, 0]}>
      {renderShape()}
    </group>
  );
}

function ThumbnailCanvas({ type }: { type: PartType }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return <FallbackThumbnail type={type} />;
  }

  if (!loaded) {
    return <LoadingThumbnail />;
  }

  const handleError = () => {
    setError(true);
  };

  try {
    return (
      <Canvas
        camera={{ position: [3.5, 2.8, 3.5], fov: 35, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />
        <MiniPartGeometry type={type} />
      </Canvas>
    );
  } catch (e) {
    return <FallbackThumbnail type={type} />;
  }
}

export function PartThumbnail3D({ type }: Props) {
  return (
    <ErrorBoundary fallback={<FallbackThumbnail type={type} />}>
      <ThumbnailCanvas type={type} />
    </ErrorBoundary>
  );
}
