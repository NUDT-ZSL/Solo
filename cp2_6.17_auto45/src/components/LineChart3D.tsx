import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LANGUAGE_COLORS } from '../types';

interface LinePoint {
  month: number;
  value: number;
}

interface LineData {
  language: string;
  points: LinePoint[];
}

interface LineChart3DProps {
  data: LineData[];
  position?: [number, number, number];
}

interface HoverInfo {
  lineIndex: number;
  pointIndex: number;
  position: [number, number, number];
  value: number;
  month: number;
}

function LineChart3D({ data, position = [0, 0, 0] }: LineChart3DProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoverInfo | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const dotRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const fadeTimerRef = useRef<number | null>(null);
  const targetPoints = useRef<THREE.Vector3[]>([]);
  const currentPoints = useRef<THREE.Vector3[]>([]);
  const t = useRef(0);

  const width = 8;
  const height = 4.5;
  const depth = 6;
  const months = 120;

  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach(line => {
      line.points.forEach(p => {
        if (p.value > max) max = p.value;
      });
    });
    return max * 1.15;
  }, [data]);

  const lineConfigs = useMemo(() => {
    return data.map((line, lineIndex) => {
      const zOffset = (lineIndex - (data.length - 1) / 2) * 0.9;
      const color = LANGUAGE_COLORS[line.language] || '#00d2ff';

      const targetPts: THREE.Vector3[] = [];
      const currentPts: THREE.Vector3[] = [];
      line.points.forEach((point, i) => {
        const x = (i / (months - 1)) * width - width / 2;
        const y = (point.value / maxValue) * height;
        const z = zOffset;
        targetPts.push(new THREE.Vector3(x, y, z));
        currentPts.push(new THREE.Vector3(x, 0, z));
      });

      const curve = new THREE.CatmullRomCurve3(targetPts);
      const tubeGeometry = new THREE.TubeGeometry(curve, 150, 0.04, 6, false);

      const dotData: { position: [number, number, number]; value: number; month: number; index: number }[] = [];
      const step = Math.max(1, Math.floor(line.points.length / 15));
      for (let i = 0; i < line.points.length; i += step) {
        const point = line.points[i];
        const x = (i / (months - 1)) * width - width / 2;
        const y = (point.value / maxValue) * height;
        const z = zOffset;
        dotData.push({
          position: [x, y, z],
          value: point.value,
          month: point.month,
          index: Math.floor(i / step)
        });
      }

      return { curve, tubeGeometry, dotData, color, zOffset, targetPts };
    });
  }, [data, maxValue]);

  useEffect(() => {
    t.current = 0;
  }, [data]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    t.current = Math.min(t.current + delta * 2, 1);

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.25) * 0.08;
    }

    dotRefs.current.forEach((mesh, key) => {
      if (mesh) {
        const baseScale = mesh.userData.baseScale || 1;
        const scale = baseScale + Math.sin(time * 2 + parseInt(key.split('-')[1]) * 0.5) * 0.15;
        mesh.scale.setScalar(scale);
      }
    });
  });

  const handleDotHover = (e: ThreeEvent<PointerEvent>, lineIndex: number, dotIndex: number) => {
    e.stopPropagation();
    const config = lineConfigs[lineIndex];
    const dot = config.dotData[dotIndex];
    if (dot) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      setHoveredPoint({
        lineIndex,
        pointIndex: dotIndex,
        position: dot.position,
        value: dot.value,
        month: dot.month
      });
      setTooltipVisible(true);
      document.body.style.cursor = 'pointer';
    }
  };

  const handleDotOut = () => {
    document.body.style.cursor = 'auto';
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
      setTimeout(() => {
        setHoveredPoint(null);
      }, 150);
    }, 50);
  };

  const hoverColor = hoveredPoint && data[hoveredPoint.lineIndex]
    ? LANGUAGE_COLORS[data[hoveredPoint.lineIndex].language]
    : '#00d2ff';

  return (
    <group position={position} ref={groupRef}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 1.5, depth + 2.5]} />
        <meshBasicMaterial color="#0a1628" transparent opacity={0.9} />
      </mesh>

      <group position={[-width / 2, 0, -depth / 2]}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <mesh key={i} position={[width / 2, height * ratio, depth / 2]}>
            <planeGeometry args={[width, 0.015]} />
            <meshBasicMaterial color="#1a3a5c" transparent opacity={0.4} />
          </mesh>
        ))}
      </group>

      {lineConfigs.map((config, lineIndex) => (
        <group key={lineIndex}>
          <mesh geometry={config.tubeGeometry} ref={(el) => { if (el) lineRefs.current.set(lineIndex, el); }}>
            <meshStandardMaterial
              color={config.color}
              emissive={config.color}
              emissiveIntensity={0.5}
              metalness={0.6}
              roughness={0.2}
              transparent
              opacity={0.9}
            />
          </mesh>

          {config.dotData.map((dot, dotIndex) => (
            <mesh
              key={dotIndex}
              position={dot.position as [number, number, number]}
              ref={(el) => {
                if (el) {
                  dotRefs.current.set(`${lineIndex}-${dotIndex}`, el);
                  el.userData.baseScale = 1;
                }
              }}
              onPointerOver={(e) => handleDotHover(e, lineIndex, dotIndex)}
              onPointerOut={handleDotOut}
            >
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial
                color={config.color}
                emissive={config.color}
                emissiveIntensity={1}
              />
            </mesh>
          ))}
        </group>
      ))}

      {hoveredPoint && (
        <Html
          position={[
            hoveredPoint.position[0],
            hoveredPoint.position[1] + 0.8,
            hoveredPoint.position[2]
          ]}
          center
          zIndexRange={[100, 0]}
          style={{
            pointerEvents: 'none',
            opacity: tooltipVisible ? 1 : 0,
            transition: 'opacity 0.15s ease-in-out',
            transform: tooltipVisible ? 'translateY(0)' : 'translateY(5px)',
          }}
        >
          <div className="line-tooltip" style={{
            background: 'rgba(22, 33, 62, 0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${hoverColor}`,
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#e0e0e0',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: `0 4px 20px ${hoverColor}40`,
          }}>
            <div style={{
              fontWeight: '600',
              marginBottom: '4px',
              color: hoverColor,
              fontSize: '13px'
            }}>
              {data[hoveredPoint.lineIndex]?.language}
            </div>
            <div style={{ marginBottom: '2px' }}>
              月份: 第 {hoveredPoint.month + 1} 个月
            </div>
            <div>
              贡献者: <span style={{ color: '#fff', fontWeight: '500' }}>{hoveredPoint.value.toLocaleString()}</span>
            </div>
          </div>
        </Html>
      )}

      <mesh position={[0, 0.03, -depth / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width / 2 - 0.3, width / 2 - 0.1, 64]} />
        <meshBasicMaterial color="#f5af19" transparent opacity={0.5} />
      </mesh>

      <mesh position={[0, 0.02, -depth / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width / 2 + 0.2, width / 2 + 0.35, 64]} />
        <meshBasicMaterial color="#f12711" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default LineChart3D;
