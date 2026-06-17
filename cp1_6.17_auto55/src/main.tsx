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
  heatMapActive: boolean;
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
    const maxTravel = 2.0;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.035 + Math.random() * 0.06, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = (Math.random() - 0.5) * Math.PI * 0.9;
      const baseSpeed = maxTravel / (0.3 + Math.random() * 0.2);
      const speed = baseSpeed;
      const velocity = new THREE.Vector3(
        Math.cos(angle1) * Math.cos(angle2) * speed,
        Math.abs(Math.sin(angle2)) * speed * 0.6 + 1.2,
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
      p.velocity.y -= 5.5 * dt;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
      const s = 1 - t * 0.55;
      p.mesh.scale.setScalar(s * s);
    }
  }

  get count(): number { return this.particles.length; }

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
  const lastIsMobileRef = useRef<boolean | null>(null);
  const containerSizeRef = useRef({ w: 0, h: 0 });

  const [appState, setAppState] = useState<AppState>({
    jointedCount: 0,
    totalCount: 6,
    history: [],
    selectedId: null,
    heatMapActive: false
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (lastIsMobileRef.current !== null && lastIsMobileRef.current !== isMobile) {
      if (fragmentManagerRef.current) {
        setTimeout(() => {
          fragmentManagerRef.current?.rebindEvents();
        }, 50);
      }
    }
    lastIsMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    containerSizeRef.current = { w: width, h: height };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    scene.fog = new THREE.Fog(0x0d0d1a, 20, 45);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0x4a4a68, 0.7);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x3a2a1a, 0.35);
    hemi.position.set(0, 15, 0);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
    keyLight.position.set(9, 13, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.mapSize.width = 1280;
    keyLight.shadow.mapSize.height = 1280;
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    fillLight.position.set(-9, 6, -7);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff9a66, 0.3);
    rimLight.position.set(0, -6, -11);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(22, 22, 0x262646, 0x171728);
    gridHelper.position.y = -3.6;
    scene.add(gridHelper);

    const groundGeo = new THREE.CircleGeometry(20, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e20,
      roughness: 0.96,
      metalness: 0.01,
      transparent: true,
      opacity: 0.92
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.62;
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
      setAppState((prev) => {
        if (prev.jointedCount === jointed) return prev;
        return { ...prev, jointedCount: jointed };
      });
    };

    const offJoint = eventBus.on('jointFound', (data: any) => {
      updateProgress();
      if (particleSystemRef.current) {
        const pos = data.position || new THREE.Vector3(0, 0, 0);
        particleSystemRef.current.burst(pos, 30);
      }
    });

    const offJointSnap = eventBus.on('jointSnapSuccess', (data: any) => {
      if (particleSystemRef.current && data.position) {
        particleSystemRef.current.burst(data.position, 30);
      }
    });

    const offParticle = eventBus.on('particleBurst', (data: { position: THREE.Vector3 }) => {
      if (particleSystemRef.current && data.position) {
        particleSystemRef.current.burst(data.position, 30);
      }
    });

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
      setAppState((prev) => (prev.selectedId === id ? prev : { ...prev, selectedId: id }));
    });

    const offReset = eventBus.on('resetComplete', () => {
      setAppState((prev) => ({
        ...prev,
        jointedCount: 0,
        history: [],
        selectedId: null,
        heatMapActive: false
      }));
    });

    const offHeatMap = eventBus.on('heatMapUpdate', (data: any) => {
      setAppState((prev) => ({ ...prev, heatMapActive: true }));
      setTimeout(() => {
        setAppState((prev) => ({ ...prev, heatMapActive: false }));
      }, 6100);
      if (data && typeof console !== 'undefined') {
        console.log('[HeatMap] Generated for', data.pairCount, 'pairs at', new Date(data.generatedAt).toLocaleTimeString());
      }
    });

    const clock = new THREE.Clock();
    let frameId = 0;
    let frameCounter = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      frameCounter++;

      particleSystem.update(dt);

      if (frameCounter % 12 === 0) {
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
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (Math.abs(w - containerSizeRef.current.w) > 1 || Math.abs(h - containerSizeRef.current.h) > 1) {
        containerSizeRef.current = { w, h };
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', handleResize);
      offJoint();
      offJointSnap();
      offParticle();
      offHistory();
      offSelection();
      offReset();
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
  for (let i = 0; i < appState.totalCount; i++) remainingIds.push(i);

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
    return '#FF6B6B';
  };

  const isFragmentJointed = (id: number): boolean => {
    return appState.history.some((h) => h.id1 === id || h.id2 === id);
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
        gap: '16px',
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

  const btnBase = (): React.CSSProperties => ({
    background: appState.heatMapActive ? '#4a3a5a' : '#3A3A5A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: isMobile ? '9px 14px' : '11px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    letterSpacing: '0.2px'
  });

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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '2px' }}>
              <h2 style={{
                color: '#E0E0FF',
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '0.5px'
              }}>陶器拼合工坊</h2>
              {appState.heatMapActive && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0,255,136,0.15)',
                  color: '#00FF88',
                  border: '1px solid rgba(0,255,136,0.3)',
                  fontWeight: 600
                }}>热力图</span>
              )}
            </div>
            <p style={{
              color: '#606080',
              fontSize: '12px',
              margin: '0 0 20px 0'
            }}>数字考古 · 虚拟复原 · 三维碎片拼接</p>

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
                <span style={{ color: '#A0A0C0', fontSize: '13px', fontWeight: 500 }}>拼合进度</span>
                <span style={{
                  color: '#00FF88',
                  fontSize: '30px',
                  fontWeight: 800,
                  lineHeight: 1,
                  textShadow: '0 0 15px rgba(0,255,136,0.25)'
                }}>{percentage}%</span>
              </div>
              <div style={{
                background: '#0D0D1A',
                borderRadius: '6px',
                height: '10px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #2A2A4A'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00B85C 0%, #00FF88 50%, #4DFFAA 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.35s cubic-bezier(.2,.8,.2,1)',
                  boxShadow: '0 0 14px rgba(0, 255, 136, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                color: '#A0A0C0',
                fontSize: '12px'
              }}>
                <span>已拼合 <span style={{ color: '#E0E0FF', fontWeight: 700 }}>{appState.jointedCount}</span> / {appState.totalCount} 片</span>
                <span>剩余 <span style={{ color: '#FFC107', fontWeight: 600 }}>{Math.max(0, appState.totalCount - appState.jointedCount)}</span> 片</span>
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #2A2A4A',
              paddingTop: '18px',
              marginBottom: '18px'
            }}>
              <h3 style={{
                color: '#E0E0FF',
                fontSize: '13px',
                fontWeight: 700,
                margin: '0 0 12px 0',
                letterSpacing: '0.3px'
              }}>碎片状态索引</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '7px'
              }}>
                {remainingIds.map((id) => {
                  const isJoint = isFragmentJointed(id);
                  const isSelected = appState.selectedId === id;
                  return (
                    <div
                      key={id}
                      title={`碎片 #${id}${isJoint ? ' · 已拼合' : isSelected ? ' · 选中中' : ''}`}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800,
                        background: isSelected
                          ? 'linear-gradient(135deg, #FFD700 0%, #FFE066 100%)'
                          : isJoint
                          ? 'linear-gradient(135deg, #0d2a1c 0%, #13402b 100%)'
                          : 'linear-gradient(135deg, #2A2A4A 0%, #252542 100%)',
                        color: isSelected ? '#0D0D1A' : isJoint ? '#00FF88' : '#B8B8D8',
                        border: isSelected
                          ? '2px solid #FFD700'
                          : isJoint
                          ? '1px solid rgba(0,255,136,0.35)'
                          : '1px solid #3A3A5A',
                        boxShadow: isSelected
                          ? '0 0 16px rgba(255, 215, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.3)'
                          : isJoint
                          ? 'inset 0 1px 0 rgba(0,255,136,0.08)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
                fontSize: '13px',
                fontWeight: 700,
                margin: '0 0 12px 0',
                letterSpacing: '0.3px'
              }}>拼接历史记录 <span style={{ color: '#606080', fontWeight: 400, fontSize: '11px' }}>(最近10次)</span></h3>
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                borderRadius: '8px',
                border: '1px solid #2A2A4A'
              }}>
                {appState.history.length === 0 ? (
                  <div style={{
                    padding: '28px 14px',
                    textAlign: 'center',
                    color: '#555575',
                    fontSize: '12px',
                    lineHeight: 1.7
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>🏺</div>
                    暂无拼接记录<br />
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>
                      拖拽碎片靠近，对齐误差＜0.5 时自动吸附
                    </span>
                  </div>
                ) : (
                  appState.history.map((item, idx) => (
                    <div
                      key={`${item.timestamp}-${idx}`}
                      style={{
                        padding: '10px 13px',
                        background: idx % 2 === 0 ? '#2A2A3A' : '#1E1E2E',
                        borderBottom: idx < appState.history.length - 1 ? '1px solid #2A2A4A' : 'none',
                        transition: 'background 0.3s ease-out'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px'
                      }}>
                        <span style={{
                          color: '#E0E0FF',
                          fontSize: '13px',
                          fontWeight: 600
                        }}>
                          碎片 <span style={{ color: '#88CCFF' }}>#{item.id1}</span>
                          <span style={{ color: '#00FF88', margin: '0 4px' }}>↔</span>
                          <span style={{ color: '#88CCFF' }}>#{item.id2}</span>
                        </span>
                        <span style={{
                          color: getScoreColor(item.score),
                          fontSize: '15px',
                          fontWeight: 800,
                          textShadow: item.score >= 71 ? '0 0 8px rgba(0,255,136,0.4)' : 'none'
                        }}>{item.score}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#606080', fontSize: '11px' }}>{formatTime(item.timestamp)}</span>
                        <span style={{
                          fontSize: '10px',
                          color: item.score >= 71 ? '#00FF88' : item.score >= 31 ? '#FFC107' : '#FF6B6B',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: item.score >= 71 ? 'rgba(0,255,136,0.1)' : item.score >= 31 ? 'rgba(255,193,7,0.1)' : 'rgba(255,107,107,0.1)'
                        }}>
                          {item.score >= 71 ? '优秀' : item.score >= 31 ? '良好' : '较差'}
                        </span>
                      </div>
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
                  style={btnBase()}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = appState.heatMapActive ? '#4a3a5a' : '#3A3A5A')}
                  onMouseDown={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = 'scale(0.95)';
                    setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
                  }}
                  onClick={() => eventBus.emit('detectJoints')}
                >🔍 拼接探测</button>
                <button
                  style={btnBase()}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
                  onMouseDown={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = 'scale(0.95)';
                    setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
                  }}
                  onClick={() => eventBus.emit('requestReset')}
                >↻ 重置</button>
              </div>
              <button
                style={{
                  ...btnBase(),
                  width: '100%',
                  marginTop: '10px',
                  background: 'linear-gradient(135deg, #3A3A5A 0%, #4B3B5F 50%, #5A3A5A 100%)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #4A4A6A 0%, #5B4B6F 50%, #6A4A6A 100%)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #3A3A5A 0%, #4B3B5F 50%, #5A3A5A 100%)')}
                onMouseDown={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = 'scale(0.95)';
                  setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
                }}
                onClick={() => eventBus.emit('requestExport')}
              >📤 导出拼合结果</button>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '14px 15px',
              background: 'rgba(42, 42, 74, 0.5)',
              borderRadius: '10px',
              border: '1px solid #2A2A4A',
              backdropFilter: 'blur(4px)'
            }}>
              <h4 style={{
                color: '#D0D0F0',
                fontSize: '12px',
                fontWeight: 700,
                margin: '0 0 11px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>💡</span>操作指南
              </h4>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: '#8888A8',
                fontSize: '11px',
                lineHeight: 1.95
              }}>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#FFD700', flexShrink: 0 }}>•</span>
                  <span>左键按住拖拽 → 移动选中碎片</span>
                </li>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#FFD700', flexShrink: 0 }}>•</span>
                  <span>滚轮（碎片选中）→ 绕Y轴旋转</span>
                </li>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#FFD700', flexShrink: 0 }}>•</span>
                  <span>Shift+滚轮 → 绕X轴，Alt+滚轮 → 绕Z轴</span>
                </li>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#FFD700', flexShrink: 0 }}>•</span>
                  <span>右键按住拖拽 → 旋转观察视角</span>
                </li>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#FFD700', flexShrink: 0 }}>•</span>
                  <span>滚轮（未选中）→ 缩放场景</span>
                </li>
                <li style={{ display: 'flex', gap: '7px' }}>
                  <span style={{ color: '#00FF88', flexShrink: 0 }}>•</span>
                  <span>断裂面对齐误差＜0.5 → 自动吸附</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
                marginBottom: '5px'
              }}>
                <span style={{ color: '#E0E0FF', fontSize: '15px', fontWeight: 700 }}>🏺 拼合</span>
                <span style={{
                  color: '#00FF88',
                  fontSize: '18px',
                  fontWeight: 800,
                  textShadow: '0 0 10px rgba(0,255,136,0.3)'
                }}>{percentage}%</span>
                <span style={{ color: '#606080', fontSize: '11px' }}>
                  {appState.jointedCount}/{appState.totalCount}
                </span>
                {appState.heatMapActive && (
                  <span style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'rgba(0,255,136,0.15)',
                    color: '#00FF88',
                    fontWeight: 600
                  }}>热力</span>
                )}
              </div>
              <div style={{
                background: '#0D0D1A',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden',
                border: '1px solid #2A2A4A'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00B85C 0%, #00FF88 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.35s cubic-bezier(.2,.8,.2,1)',
                  boxShadow: '0 0 10px rgba(0,255,136,0.35)'
                }} />
              </div>
            </div>
            <button
              style={btnBase()}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = appState.heatMapActive ? '#4a3a5a' : '#3A3A5A')}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'scale(0.95)';
                setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
              }}
              onClick={() => eventBus.emit('detectJoints')}
            >🔍 探测</button>
            <button
              style={btnBase()}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'scale(0.95)';
                setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
              }}
              onClick={() => eventBus.emit('requestReset')}
            >↻ 重置</button>
            <button
              style={btnBase()}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4A4A6A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3A3A5A')}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'scale(0.95)';
                setTimeout(() => { el.style.transform = 'scale(1)'; }, 110);
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
