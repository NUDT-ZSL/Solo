import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import StarField from './StarField';
import AddTrailModal from './components/AddTrailModal';
import ConfirmModal from './components/ConfirmModal';
import InfoCard from './components/InfoCard';
import type { Trail, TrailInput, DisplayMode } from './types';
import { fetchTrails, addTrail, clearAllTrails } from './api';

const MODE_OPTIONS: { key: DisplayMode; label: string }[] = [
  { key: 'timeline', label: '时间线' },
  { key: 'category', label: '按分类' },
  { key: 'duration', label: '按时长' },
];

function AutoRotate({ enabled }: { enabled: boolean }) {
  const { scene } = useThree();
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  useFrame((_, delta) => {
    if (enabled) {
      targetRef.current += delta * (Math.PI * 2 / 36);
    }
    currentRef.current += (targetRef.current - currentRef.current) * 0.04;
    scene.rotation.y = currentRef.current;
  });

  return null;
}

function formatDurationShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}分`;
  const hours = Math.floor(mins / 60);
  return `${hours}时${mins % 60}分`;
}

const App: React.FC = () => {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('timeline');
  const [hoveredTrail, setHoveredTrail] = useState<Trail | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const interactionTimer = useRef<number | null>(null);
  const controlsRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTrails();
      setTrails(res.data);
    } catch (e) {
      console.error('加载足迹失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pauseAutoRotate = useCallback(() => {
    setAutoRotate(false);
    if (interactionTimer.current) {
      window.clearTimeout(interactionTimer.current);
    }
    interactionTimer.current = window.setTimeout(() => {
      setAutoRotate(true);
    }, 3000);
  }, []);

  const handleHover = useCallback(
    (trail: Trail | null, point: { x: number; y: number }) => {
      setHoveredTrail(trail);
      setHoverPos(point);
      if (trail) pauseAutoRotate();
    },
    [pauseAutoRotate]
  );

  const handleClick = useCallback((trail: Trail) => {
    window.open(trail.url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleAddTrail = async (data: TrailInput) => {
    try {
      const res = await addTrail(data);
      if (res.updated) {
        setTrails((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
      } else {
        setTrails((prev) => [...prev, res.data]);
      }
      setShowAddModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllTrails();
      setTrails([]);
      setShowClearConfirm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '清除失败');
    }
  };

  const totalDuration = trails.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="app-container">
      <div className="header-title">✦ 足迹星图</div>
      <div className="header-stats">
        <div className="stat-item">
          <div className="stat-value">{trails.length}</div>
          <div className="stat-label">足迹总数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatDurationShort(totalDuration)}</div>
          <div className="stat-label">累计时长</div>
        </div>
      </div>

      <div className="canvas-wrapper">
        <Canvas
          camera={{
            position: [0, 0, 50],
            fov: 60,
            near: 0.1,
            far: 500,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
          style={{ background: 'transparent' }}
        >
          <AutoRotate enabled={autoRotate} />
          <ambientLight intensity={0.5} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={25}
            maxDistance={150}
            minPolarAngle={(10 * Math.PI) / 180}
            maxPolarAngle={(80 * Math.PI) / 180}
            zoomSpeed={0.9}
            rotateSpeed={0.6}
            onStart={pauseAutoRotate}
            onChange={pauseAutoRotate}
            onEnd={pauseAutoRotate}
          />
          {!loading && trails.length > 0 && (
            <StarField
              trails={trails}
              displayMode={displayMode}
              onHover={handleHover}
              onClick={handleClick}
            />
          )}
          <fog attach="fog" args={['#0b0b2e', 60, 180]} />
        </Canvas>
      </div>

      {hoveredTrail && (
        <InfoCard trail={hoveredTrail} position={hoverPos} />
      )}

      <div className="toolbar">
        <button className="btn" onClick={() => setShowAddModal(true)}>
          ＋ 添加足迹
        </button>
        <div className="mode-switcher">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`mode-btn ${displayMode === opt.key ? 'active' : ''}`}
              onClick={() => setDisplayMode(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)}>
          ✕ 清除所有
        </button>
      </div>

      {showAddModal && (
        <AddTrailModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTrail}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          title="确认清除"
          message={`确定要清除全部 ${trails.length} 条足迹吗？`}
          warning="此操作无法撤销，请谨慎操作。"
          confirmText="全部清除"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
          danger
        />
      )}
    </div>
  );
};

export default App;
