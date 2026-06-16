import * as THREE from 'three';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FragmentManager } from './fragmentManager';
import { JointDetector, JointRecord } from './jointDetector';
import { eventBus } from './eventBus';

interface HistoryItem {
  timestamp: number;
  id1: number;
  id2: number;
  score: number;
}

interface AppState {
  jointedCount: number;
  totalCount: number;
  history: HistoryItem[];
  selectedId: number | null;
}

class ParticleSystem {
  private scene: THREE.Scene;
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  burst(position: THREE.Vector3, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = (Math.random() - 0.5) * Math.PI;
      const speed = 1.5 + Math.random() * 2.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle1) * Math.cos(angle2) * speed,
        Math.abs(Math.sin(angle2)) * speed + 1,
        Math.sin(angle1) * Math.cos(angle2) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.15
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.geometry as THREE.BufferGeometry).dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 4 * dt;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
      p.mesh.scale.setScalar(1 - t * 0.5);
    }
  }

  dispose(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }
}

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fragmentManagerRef = useRef<FragmentManager | null>(null);
  const jointDetectorRef = useRef<JointDetector | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [appState, setAppState] = useState<AppState>({
    jointedCount: 0,
    totalCount: 6,
    history: [],
    selectedId: null
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    scene.fog = new THREE.Fog(0x0d0d1a, 18, 40);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff8e8, 0.9);
    keyLight.position.set(8, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.35);
    fillLight.position.set(-8, 5, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8866, 0.25);
    rimLight.position.set(0, -5, -10);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a4a, 0x1a1a2e);
    gridHelper.position.y = -3.5;
    scene.add(gridHelper);

    const groundGeo = new THREE.CircleGeometry(18, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f20,
      roughness: 0.95,
      metalness: 0.02,
      transparent: true,
      opacity: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.51;
    ground.receiveShadow = true;
    scene.add(ground);

    const fragmentManager = new FragmentManager(scene, camera, renderer);
    fragmentManagerRef.current = fragmentManager;

    const jointDetector = new JointDetector();
    jointDetectorRef.current = jointDetector;

    const particleSystem = new ParticleSystem(scene);
    particleSystemRef.current = particleSystem;

    setAppState((prev) => ({
      ...prev,
      totalCount: fragmentManager.getFragmentCount()
    }));

    const updateProgress = () => {
      const frags = fragmentManager.getFragments();
      let jointed = 0;
      frags.forEach((f) => {
        if (f.jointedIds.length > 0) jointed++;
      });
      setAppState((prev) => ({ ...prev, jointedCount: jointed }));
    };

    const offJoint = eventBus.on('jointFound', () => updateProgress());
    const offHistory = eventBus.on('historyUpdated', (records: JointRecord[]) => {
      setAppState((prev) => ({
        ...prev,
        history: records.map((r) => ({
          timestamp: r.timestamp,
          id1: r.id1,
          id2: r.id2,
          score: r.score
        }))
      }));
      updateProgress();
    });
    const offSelection = eventBus.on('selectionChanged', (id: number | null) => {
      setAppState((prev) => ({ ...prev, selectedId: id }));
    });
    const offReset = eventBus.on('resetComplete', () => {
      setAppState((prev) => ({ ...prev, jointedCount: 0, history: [], selectedId: null }));
    });
    const offBurst = eventBus.on('particleBurst', (data: { position: THREE.Vector3 }) => {
      particleSystem.burst(data.position, 30);
    });
    const offHeatMap = eventBus.on('addHeatMapToFragment', (data: { fragmentId: number; scores: { vertexIndex: number; score: number }[] }) => {
      fragmentManager.addHeatMap(data.fragmentId, data.scores);
    });

    const clock = new THREE.Clock();
    let frameId = 0;
    let frameCounter = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      frameCounter++;

      particleSystem.update(dt);

      if (frameCounter % 15 === 0) {
        const frags = fragmentManager.getFragments();
        let jointed = 0;
        frags.forEach((f) => {
          if (f.jointedIds.length > 0) jointed++;
        });
        setAppState((prev) => {
          if (prev.jointedCount === jointed) return prev;
          return { ...prev, jointedCount: jointed };
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      offJoint();
      offHistory();
      offSelection();
      offReset();
      offBurst();
      offHeatMap();
      fragmentManager.dispose();
      jointDetector.dispose();
      particleSystem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const percentage = appState.totalCount > 0
    ? Math.round((appState.jointedCount / appState.totalCount) * 100)
    : 0;

  const remainingIds: number[] = [];
  for (let i = 0; i < appState.totalCount; i++) {
    remainingIds.push(i);
  }

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 71) return '#00FF88';
    if (score >= 31) return '#FFC107';
    return '#FF4444';
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: '#1A1A2E',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '20px',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
      }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '300px',
        height: '100%',
        background: '#1A1A2E',
        zIndex: 10,
        padding: '20px',
        overflowY: 'auto',
        borderTopRightRadius: '12px',
        borderBottomRightRadius: '12px',
        boxShadow: '4px 0 20px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.03)'
      };

  const buttonStyle: React.CSSProperties = {
    background: '#3A3A5A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: isMobile ? '8px 16px' : '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  };

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: '80px',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0D0D1A'
      }
    : {
        position: 'absolute',
        top: 0,
        left: '300px',
        right: 0,
        bottom: 0,
        background: '#0D0D1A'
      };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={panelStyle}>
        {!isMobile ? (
          <>
            <h2 style={{
              color: '#E0E0FF',
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '4px',
              letterSpacing: '0.5px'
            }}>陶器拼合工坊</h2>
            <p style={{
              color: '#606080',
              fontSize: '12px',
              marginBottom: '20px'
            }}>数字考古·虚拟复原</p>

            <div style={{
              borderTop: '1px solid #2A2A4A',
              paddingTop: '18px',
              marginBottom: '18px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: '10px'
              }}>
                <span style={{ color: '#A0A0C0', fontSize: '13px' }}>拼合进度</span>
                <span style={{
                  color: '#00FF88',
                  fontSize: '28px',
                  fontWeight: 700,
                  lineHeight: 1
                }}>{percentage}%</span>
              </div>
              <div style={{
                background: '#0D0D1A',
                borderRadius: '6px',
                height: '10px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00C866 0%, #00FF88 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.3s ease-out',
                  boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                color: '#A0A0C0',
                fontSize: '12px'
              }}>
                <span>已拼合 <span style={{ color: '#E0E0FF', fontWeight: 600 }}>{appState.jointedCount}</span> / {appState.totalCount}</span>
                <span>剩余 {Math.max(0, appState.totalCount - appState.jointedCount)} 片</span>
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #2A2A4A',
              paddingTop: '18px',
              marginBottom: '18px'
            }}>
              <h3 style={{
                color: '#E0E0FF',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px'
              }}>剩余碎片</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {remainingIds.map((id) => {
                  const isJointed = id < appState.jointedCount && appState.history.some(
                    (h) => h.id1 === id || h.id2 === id
                  );
                  const isSelected = appState.selectedId === id;
                  return (
                    <div
                      key={id}
                      title={`碎片 ${id}`}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: isSelected
                          ? '#FFD700'
                          : isJointed
                          ? '#1a3a2a'
                          : '#2A2A4A',
                        color: isSelected ? '#0D0D1A' : isJointed ? '#00FF88' : '#A0A0C0',
                        border: isSelected ? '2px solid #FFD700' : '1px solid #3A3A5A',
                        opacity: isJointed ? 0.6 : 1,
                        boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                        transition: 'all 0.3s ease-out'
                      }}
                    >
                      {id}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #2A2A4A',
              paddingTop: '18px',
              marginBottom: '18px'
            }}>
              <h3 style={{
                color: '#E0E0FF',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px'
              }}>拼接历史</h3>
              <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                borderRadius: '8px',
                border: '1px solid #2A2A4A'
              }}>
                {appState.history.length === 0 ? (
                  <div style={{
                    padding: '24px 12px',
                    textAlign: 'center',
                    color: '#505070',
                    fontSize: '12px'
                  }}>
                    暂无拼接记录<br />
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>拖拽碎片至断裂面相邻处</span>
                  </div>
                ) : (
                  appState.history.map((item, idx) => (
                    <div
                      key={`${item.timestamp}-${idx}`}
                      style={{
                        padding: '10px 12px',
                        background: idx % 2 === 0 ? '#2A2A3A' : '#1E1E2E',
                        borderBottom: idx < appState.history.length - 1 ? '1px solid #2A2A4A' : 'none',
                        transition: 'background 0.3s ease-out'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          color: '#E0E0FF',
                          fontSize: '13px',
                          fontWeight: 500
                        }}>
                          碎片 {item.id1} ↔ {item.id2}
                        </span>
                        <span style={{
                          color: getScoreColor(item.score),
                          fontSize: '14px',
                          fontWeight: 700
                        }}>{item.score}</span>
                      </div>
                      <div style={{
                        color: '#606080',
                        fontSize: '11px'
                      }}>{formatTime(item.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #2A2A4A',
              paddingTop: '18px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <button
                  style={buttonStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
                  }}
                  onClick={() => eventBus.emit('detectJoints')}
                >🔍 拼接探测</button>
                <button
                  style={buttonStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
                  }}
                  onClick={() => eventBus.emit('requestReset')}
                >↻ 重置</button>
              </div>
              <button
                style={{
                  ...buttonStyle,
                  width: '100%',
                  marginTop: '10px',
                  background: 'linear-gradient(135deg, #3A3A5A 0%, #4A3A5A 100%)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #4A4A6A 0%, #5A4A6A 100%)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #3A3A5A 0%, #4A3A5A 100%)')}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                  setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
                }}
                onClick={() => eventBus.emit('requestExport')}
              >📤 导出结果</button>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '14px',
              background: 'rgba(42, 42, 74, 0.5)',
              borderRadius: '8px',
              border: '1px solid #2A2A4A'
            }}>
              <h4 style={{
                color: '#E0E0FF',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '10px'
              }}>操作提示</h4>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: '#8080A0',
                fontSize: '11px',
                lineHeight: 1.8
              }}>
                <li>• 左键拖拽：移动选中碎片</li>
                <li>• 滚轮（选中）：旋转碎片</li>
                <li>• 右键拖拽：旋转视角</li>
                <li>• 滚轮（未选中）：缩放场景</li>
                <li>• 对齐误差＜0.5时自动吸附</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '4px'
              }}>
                <span style={{ color: '#E0E0FF', fontSize: '16px', fontWeight: 600 }}>陶器拼合</span>
                <span style={{ color: '#00FF88', fontSize: '18px', fontWeight: 700 }}>{percentage}%</span>
                <span style={{ color: '#606080', fontSize: '12px' }}>{appState.jointedCount}/{appState.totalCount}</span>
              </div>
              <div style={{
                background: '#0D0D1A',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00C866 0%, #00FF88 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease-out'
                }} />
              </div>
            </div>
            <button
              style={buttonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
              }}
              onClick={() => eventBus.emit('detectJoints')}
            >🔍 探测</button>
            <button
              style={buttonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
              }}
              onClick={() => eventBus.emit('requestReset')}
            >↻ 重置</button>
            <button
              style={buttonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                setTimeout(() => { e.currentTarget.style.transform = 'scale(1)'; }, 100);
              }}
              onClick={() => eventBus.emit('requestExport')}
            >📤 导出</button>
          </>
        )}
      </div>
      <div ref={canvasContainerRef} style={containerStyle} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
