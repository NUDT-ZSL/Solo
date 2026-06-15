import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import OlfactoryCloud from './OlfactoryCloud';
import AudioPlayer from './AudioPlayer';
import { fetchMarks, createMark, fetchFootprint } from './api';
import { SCENT_CONFIG, SCENT_TYPES, type ScentMark, type ScentType, type UserFootprint } from './types';

interface MapPageProps {
  userId: string | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

function createScentIcon(scentType: ScentType) {
  const config = SCENT_CONFIG[scentType];
  return L.divIcon({
    className: 'scent-marker',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${config.color};display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 2px 8px ${config.color}66;
      border:2px solid #fff;cursor:pointer;
    ">${config.icon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; vx: number; vy: number; size: number; alpha: number; }
    const particles: P[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.2,
        size: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#a8c97f';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}

export default function MapPage({ userId, onLoginClick, onLogout }: MapPageProps) {
  const [marks, setMarks] = useState<ScentMark[]>([]);
  const [selected, setSelected] = useState<ScentMark | null>(null);
  const [adding, setAdding] = useState<{ lat: number; lng: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formScent, setFormScent] = useState<ScentType>('甜');
  const [formAudio, setFormAudio] = useState<File | null>(null);
  const [footprint, setFootprint] = useState<UserFootprint | null>(null);
  const [showFootprint, setShowFootprint] = useState(false);
  const [filterType, setFilterType] = useState<ScentType | ''>('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 50);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadMarks = useCallback(async () => {
    try {
      const data = await fetchMarks(filterType || undefined, undefined);
      setMarks(data);
    } catch (e) {
      console.error('Failed to load marks', e);
    }
  }, [filterType]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  useEffect(() => {
    if (userId) {
      fetchFootprint(userId).then(setFootprint).catch(() => {});
    } else {
      setFootprint(null);
      setShowFootprint(false);
    }
  }, [userId]);

  const handleMapClick = (lat: number, lng: number) => {
    if (!userId) return;
    setAdding({ lat, lng });
    setShowForm(true);
    setFormDesc('');
    setFormScent('甜');
    setFormAudio(null);
  };

  const handleSubmit = async () => {
    if (!userId || !adding || !formDesc.trim()) return;
    setSubmitting(true);
    try {
      await createMark({
        lat: adding.lat,
        lng: adding.lng,
        description: formDesc.trim(),
        scent_type: formScent,
        user_id: userId,
        audio: formAudio || undefined,
      });
      setShowForm(false);
      setAdding(null);
      loadMarks();
      if (userId) fetchFootprint(userId).then(setFootprint);
    } catch (e) {
      console.error('Failed to create mark', e);
    }
    setSubmitting(false);
  };

  const handleMarkerClick = (mark: ScentMark) => {
    setSelected(mark);
    if (isMobile) setPanelOpen(true);
  };

  const footprintPositions: L.LatLngExpression[] = (showFootprint && footprint)
    ? footprint.marks
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(m => [m.lat, m.lng] as L.LatLngExpression)
    : [];

  const selectedConfig = selected ? SCENT_CONFIG[selected.scent_type as ScentType] : null;

  const panel = selected && (
    <div className={`info-panel ${isMobile ? (panelOpen ? 'drawer-open' : 'drawer-closed') : ''}`} style={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderRadius: isMobile ? '20px 20px 0 0' : 16,
      border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      padding: 24,
      overflowY: 'auto',
      animation: 'slideIn 0.35s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#333' }}>
          {selectedConfig?.icon} {selectedConfig?.label || selected.scent_type}
        </h3>
        <button
          onClick={() => { setSelected(null); if (isMobile) setPanelOpen(false); }}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}
        >✕</button>
      </div>

      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '8px 0 16px' }}>
        {selected.description}
      </p>

      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
        📍 {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)} · 👤 {selected.user_id} · 🕐 {new Date(selected.created_at).toLocaleString('zh-CN')}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>气味云</div>
        <OlfactoryCloud scentType={selected.scent_type as ScentType} active={true} width={280} height={280} />
      </div>

      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>环境音频</div>
        <AudioPlayer audioUrl={selected.audio_url} scentType={selected.scent_type as ScentType} />
      </div>
    </div>
  );

  return (
    <div className={`map-page ${fadeIn ? 'fade-in' : ''}`} style={{
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.6s ease',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#faf8f4',
    }}>
      <BackgroundParticles />

      <nav style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌸</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#3d5a3a' }}>气味地图</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as ScentType | '')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.8)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <option value="">全部气味</option>
            {SCENT_TYPES.map(t => (
              <option key={t} value={t}>{SCENT_CONFIG[t].icon} {SCENT_CONFIG[t].label}</option>
            ))}
          </select>
          {userId && (
            <button
              onClick={() => setShowFootprint(!showFootprint)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                background: showFootprint ? 'rgba(168,201,127,0.3)' : 'rgba(255,255,255,0.8)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              🦶 气味足迹
            </button>
          )}
          {userId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>👤 {userId}</span>
              <button
                onClick={onLogout}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)', fontSize: 12, cursor: 'pointer' }}
              >退出</button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #a8c97f, #7da654)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(125,166,84,0.3)',
              }}
            >登录</button>
          )}
        </div>
      </nav>

      {footprint && showFootprint && (
        <div style={{
          position: 'relative', zIndex: 10,
          padding: '8px 24px',
          background: 'rgba(168,201,127,0.15)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(168,201,127,0.2)',
          display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#3d5a3a',
        }}>
          <span>🦶 你的气味足迹：共 <strong>{footprint.total_count}</strong> 个标记</span>
          {footprint.last_activity && (
            <span>最近活动：{new Date(footprint.last_activity).toLocaleString('zh-CN')}</span>
          )}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <div style={{
          flex: isMobile ? '1' : '0 0 60%',
          height: '100%',
          position: 'relative',
        }}>
          <MapContainer
            center={[32, 112]}
            zoom={5}
            style={{ width: '100%', height: '100%' }}
            zoomControl={!isMobile}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {marks.map(m => (
              <Marker
                key={m.id}
                position={[m.lat, m.lng]}
                icon={createScentIcon(m.scent_type as ScentType)}
                eventHandlers={{ click: () => handleMarkerClick(m) }}
              >
                <Tooltip direction="top" offset={[0, -16]}>
                  <span style={{ fontSize: 12 }}>{SCENT_CONFIG[m.scent_type as ScentType]?.icon} {m.description.slice(0, 20)}…</span>
                </Tooltip>
              </Marker>
            ))}
            {footprintPositions.length > 1 && (
              <>
                <Polyline
                  positions={footprintPositions}
                  pathOptions={{
                    color: '#a8c97f',
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '8 6',
                  }}
                />
                <Polyline
                  positions={footprintPositions}
                  pathOptions={{
                    color: '#d4e8b0',
                    weight: 8,
                    opacity: 0.25,
                  }}
                />
              </>
            )}
          </MapContainer>

          {!userId && (
            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              padding: '10px 20px', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              fontSize: 13, color: '#666', zIndex: 1000,
            }}>
              登录后可在地图上点击添加气味标记
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{
            flex: '0 0 40%',
            height: '100%',
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {selected ? panel : (
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(16px)',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                color: '#999',
                border: '1px solid rgba(255,255,255,0.5)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌬️</div>
                <p style={{ fontSize: 14 }}>点击地图上的标记查看详情</p>
                <p style={{ fontSize: 12, color: '#bbb' }}>或登录后点击地图添加新的气味标记</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isMobile && panel}

      {showForm && adding && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: 28,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.6)',
            animation: 'modalIn 0.3s ease-out',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#333' }}>🌸 添加气味标记</h3>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
              📍 {adding.lat.toFixed(4)}, {adding.lng.toFixed(4)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', marginBottom: 6, display: 'block' }}>气味描述</label>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="描述这里的气味…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)', fontSize: 14,
                  background: 'rgba(255,255,255,0.6)',
                  resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', marginBottom: 8, display: 'block' }}>气味类型</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SCENT_TYPES.map(t => {
                  const cfg = SCENT_CONFIG[t];
                  const active = formScent === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setFormScent(t)}
                      style={{
                        padding: '6px 14px', borderRadius: 10,
                        border: active ? `2px solid ${cfg.color}` : '2px solid rgba(0,0,0,0.08)',
                        background: active ? `${cfg.color}18` : 'rgba(255,255,255,0.6)',
                        fontSize: 13, cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: active ? cfg.color : '#666',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: '#666', marginBottom: 6, display: 'block' }}>上传音频（可选）</label>
              <input
                type="file"
                accept="audio/*"
                onChange={e => setFormAudio(e.target.files?.[0] || null)}
                style={{ fontSize: 13, color: '#888' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 20px', borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255,255,255,0.6)', fontSize: 14,
                  cursor: 'pointer', color: '#666',
                }}
              >取消</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formDesc.trim()}
                style={{
                  padding: '8px 24px', borderRadius: 10,
                  border: 'none',
                  background: submitting || !formDesc.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #a8c97f, #7da654)',
                  color: '#fff', fontSize: 14,
                  fontWeight: 600, cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 2px 8px rgba(125,166,84,0.3)',
                }}
              >{submitting ? '提交中…' : '标记'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
