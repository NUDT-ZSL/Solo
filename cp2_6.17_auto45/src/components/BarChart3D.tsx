import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LANGUAGE_COLORS } from '../types';

interface BarData {
  language: string;
  repos: number;
  contributors: number;
  resolutionRate: number;
}

interface BarChart3DProps {
  data: BarData[];
  position?: [number, number, number];
  onBarClick?: (language: string) => void;
  selectedLanguage?: string;
}

function BarChart3D({ data, position = [0, 0, 0], onBarClick, selectedLanguage }: BarChart3DProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const barRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.repos)) * 1.2;
  }, [data]);

  const barRadius = 0.55;
  const barSpacing = 1.9;
  const maxHeight = 5;

  const targetHeights = useMemo(() => {
    const heights = new Map<string, number>();
    data.forEach(item => {
      heights.set(item.language, (item.repos / maxValue) * maxHeight);
    });
    return heights;
  }, [data, maxValue]);

  const gradientTextures = useMemo(() => {
    const textures = new Map<string, THREE.CanvasTexture>();
    data.forEach(item => {
      const baseColor = new THREE.Color(LANGUAGE_COLORS[item.language] || '#00d2ff');
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      const bottomColor = baseColor.clone().multiplyScalar(0.5);
      const topColor = baseColor.clone().multiplyScalar(1.3);
      gradient.addColorStop(0, `#${bottomColor.getHexString()}`);
      gradient.addColorStop(0.5, `#${baseColor.getHexString()}`);
      gradient.addColorStop(1, `#${topColor.getHexString()}`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 256);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      textures.set(item.language, texture);
    });
    return textures;
  }, [data]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    barRefs.current.forEach((mesh, lang) => {
      if (!mesh) return;
      const targetHeight = targetHeights.get(lang) || 0;
      const currentHeight = mesh.scale.y;
      const lerpSpeed = Math.min(delta * 2.5, 1);
      const newHeight = currentHeight + (targetHeight - currentHeight) * lerpSpeed;
      mesh.scale.y = newHeight;
      mesh.position.y = newHeight / 2;

      const isHovered = hoveredBar === lang;
      const isSelected = selectedLanguage === lang;
      const targetScale = isSelected ? 1.15 : isHovered ? 1.1 : 1;
      const currentScale = mesh.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * Math.min(delta * 5, 1);
      mesh.scale.x = newScale;
      mesh.scale.z = newScale;
    });

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.3) * 0.05;
    }
  });

  const handleBarClick = (language: string) => {
    if (onBarClick) {
      onBarClick(language);
    }
  };

  const handleBarHover = (e: ThreeEvent<PointerEvent>, language: string) => {
    e.stopPropagation();
    setHoveredBar(language);
    document.body.style.cursor = 'pointer';
  };

  const handleBarOut = () => {
    setHoveredBar(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={position} ref={groupRef}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[data.length * barSpacing + 2.5, 4.5]} />
        <meshBasicMaterial color="#0a1628" transparent opacity={0.9} />
      </mesh>

      {data.map((item, index) => {
        const x = (index - (data.length - 1) / 2) * barSpacing;
        const color = LANGUAGE_COLORS[item.language] || '#00d2ff';
        const isSelected = selectedLanguage === item.language;
        const isHovered = hoveredBar === item.language;
        const showTooltip = isHovered || isSelected;

        return (
          <group key={item.language} position={[x, 0, 0]}>
            <mesh
              ref={(el) => {
                if (el) barRefs.current.set(item.language, el);
              }}
              position={[0, 0.01, 0]}
              onClick={(e) => {
                e.stopPropagation();
                handleBarClick(item.language);
              }}
              onPointerOver={(e) => handleBarHover(e, item.language)}
              onPointerOut={handleBarOut}
              castShadow
            >
              <cylinderGeometry args={[barRadius, barRadius, 1, 48]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.7 : isHovered ? 0.5 : 0.25}
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>

            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[barRadius + 0.03, barRadius + 0.03, 0.05, 48]} />
              <meshBasicMaterial color="#f5af19" transparent opacity={isSelected ? 1 : 0.7} />
            </mesh>

            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[barRadius + 0.15, barRadius + 0.3, 48]} />
              <meshBasicMaterial
                color={isSelected ? '#f12711' : color}
                transparent
                opacity={isSelected ? 0.9 : 0.5}
              />
            </mesh>

            <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[barRadius + 0.4, barRadius + 0.45, 48]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.4 : 0.2}
              />
            </mesh>

            {showTooltip && (
              <Html
                position={[0, maxHeight + 1, 0]}
                center
                style={{
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease'
                }}
              >
                <div style={{
                  background: 'rgba(22, 33, 62, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#e0e0e0',
                  fontSize: '12px',
                  fontFamily: 'sans-serif',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  animation: 'fadeSlideUp 0.25s ease'
                }}>
                  <div style={{
                    fontWeight: '600',
                    color: color,
                    marginBottom: '6px',
                    fontSize: '13px'
                  }}>
                    {item.language}
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    平均仓库数: <span style={{ color: '#fff' }}>{Math.floor(item.repos).toLocaleString()}</span>
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    平均贡献者: <span style={{ color: '#fff' }}>{Math.floor(item.contributors).toLocaleString()}</span>
                  </div>
                  <div>
                    Issue解决率: <span style={{ color: '#f5af19' }}>{(item.resolutionRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <mesh position={[0, 0.02, -1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[data.length * barSpacing / 2 + 0.6, data.length * barSpacing / 2 + 0.8, 64]} />
        <meshBasicMaterial color="#f12711" transparent opacity={0.5} />
      </mesh>

      <mesh position={[0, 0.015, -1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[data.length * barSpacing / 2 - 0.3, data.length * barSpacing / 2 - 0.1, 64]} />
        <meshBasicMaterial color="#f5af19" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default BarChart3D;
