import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import DataCloud from './scene/DataCloud';
import { generateHighDimData } from './utils/dataGenerator';
import { ReducedPoint, CATEGORY_COLORS, CATEGORY_NAMES } from './types';

const STAR_COUNT = 200;

interface HoverInfo {
  id: number;
  point: ReducedPoint;
  screenPos: { x: number; y: number };
}

interface ClickInfo {
  point: ReducedPoint;
}

function Stars() {
  const stars = useMemo(() => {
    const arr: { x: number; y: number; size: number; delay: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.5,
        delay: Math.random() * 3,
      });
    }
    return arr;
  }, []);

  return (
    <div className="starfield">
      {stars.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function ControlsSync({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const { controls } = useThree();
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls, controlsRef]);
  return null;
}

export default function App() {
  const [points, setPoints] = useState<ReducedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const controlsRef = useRef<any>(null);
  const sceneWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const data = generateHighDimData();

    workerRef.current = new Worker(
      new URL('./utils/dimensionalityReducer.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.done) {
        setPoints(e.data.points);
        setLoading(false);
      } else {
        setProgress(e.data.progress || 0);
      }
    };

    workerRef.current.postMessage({
      data: data.map(({ features, category, id }) => ({ features, category, id })),
      dimensions: 3,
      iterations: 100,
      perplexity: 30,
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!hoverInfo || !sceneWrapperRef.current) return;
    const updatePosition = () => {
      const vec = new THREE.Vector3(
        points.find((p) => p.id === hoverInfo.id)?.x || 0,
        (points.find((p) => p.id === hoverInfo.id)?.y || 0),
        points.find((p) => p.id === hoverInfo.id)?.z || 0
      );
      const cam = controlsRef.current?.object;
      if (!cam) return;
      const rect = sceneWrapperRef.current!.getBoundingClientRect();
      const v = vec.project(cam);
      setHoverInfo((prev) =>
        prev
          ? {
              ...prev,
              screenPos: {
                x: ((v.x + 1) / 2) * rect.width,
                y: ((-v.y + 1) / 2) * rect.height,
              },
            }
          : null
      );
    };
    const id = requestAnimationFrame(function loop() {
      updatePosition();
      requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [hoverInfo?.id, points]);

  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    points.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [points]);

  const toggleCategory = (cat: number) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleHover = (
    id: number | null,
    point?: ReducedPoint,
    _worldPos?: THREE.Vector3
  ) => {
    setHoveredId(id);
    if (id === null || !point) {
      setHoverInfo(null);
      return;
    }
    setHoverInfo({
      id,
      point,
      screenPos: { x: 0, y: 0 },
    });
  };

  const handleClickPoint = (point: ReducedPoint) => {
    setClickInfo({ point });
  };

  const resetView = () => {
    const controls = controlsRef.current;
    if (controls) {
      controls.reset();
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  const regenerate = () => {
    setLoading(true);
    setProgress(0);
    setPoints([]);
    setClickInfo(null);

    const data = generateHighDimData();
    workerRef.current?.terminate();

    workerRef.current = new Worker(
      new URL('./utils/dimensionalityReducer.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.done) {
        setPoints(e.data.points);
        setLoading(false);
      } else {
        setProgress(e.data.progress || 0);
      }
    };

    workerRef.current.postMessage({
      data: data.map(({ features, category, id }) => ({ features, category, id })),
      dimensions: 3,
      iterations: 100,
      perplexity: 30,
    });
  };

  const maxFeatureAbs = useMemo(() => {
    if (!clickInfo) return 1;
    return Math.max(...clickInfo.point.features.map((f) => Math.abs(f)), 1);
  }, [clickInfo]);

  return (
    <div className="app-container">
      <Stars />

      <div className="scene-wrapper" ref={sceneWrapperRef}>
        {!loading && (
          <Canvas
            camera={{ position: [15, 12, 18], fov: 55 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={[0x050510]} />
            <fog attach="fog" args={[0x050510, 25, 60]} />
            <ambientLight intensity={0.45} />
            <pointLight position={[10, 10, 10]} intensity={0.9} color="#8ab4ff" />
            <pointLight position={[-10, -5, -10]} intensity={0.7} color="#ff8ecc" />
            <pointLight position={[0, 15, 0]} intensity={0.5} color="#aaffbb" />
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              minDistance={7.5}
              maxDistance={75}
              makeDefault
            />
            <ControlsSync controlsRef={controlsRef} />
            <DataCloud
              points={points}
              hiddenCategories={hiddenCategories}
              hoveredId={hoveredId}
              onHover={handleHover}
              onClickPoint={handleClickPoint}
              controlsRef={controlsRef}
            />
          </Canvas>
        )}
      </div>

      {hoverInfo && sceneWrapperRef.current && (
        <div
          className="hover-label"
          style={{
            left: `${hoverInfo.screenPos.x}px`,
            top: `${hoverInfo.screenPos.y}px`,
          }}
        >
          <div
            className="label-title"
            style={{ color: CATEGORY_COLORS[hoverInfo.point.category] }}
          >
            {CATEGORY_NAMES[hoverInfo.point.category]}
          </div>
          <div className="label-id">ID: #{String(hoverInfo.point.id).padStart(3, '0')}</div>
        </div>
      )}

      {clickInfo && !isMobile && (
        <div className="feature-chart-container">
          <div className="chart-title">
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: CATEGORY_COLORS[clickInfo.point.category],
              boxShadow: `0 0 10px ${CATEGORY_COLORS[clickInfo.point.category]}`,
              display: 'inline-block',
            }} />
            数据点 #{String(clickInfo.point.id).padStart(3, '0')} · {CATEGORY_NAMES[clickInfo.point.category]} · 8维特征分布
          </div>
          <div className="chart-bars">
            {clickInfo.point.features.map((val, i) => {
              const h = Math.max(4, (Math.abs(val) / maxFeatureAbs) * 100);
              return (
                <div key={i} className="chart-bar-wrapper">
                  <span className="chart-bar-value">{val.toFixed(2)}</span>
                  <div
                    className="chart-bar"
                    style={{
                      height: `${h}%`,
                      background: val >= 0
                        ? `linear-gradient(180deg, ${CATEGORY_COLORS[clickInfo.point.category]} 0%, #444 100%)`
                        : `linear-gradient(180deg, #ff6677 0%, #442233 100%)`,
                      opacity: 0.55 + (h / 100) * 0.45,
                    }}
                  />
                  <span className="chart-bar-label">f{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clickInfo && isMobile && (
        <div className="feature-chart-container">
          <div className="chart-title">
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: CATEGORY_COLORS[clickInfo.point.category],
              boxShadow: `0 0 10px ${CATEGORY_COLORS[clickInfo.point.category]}`,
              display: 'inline-block',
            }} />
            数据点 #{String(clickInfo.point.id).padStart(3, '0')} · 特征分布
          </div>
          <div className="chart-bars">
            {clickInfo.point.features.map((val, i) => {
              const h = Math.max(4, (Math.abs(val) / maxFeatureAbs) * 100);
              return (
                <div key={i} className="chart-bar-wrapper">
                  <span className="chart-bar-value">{val.toFixed(1)}</span>
                  <div
                    className="chart-bar"
                    style={{
                      height: `${h}%`,
                      background: val >= 0
                        ? `linear-gradient(180deg, ${CATEGORY_COLORS[clickInfo.point.category]} 0%, #444 100%)`
                        : `linear-gradient(180deg, #ff6677 0%, #442233 100%)`,
                    }}
                  />
                  <span className="chart-bar-label">f{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="drawer-toggle"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="toggle panel"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {drawerOpen ? (
            <>
              <line x1="5" y1="19" x2="19" y2="5" />
              <line x1="5" y1="5" x2="19" y2="19" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      <div className={`control-panel ${drawerOpen ? 'open' : ''}`}>
        <h1 className="panel-title">降维散点图</h1>

        <div className="panel-section">
          <h3 className="section-title">类别筛选</h3>
          <div className="category-list">
            {CATEGORY_NAMES.map((name, idx) => {
              const checked = !hiddenCategories.has(idx);
              const count = categoryCounts[idx] || 0;
              return (
                <div
                  key={idx}
                  className="category-item"
                  onClick={() => toggleCategory(idx)}
                >
                  <div
                    className="checkbox-custom"
                    style={{
                      background: checked ? CATEGORY_COLORS[idx] : 'transparent',
                      borderColor: checked ? 'transparent' : CATEGORY_COLORS[idx],
                    }}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="color-dot"
                    style={{
                      background: CATEGORY_COLORS[idx],
                      color: CATEGORY_COLORS[idx],
                      opacity: checked ? 1 : 0.35,
                    }}
                  />
                  <span
                    className="category-name"
                    style={{ opacity: checked ? 1 : 0.45 }}
                  >
                    {name}
                  </span>
                  <span
                    className="category-count"
                    style={{ opacity: checked ? 1 : 0.45 }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">数据统计</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{points.length}</div>
              <div className="stat-label">总点数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {CATEGORY_NAMES.length - hiddenCategories.size}
              </div>
              <div className="stat-label">可见类别</div>
            </div>
          </div>
          <div className="category-stats" style={{ marginTop: 6 }}>
            {CATEGORY_NAMES.map((name, idx) => {
              const count = categoryCounts[idx] || 0;
              const total = points.length || 1;
              const pct = (count / total) * 100;
              const active = !hiddenCategories.has(idx);
              return (
                <div key={idx} className="category-stat-row">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: CATEGORY_COLORS[idx],
                      opacity: active ? 1 : 0.3,
                      flexShrink: 0,
                    }}
                  />
                  <div className="stat-bar">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: active ? `${pct}%` : '0%',
                        background: CATEGORY_COLORS[idx],
                      }}
                    />
                  </div>
                  <span style={{ color: '#8a9bcc', width: 28, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel-section" style={{ marginTop: 'auto', gap: 10 }}>
          <button className="btn primary" onClick={regenerate}>
            🎲 重新生成数据
          </button>
          <button className="btn" onClick={resetView}>
            🔭 重置视角
          </button>
          <div style={{ fontSize: 11, color: '#6a7baa', textAlign: 'center', lineHeight: 1.6, marginTop: 8 }}>
            拖拽旋转 · 滚轮缩放 · W/S 上下
            <br />
            悬停放大 · 点击查看特征
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在执行 t-SNE 降维计算...</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">{progress.toFixed(0)}% 完成</div>
        </div>
      )}
    </div>
  );
}
