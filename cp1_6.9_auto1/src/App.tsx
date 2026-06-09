import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import OrigamiModel, { OrigamiTopology } from './OrigamiModel';
import { generateCreaseTexture, generateStarTexture, generateParticleTexture } from './TextureGenerator';

interface ModelInstance {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  topology: OrigamiTopology;
  fractalLevel: number;
  scale: number;
  hueShift: number;
  foldProgress: number;
}

interface ParticleBurst {
  id: string;
  position: THREE.Vector3;
  particles: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    life: number;
    maxLife: number;
  }[];
  startTime: number;
}

const PARTICLE_COLORS = [
  new THREE.Color('#FF4444'),
  new THREE.Color('#FFCC00'),
  new THREE.Color('#4488FF'),
  new THREE.Color('#CC44FF'),
];

const TOPOLOGIES: OrigamiTopology[] = ['cube', 'pyramid', 'star', 'hexagon', 'octahedron', 'diamond'];

const distributeOnSphere = (radius: number, count: number): THREE.Vector3[] => {
  const positions: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return positions;
};

const StarField = ({ starTexture }: { starTexture: THREE.Texture }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const dataRef = useRef<{ phases: Float32Array; frequencies: Float32Array }>();

  const { positions, colors, phases, frequencies } = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const frequencies = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 15 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const hue = Math.random();
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      phases[i] = Math.random() * Math.PI * 2;
      frequencies[i] = (1 + Math.random() * 2) * (2 * Math.PI);
    }

    return { positions, colors, phases, frequencies };
  }, []);

  useEffect(() => {
    dataRef.current = { phases, frequencies };
  }, [phases, frequencies]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const material = pointsRef.current.material as THREE.PointsMaterial;
    const geometry = pointsRef.current.geometry;
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

    const time = clock.getElapsedTime();

    for (let i = 0; i < 100; i++) {
      const phase = dataRef.current!.phases[i];
      const freq = dataRef.current!.frequencies[i];
      const brightness = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * freq + phase));

      const hue = ((time * 0.05) + i * 0.01) % 1;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.3 + brightness * 0.4);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }
    colorAttr.needsUpdate = true;

    pointsRef.current.rotation.y = time * 0.02;
    pointsRef.current.rotation.x = Math.sin(time * 0.01) * 0.1;
  });

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [positions, colors]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.5}
        map={starTexture}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

const DynamicLight = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const mousePos = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const speed = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      const dx = nx - mousePos.current.lastX;
      const dy = ny - mousePos.current.lastY;
      speed.current = Math.sqrt(dx * dx + dy * dy);
      mousePos.current.lastX = nx;
      mousePos.current.lastY = ny;
      mousePos.current.x = nx;
      mousePos.current.y = ny;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const time = clock.getElapsedTime();
    const radius = 5;

    const baseAngle = time * 0.5;
    const mouseInfluenceX = mousePos.current.x * 0.5;
    const mouseInfluenceY = mousePos.current.y * 0.5;

    const theta = baseAngle + mouseInfluenceX * 2;
    const phi = Math.PI / 2 + mouseInfluenceY * 1.2;

    lightRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
    lightRef.current.position.y = radius * Math.cos(phi);
    lightRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);

    const intensity = 0.2 + Math.min(0.6, speed.current * 20);
    lightRef.current.intensity = THREE.MathUtils.lerp(
      lightRef.current.intensity,
      1 + intensity * 1.5,
      0.1
    );

    speed.current *= 0.9;
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        color={0xffffff}
        intensity={1}
        distance={50}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <ambientLight intensity={0.25} color={0x8899ff} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} color={0xaaaaee} />
    </>
  );
};

const ShatterParticles = ({ bursts, particleTexture }: { bursts: ParticleBurst[]; particleTexture: THREE.Texture }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const { allPositions, allColors, allSizes } = useMemo(() => {
    const totalParticles = bursts.reduce((acc, b) => acc + b.particles.length, 0);
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    let offset = 0;
    bursts.forEach((burst) => {
      burst.particles.forEach((p, i) => {
        const idx = offset + i;
        positions[idx * 3] = p.position.x;
        positions[idx * 3 + 1] = p.position.y;
        positions[idx * 3 + 2] = p.position.z;
        colors[idx * 3] = p.color.r;
        colors[idx * 3 + 1] = p.color.g;
        colors[idx * 3 + 2] = p.color.b;
        sizes[idx] = 0.3;
      });
      offset += burst.particles.length;
    });

    return { allPositions: positions, allColors: colors, allSizes: sizes };
  }, [bursts]);

  useFrame(({ clock }) => {
    if (!particlesRef.current || bursts.length === 0) return;
    const geometry = particlesRef.current.geometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

    const currentTime = clock.getElapsedTime();
    let globalIdx = 0;

    bursts.forEach((burst) => {
      const elapsed = currentTime - burst.startTime;

      burst.particles.forEach((p) => {
        if (elapsed < p.maxLife) {
          p.position.addScaledVector(p.velocity, 0.016);
          p.velocity.multiplyScalar(0.98);
          p.velocity.y -= 0.002;

          posAttr.setXYZ(globalIdx, p.position.x, p.position.y, p.position.z);

          const lifeRatio = 1 - elapsed / p.maxLife;
          sizeAttr.setX(globalIdx, 0.1 + lifeRatio * 0.4);
          colorAttr.setXYZ(
            globalIdx,
            p.color.r * lifeRatio,
            p.color.g * lifeRatio,
            p.color.b * lifeRatio
          );
        } else {
          sizeAttr.setX(globalIdx, 0);
        }
        globalIdx++;
      });
    });

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  if (bursts.length === 0) return null;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(allPositions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(allColors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(allSizes, 1));
    return geom;
  }, [allPositions, allColors, allSizes]);

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        map={particleTexture}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        size={0.3}
      />
    </points>
  );
};

const Scene = ({
  models,
  selectedId,
  creaseTexture,
  starTexture,
  particleTexture,
  bursts,
  onSelect,
  onShatter,
  onUpdateFoldProgress,
  onUpdateRotation,
}: {
  models: ModelInstance[];
  selectedId: string | null;
  creaseTexture: THREE.Texture;
  starTexture: THREE.Texture;
  particleTexture: THREE.Texture;
  bursts: ParticleBurst[];
  onSelect: (id: string) => void;
  onShatter: (id: string, pos: THREE.Vector3) => void;
  onUpdateFoldProgress: (id: string, progress: number) => void;
  onUpdateRotation: (id: string, rotation: THREE.Euler) => void;
}) => {
  return (
    <>
      <DynamicLight />
      <StarField starTexture={starTexture} />
      <ShatterParticles bursts={bursts} particleTexture={particleTexture} />

      {models.map((model) => (
        <OrigamiModel
          key={model.id}
          modelId={model.id}
          position={model.position}
          rotation={model.rotation}
          topology={model.topology}
          creaseTexture={creaseTexture}
          hueShift={model.hueShift}
          fractalLevel={model.fractalLevel}
          scale={model.scale}
          selected={selectedId === model.id}
          onSelect={onSelect}
          onShatter={onShatter}
          onUpdateFoldProgress={(p) => onUpdateFoldProgress(model.id, p)}
          onUpdateRotation={(r) => onUpdateRotation(model.id, r)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        enablePan={false}
      />
    </>
  );
};

const ControlPanel = ({
  selectedModel,
  onHueChange,
}: {
  selectedModel: ModelInstance | null;
  onHueChange: (hue: number) => void;
}) => {
  const hueRingRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = hueRingRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = w / 2;
    const innerR = outerR - 12;

    ctx.clearRect(0, 0, w, h);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      const color = `hsl(${angle}, 100%, 50%)`;
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
    ctx.fill();

    if (selectedModel) {
      const hue = selectedModel.hueShift;
      const hueRad = (hue * Math.PI) / 180;
      const indicatorR = (outerR + innerR) / 2;
      const ix = cx + Math.cos(hueRad) * indicatorR;
      const iy = cy + Math.sin(hueRad) * indicatorR;

      ctx.beginPath();
      ctx.arc(ix, iy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
    }
  }, [selectedModel]);

  const handleHueInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = hueRingRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      onHueChange(Math.round(angle));
    },
    [onHueChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleHueInteraction(e.clientX, e.clientY);
    },
    [handleHueInteraction]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => handleHueInteraction(e.clientX, e.clientY);
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, handleHueInteraction]);

  return (
    <div
      style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        padding: '18px 22px',
        background: 'rgba(15, 20, 35, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 14,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#e0e8f5',
        minWidth: 280,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: '#8fa8cc',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            折纸控制面板
          </div>

          {selectedModel ? (
            <>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8fa8cc' }}>折叠状态</span>
                <span style={{ fontWeight: 600, color: '#6ee7f7' }}>
                  {selectedModel.foldProgress}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 3,
                  marginBottom: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${selectedModel.foldProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #87CEEB, #8A2BE2)',
                    borderRadius: 3,
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>

              <div style={{ marginBottom: 6, color: '#8fa8cc', fontSize: 11 }}>旋转角度</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 6,
                  marginBottom: 14,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: '#6ee7f7', opacity: 0.7, fontSize: 10 }}>X</div>
                  <div style={{ fontWeight: 600 }}>
                    {((selectedModel.rotation.x * 180) / Math.PI).toFixed(1)}°
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6ee7f7', opacity: 0.7, fontSize: 10 }}>Y</div>
                  <div style={{ fontWeight: 600 }}>
                    {((selectedModel.rotation.y * 180) / Math.PI).toFixed(1)}°
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6ee7f7', opacity: 0.7, fontSize: 10 }}>Z</div>
                  <div style={{ fontWeight: 600 }}>
                    {((selectedModel.rotation.z * 180) / Math.PI).toFixed(1)}°
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#8fa8cc' }}>分形层级</span>
                <span style={{ fontWeight: 600 }}>
                  {Array.from({ length: 3 }, (_, i) => (i < selectedModel.fractalLevel ? '●' : '○')).join(' ')}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: '#6b7a90', fontSize: 12, fontStyle: 'italic' }}>
              点击选择一个折纸模型
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: '#8fa8cc',
              marginBottom: 8,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            色调
          </div>
          <canvas
            ref={hueRingRef}
            width={60}
            height={60}
            style={{
              cursor: 'pointer',
              borderRadius: '50%',
              opacity: selectedModel ? 1 : 0.4,
              pointerEvents: selectedModel ? 'auto' : 'none',
            }}
            onMouseDown={handleMouseDown}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
          color: '#6b7a90',
          lineHeight: 1.6,
        }}
      >
        <div>🖱️ 拖拽旋转 · 滚轮缩放</div>
        <div>👆 单击折叠/展开 · 双击碎散</div>
      </div>
    </div>
  );
};

const App = () => {
  const creaseTexture = useMemo(() => generateCreaseTexture(), []);
  const starTexture = useMemo(() => generateStarTexture(), []);
  const particleTexture = useMemo(() => generateParticleTexture(), []);

  const initialModels = useMemo<ModelInstance[]>(() => {
    const positions = distributeOnSphere(4, 6);
    return TOPOLOGIES.map((topology, i) => ({
      id: `model-${Date.now()}-${i}`,
      position: positions[i],
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      topology,
      fractalLevel: 1,
      scale: 1,
      hueShift: Math.round(Math.random() * 360),
      foldProgress: 0,
    }));
  }, []);

  const [models, setModels] = useState<ModelInstance[]>(initialModels);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bursts, setBursts] = useState<ParticleBurst[]>([]);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    clockRef.current.start();
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleShatter = useCallback(
    (id: string, parentPosition: THREE.Vector3) => {
      setModels((prev) => {
        const parent = prev.find((m) => m.id === id);
        if (!parent || parent.fractalLevel >= 3) return prev;

        const childCount = 5;
        const newChildren: ModelInstance[] = [];
        const childScale = 0.3;

        for (let i = 0; i < childCount; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 3 * (0.5 + Math.random() * 0.5);

          const offset = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi) * 0.5,
            r * Math.sin(phi) * Math.sin(theta)
          );

          const childTopology = TOPOLOGIES[Math.floor(Math.random() * TOPOLOGIES.length)];

          newChildren.push({
            id: `model-${Date.now()}-${id}-${i}`,
            position: parentPosition.clone().add(offset),
            rotation: new THREE.Euler(
              (Math.random() - 0.5) * THREE.MathUtils.degToRad(15),
              (Math.random() - 0.5) * THREE.MathUtils.degToRad(15),
              (Math.random() - 0.5) * THREE.MathUtils.degToRad(15)
            ),
            topology: childTopology,
            fractalLevel: parent.fractalLevel + 1,
            scale: childScale,
            hueShift: parent.hueShift + Math.round((Math.random() - 0.5) * 60),
            foldProgress: 0,
          });
        }

        const newBurst: ParticleBurst = {
          id: `burst-${Date.now()}-${id}`,
          position: parentPosition.clone(),
          particles: Array.from({ length: 50 }, () => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 0.05 + Math.random() * 0.15;

            return {
              position: parentPosition.clone(),
              velocity: new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed,
                Math.sin(phi) * Math.sin(theta) * speed
              ),
              color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)].clone(),
              life: 2,
              maxLife: 2,
            };
          }),
          startTime: clockRef.current.getElapsedTime(),
        };

        setBursts((prevBursts) => [...prevBursts, newBurst]);

        setTimeout(() => {
          setBursts((prevBursts) => prevBursts.filter((b) => b.id !== newBurst.id));
        }, 2500);

        return [...prev.filter((m) => m.id !== id), ...newChildren];
      });
      setSelectedId(null);
    },
    []
  );

  const handleUpdateFoldProgress = useCallback((id: string, progress: number) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, foldProgress: progress } : m))
    );
  }, []);

  const handleUpdateRotation = useCallback((id: string, rotation: THREE.Euler) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z) }
          : m
      )
    );
  }, []);

  const handleHueChange = useCallback(
    (hue: number) => {
      if (!selectedId) return;
      setModels((prev) =>
        prev.map((m) => (m.id === selectedId ? { ...m, hueShift: hue } : m))
      );
    },
    [selectedId]
  );

  const selectedModel = selectedId ? models.find((m) => m.id === selectedId) || null : null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        frameloop="always"
      >
        <fog attach="fog" args={['#0B0C10', 20, 50]} />
        <Scene
          models={models}
          selectedId={selectedId}
          creaseTexture={creaseTexture}
          starTexture={starTexture}
          particleTexture={particleTexture}
          bursts={bursts}
          onSelect={handleSelect}
          onShatter={handleShatter}
          onUpdateFoldProgress={handleUpdateFoldProgress}
          onUpdateRotation={handleUpdateRotation}
        />
      </Canvas>
      <ControlPanel selectedModel={selectedModel} onHueChange={handleHueChange} />
    </div>
  );
};

export default App;
