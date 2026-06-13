import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Showroom from './scenes/Showroom';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  color: string;
  keywords: string[];
  shapeType: number;
  angle: number;
}

function LoadingOctahedron() {
  const meshRef = useRef<THREE.Mesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.3 * delta;
      meshRef.current.rotation.y += 0.3 * delta;
    }
    if (linesRef.current) {
      linesRef.current.rotation.x += 0.3 * delta;
      linesRef.current.rotation.y += 0.3 * delta;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <shaderMaterial
          transparent
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vec3 color1 = vec3(0.388, 0.4, 0.945);
              vec3 color2 = vec3(0.545, 0.361, 0.965);
              float mixFactor = (vPosition.y + 1.2) / 2.4;
              vec3 finalColor = mix(color1, color2, mixFactor);
              float intensity = dot(vNormal, vec3(0.0, 1.0, 0.5)) * 0.5 + 0.5;
              gl_FragColor = vec4(finalColor * intensity, 0.85);
            }
          `}
        />
      </mesh>
      <lineSegments ref={linesRef}>
        <octahedronGeometry args={[1.21, 0]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
}

function LoadingScreen({ fading }: { fading: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div style={{ width: 280, height: 280 }}>
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[3, 3, 3]} intensity={1} />
          <LoadingOctahedron />
        </Canvas>
      </div>
      <div style={{ marginTop: 24, fontSize: 22, letterSpacing: 4, color: '#a5b4fc', fontWeight: 600 }}>
        ProductExplorer
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: '#64748b', letterSpacing: 2 }}>
        正在加载 3D 展厅...
      </div>
      <div
        style={{
          marginTop: 32,
          width: 200,
          height: 3,
          background: 'rgba(99,102,241,0.2)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            width: fading ? '100%' : '75%',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2000);
    const hideTimer = setTimeout(() => {
      setLoading(false);
    }, 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {loading && <LoadingScreen fading={fading} />}
      <Showroom />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export type { Product };
