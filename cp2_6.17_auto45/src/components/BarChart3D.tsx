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

function createGradientTexture(colorBottom: string, colorTop: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, colorBottom);
  gradient.addColorStop(1, colorTop);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function BarChart3D({ data, position = [0, 0, 0], onBarClick, selectedLanguage }: BarChart3DProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const barRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const currentHeights = useRef<Map<string, number>>(new Map());
  const targetHeights = useRef<Map<string, number>>(new Map());
  const t = useRef(0);

  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.repos)) * 1.2;
  }, [data]);

  const barRadius = 0.55;
  const barSpacing = 1.9;
  const maxHeight = 5;

  const gradientTextures = useMemo(() => {
    const textures = new Map<string, THREE.CanvasTexture>();
    data.forEach(item => {
      const baseColor = LANGUAGE_COLORS[item.language] || '#00d2ff';
      const bottomColor = new THREE.Color(baseColor).multiplyScalar(0.4);
      const topColor = new THREE.Color(baseColor).multiplyScalar(1.4);
      const texture = createGradientTexture(
        `#${bottomColor.getHexString()}`,
        `#${topColor.getHexString()}`
      );
      textures.set(item.language, texture);
    });
    return textures;
  }, [data]);

  const redOrangeGradient = useMemo(() => {
    return createGradientTexture('#f12711', '#f5af19');
  }, []);

  useEffect(() => {
    targetHeights.current = new Map();
    data.forEach(item => {
      const targetH = (item.repos / maxValue) * maxHeight;
      targetHeights.current.set(item.language, targetH);
      if (!currentHeights.current.has(item.language)) {
        currentHeights.current.set(item.language, 0);
      }
    });
    t.current = 0;
  }, [data, maxValue]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    t.current = Math.min(t.current + delta * 2, 1);

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

    barRefs.current.forEach((mesh, lang) => {
      if (!mesh) return;
      const targetH = targetHeights.current.get(lang) || 0;
      const currentH = currentHeights.current.get(lang) || 0;
      const newH = currentH + (targetH - currentH) * easeOutCubic(t.current);

      mesh.scale.y = newH;
      mesh.position.y = newH / 2;
      currentHeights.current.set(lang, newH);

      const isHovered = hoveredBar === lang;
      const isSelected = selectedLanguage === lang;
      const targetScale = isSelected ? 1.12 : isHovered ? 1.08 : 1;
      const currentScale = mesh.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * Math.min(delta * 4, 1);
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
    setTooltipVisible(language);
    document.body.style.cursor = 'pointer';
  };

  const handleBarOut = () => {
    setHoveredBar(null);
    setTimeout(() => {
      setTooltipVisible(null);
    }, 150);
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
        const showTooltip = tooltipVisible === item.language;
        const gradientTex = gradientTextures.get(item.language);

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
                map={gradientTex}
                color={0xffffff}
                emissive={color}
                emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
                emissiveMap={gradientTex}
                metalness={0.65}
                roughness={0.3}
              />
            </mesh>

            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[barRadius + 0.03, barRadius + 0.03, 0.05, 48]} />
              <meshBasicMaterial
                map={redOrangeGradient}
                color={0xffffff}
                transparent
                opacity={isSelected ? 1 : 0.7}
              />
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
                position={[0, maxHeight + 1.2, 0]}
                center
                zIndexRange={[100, 0]}
                style={{
                  pointerEvents: 'none',
                  opacity: isHovered || isSelected ? 1 : 0,
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                  transform: (isHovered || isSelected) ? 'translateY(0)' : 'translateY(-8px)',
                }}
              >
                <div style={{
                  background: 'rgba(22, 33, 62, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#e0e0e0',
                  fontSize: '12px',
                  fontFamily: 'sans-serif',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 4px 24px ${color}30`,
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
                    平均仓库数: <span style={{ color: '#fff', fontWeight: '500' }}>{Math.floor(item.repos).toLocaleString()}</span>
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    平均贡献者: <span style={{ color: '#fff', fontWeight: '500' }}>{Math.floor(item.contributors).toLocaleString()}</span>
                  </div>
                  <div>
                    Issue解决率: <span style={{ color: '#f5af19', fontWeight: '500' }}>{(item.resolutionRate * 100).toFixed(1)}%</span>
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
