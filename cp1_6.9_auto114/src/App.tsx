import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import Tree, { TreeData } from './Tree';

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const slerp = (a: THREE.Quaternion, b: THREE.Quaternion, t: number): THREE.Quaternion => {
  const result = a.clone();
  result.slerp(b, t);
  return result;
};

interface ScenePreset {
  name: string;
  frequencyRange: [number, number];
  hueShift: number;
  saturationBoost: number;
}

const PRESETS: Record<string, ScenePreset> = {
  calm: { name: '宁静', frequencyRange: [10, 30], hueShift: 180, saturationBoost: 0 },
  wild: { name: '狂野', frequencyRange: [70, 100], hueShift: 0, saturationBoost: 0.2 },
  glow: { name: '荧光', frequencyRange: [40, 60], hueShift: 120, saturationBoost: 0.4 },
};

interface StarsProps {
  count: number;
  isMobile: boolean;
}

const Stars: React.FC<StarsProps> = React.memo(({ count, isMobile }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.8 + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geom;
  }, [count]);

  useFrame((state) => {
    if (materialRef.current && !isMobile) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  if (isMobile) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={`
          precision highp float;
          attribute float aPhase;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float cycle = 3.0 + mod(aPhase, 3.0);
            float t = mod(uTime / cycle + aPhase, 1.0);
            vAlpha = 0.3 + 0.7 * (0.5 + 0.5 * sin(t * 6.28318));
            gl_Position = projectionMatrix * mvPosition;
            float size = 0.05 + mod(aPhase, 0.15);
            gl_PointSize = size * (500.0 / -mvPosition.z);
          }
        `}
        fragmentShader={`
          precision highp float;
          varying float vAlpha;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float glow = 1.0 - smoothstep(0.1, 0.5, dist);
            vec3 color = vec3(0.9, 0.95, 1.0);
            float alpha = clamp(vAlpha * glow, 0.0, 1.0);
            gl_FragColor = vec4(color, alpha);
          }
        `}
        uniforms={{
          uTime: { value: 0 },
        }}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});

Stars.displayName = 'Stars';

interface GroundRingProps {
  ringRadius: number;
  ringWidth: number;
}

const GroundRing: React.FC<GroundRingProps> = React.memo(({ ringRadius, ringWidth }) => {
  const groupRef = useRef<THREE.Group>(null);

  const geometries = useMemo(() => {
    const rings: THREE.BufferGeometry[] = [];
    const segments = 128;

    for (let r = ringRadius - ringWidth / 2; r <= ringRadius + ringWidth / 2; r += 0.5) {
      const positions: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
      rings.push(geometry);
    }

    for (let i = 0; i <= segments; i += 4) {
      const theta = (i / segments) * Math.PI * 2;
      const positions: number[] = [];
      positions.push(
        Math.cos(theta) * (ringRadius - ringWidth / 2),
        0,
        Math.sin(theta) * (ringRadius - ringWidth / 2),
        Math.cos(theta) * (ringRadius + ringWidth / 2),
        0,
        Math.sin(theta) * (ringRadius + ringWidth / 2)
      );
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
      rings.push(geometry);
    }

    return rings;
  }, [ringRadius, ringWidth]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {geometries.map((geom, idx) => (
        <lineSegments key={idx} geometry={geom} frustumCulled={false}>
          <lineBasicMaterial
            color="#00BFFF"
            transparent={true}
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      ))}
    </group>
  );
});

GroundRing.displayName = 'GroundRing';

export interface SceneState {
  trees: TreeData[];
  frequency: number;
}

const generateTrees = (count: number = 50): TreeData[] => {
  const trees: TreeData[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 30;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    trees.push({
      id: i,
      position: [x, 0, z],
      frequency: 50,
      phase: Math.random() * Math.PI * 2,
      height: 3 + Math.random() * 5,
      hueBase: Math.random() * 240,
      seed: Math.random(),
      isHighlighted: false,
    });
  }
  return trees;
};

interface ControlPanelProps {
  frequency: number;
  setFrequency: (v: number) => void;
  onReset: () => void;
  onBurst: () => void;
  selectedTree: TreeData | null;
  onExport: () => void;
  onImport: (file: File) => void;
  onPreset: (preset: keyof typeof PRESETS) => void;
  isMobile: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  frequency,
  setFrequency,
  onReset,
  onBurst,
  selectedTree,
  onExport,
  onImport,
  onPreset,
  isMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '2px solid rgba(78, 205, 196, 0.5)',
    borderRadius: '12px',
    color: 'white',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    padding: isMobile ? '16px' : '20px',
    overflowY: 'auto',
    ...(isMobile
      ? {
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: 'auto',
          maxHeight: '50vh',
        }
      : {
          left: '20px',
          bottom: '20px',
          width: '280px',
          height: 'auto',
        }),
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#2a2a3d',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
    margin: 0,
  };

  const sliderThumbStyle = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4ECDC4;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      background: #5EE6D4;
    }
    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4ECDC4;
      cursor: pointer;
      border: none;
      transition: background 0.3s ease;
    }
    input[type="range"]::-moz-range-thumb:hover {
      background: #5EE6D4;
    }
  `;

  const buttonStyle = (bg: string): React.CSSProperties => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: bg,
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  });

  const handleImportClick = () => fileInputRef.current?.click();

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div style={panelStyles}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#4ECDC4' }}>
          光之森·旋律林冠
        </h3>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>旋律频率</span>
            <span style={{ color: '#4ECDC4' }}>{frequency.toFixed(0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={onReset}
            style={buttonStyle('rgba(255,255,255,0.05)')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B35)'}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            重置
          </button>
          <button
            onClick={onBurst}
            style={buttonStyle('rgba(255,255,255,0.05)')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B35)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            旋律爆发
          </button>
        </div>

        {selectedTree && (
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(78, 205, 196, 0.15)',
              border: '1px solid rgba(78, 205, 196, 0.3)',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>选中的树 #{selectedTree.id + 1}</div>
            <div style={{ lineHeight: 1.8 }}>
              <div>频率: {selectedTree.frequency.toFixed(0)}</div>
              <div>相位: {selectedTree.phase.toFixed(2)}</div>
              <div>高度: {selectedTree.height.toFixed(2)}</div>
              <div>
                位置: ({selectedTree.position[0].toFixed(1)}, {selectedTree.position[2].toFixed(1)})
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={onExport}
            style={buttonStyle('rgba(255,255,255,0.05)')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B35)'}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            导出
          </button>
          <button
            onClick={handleImportClick}
            style={buttonStyle('rgba(255,255,255,0.05)')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B35)'}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </div>

        <div>
          <div style={{ margin: '6px 0' }}>预设</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
              <button
                key={key}
                onClick={() => onPreset(key)}
                style={buttonStyle('rgba(255,255,255,0.05)')}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #4ECDC4, #FF6B35)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                {PRESETS[key].name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

interface CamAnimState {
  active: boolean;
  start: THREE.Vector3;
  target: THREE.Vector3;
  startTarget: THREE.Vector3;
  startQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  startTime: number;
  duration: number;
  orbitCenter: THREE.Vector3;
  orbitAngle: number;
  orbitActive: boolean;
  orbitStartTime: number | null;
  highlightActive: boolean;
}

function App() {
  const [frequency, setFrequency] = useState<number>(50);
  const [trees, setTrees] = useState<TreeData[]>(() => generateTrees(50));
  const [burstActive, setBurstActive] = useState(false);
  const [burstProgress, setBurstProgress] = useState(0);
  const [burstTarget, setBurstTarget] = useState(50);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [highlightProgress, setHighlightProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [segments, setSegments] = useState(20);
  const [particlesPerTree, setParticlesPerTree] = useState(20);
  const [starCount, setStarCount] = useState(200);

  const burstStartTimeRef = useRef<number | null>(null);
  const selectedTree = useMemo(() => trees.find((t) => t.id === selectedTreeId) || null, [trees, selectedTreeId]);

  const { camera } = useThree();

  const camAnimRef = useRef<CamAnimState | null>(null);

  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
      if (window.innerWidth < 768) {
        setSegments(12);
        setParticlesPerTree(10);
        setStarCount(100);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('touchstart', () => setIsMobile(true), { once: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const checkPerformance = () => {
      if (frameTimesRef.current.length === 0) return;
      const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = 1000 / avg;
      if (fps < 30 && segments > 12) {
        setSegments(12);
        setParticlesPerTree(10);
        setStarCount(100);
      }
    };
    const interval = setInterval(checkPerformance, 2000);
    return () => clearInterval(interval);
  }, [segments]);

  useFrame((state, delta) => {
    frameTimesRef.current.push(delta * 1000);
    frameTimesRef.current = frameTimesRef.current.slice(-60);

    if (burstActive) {
      if (burstStartTimeRef.current === null) {
        burstStartTimeRef.current = state.clock.getElapsedTime();
      }
      const elapsed = state.clock.getElapsedTime() - (burstStartTimeRef.current || 0);
      const progress = Math.min(elapsed / 5, 1);
      setBurstProgress(progress);
      if (progress >= 1) {
        setBurstActive(false);
        burstStartTimeRef.current = null;
      }
    }

    if (camAnimRef.current?.active) {
      const anim = camAnimRef.current;
      const elapsed = state.clock.getElapsedTime() - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const eased = easeInOutCubic(t);

      camera.position.lerpVectors(anim.start, anim.target, eased);
      camera.quaternion.copy(slerp(anim.startQuat, anim.targetQuat, eased));

      if (t >= 1 && !camAnimRef.current.orbitActive) {
        camAnimRef.current.orbitActive = true;
        camAnimRef.current.orbitStartTime = state.clock.getElapsedTime();
      }

      if (camAnimRef.current.orbitActive && camAnimRef.current.orbitStartTime !== null) {
        const orbitElapsed = state.clock.getElapsedTime() - camAnimRef.current.orbitStartTime;
        const orbitT = Math.min(orbitElapsed / 3, 1);
        const orbitEased = easeInOutCubic(orbitT);
        const angle = anim.orbitAngle * orbitEased;
        const radius = camera.position.distanceTo(anim.orbitCenter);
        const baseAngle = Math.atan2(
          camera.position.x - anim.orbitCenter.x,
          camera.position.z - anim.orbitCenter.z
        );
        camera.position.x = anim.orbitCenter.x + Math.cos(baseAngle + angle) * radius;
        camera.position.z = anim.orbitCenter.z + Math.sin(baseAngle + angle) * radius;
        camera.lookAt(anim.orbitCenter);

        if (orbitT >= 1) {
          camAnimRef.current = null;
        }
      }
    }

    if (selectedTreeId !== null) {
      if (highlightProgress < 1) {
        setHighlightProgress((p) => Math.min(p + delta / 0.5, 1));
      }
    } else if (highlightProgress > 0) {
      setHighlightProgress((p) => Math.max(p - delta / 2, 0));
    }
  });

  const handleReset = useCallback(() => {
    setTrees(generateTrees(50));
    setFrequency(50);
    setSelectedTreeId(null);
    camAnimRef.current = null;
  }, []);

  const handleBurst = useCallback(() => {
    setBurstActive(true);
    burstStartTimeRef.current = null;
    setBurstTarget(Math.floor(Math.random() * 100));
  }, []);

  const handleTreeDoubleClick = useCallback(
    (treeData: TreeData, _event: ThreeEvent<MouseEvent>) => {
      setSelectedTreeId(treeData.id);

      const treePos = new THREE.Vector3(
        treeData.position[0],
        treeData.height * 0.6,
        treeData.position[2]
      );
      const startPos = camera.position.clone();
      const startQuat = camera.quaternion.clone();

      const direction = new THREE.Vector3().subVectors(startPos, treePos).normalize();
      const targetPos = treePos.clone().add(direction.multiplyScalar(treeData.height * 2.5));

      const tempCamera = new THREE.PerspectiveCamera();
      tempCamera.position.copy(targetPos);
      tempCamera.lookAt(treePos);
      const targetQuat = tempCamera.quaternion.clone();

      camAnimRef.current = {
        active: true,
        start: startPos,
        target: targetPos,
        startTarget: treePos,
        startQuat,
        targetQuat,
        startTime: performance.now() / 1000,
        duration: 1.5,
        orbitCenter: treePos,
        orbitAngle: Math.PI,
        orbitActive: false,
        orbitStartTime: null,
        highlightActive: true,
      };
    },
    [camera]
  );

  const handleExport = useCallback(() => {
    const state: SceneState = { trees, frequency };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melody-forest-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [trees, frequency]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SceneState;
        if (data.trees) setTrees(data.trees);
        if (typeof data.frequency === 'number') setFrequency(data.frequency);
      } catch (err) {
        console.error('导入失败', err);
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePreset = useCallback((presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    const [min, max] = preset.frequencyRange;
    const newFreq = min + Math.random() * (max - min);
    setFrequency(newFreq);
    setTrees((prev) =>
      prev.map((t) => ({
        ...t,
        frequency: newFreq,
        hueBase: (t.hueBase + preset.hueShift) % 360,
      }))
    );
  }, []);

  const wanderValues = useMemo(() => {
    return trees.map((t) => ({
      period: 8 + Math.random() * 7,
      amplitude: 0.2 + Math.random() * 0.3,
    }));
  }, [trees]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 30, 0]} intensity={0.5} color="#4ECDC4" />
      <pointLight position={[30, 20, 30]} intensity={0.3} color="#FF6B35" />

      <Stars count={starCount} isMobile={isMobile} />
      <GroundRing ringRadius={40} ringWidth={2} />

      {trees.map((tree, idx) => (
        <Tree
          key={tree.id}
          data={tree}
          globalFrequency={frequency}
          segments={segments}
          particlesPerTree={particlesPerTree}
          burstProgress={burstProgress}
          burstTargetFrequency={burstTarget}
          burstActive={burstActive}
          isMobile={isMobile}
          onDoubleClick={handleTreeDoubleClick}
          selected={tree.id === selectedTreeId}
          highlightProgress={tree.id === selectedTreeId ? highlightProgress : 0}
          wanderPeriod={wanderValues[idx].period}
          wanderAmplitude={wanderValues[idx].amplitude}
        />
      ))}

      <ControlPanel
        frequency={frequency}
        setFrequency={setFrequency}
        onReset={handleReset}
        onBurst={handleBurst}
        selectedTree={selectedTree}
        onExport={handleExport}
        onImport={handleImport}
        onPreset={handlePreset}
        isMobile={isMobile}
      />
    </>
  );
}

export default App;
