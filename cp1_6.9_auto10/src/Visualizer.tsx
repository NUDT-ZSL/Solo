import { useEffect, useRef, useState } from 'react';

export interface SentenceRibbon {
  id: string;
  text: string;
  score: number;
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  charCount: number;
  startIndex: number;
  endIndex: number;
  keywords: string[];
}

interface VisualizerProps {
  ribbons: SentenceRibbon[];
  filter: 'all' | 'positive' | 'negative' | 'neutral';
  activeId: string | null;
  onRibbonClick: (id: string) => void;
  onColorChange: (id: string, hue: number, saturation: number, lightness: number, score: number) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

export default function Visualizer({
  ribbons,
  filter,
  activeId,
  onRibbonClick,
  onColorChange,
}: VisualizerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const particleHostRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);

  useEffect(() => {
    if (ribbons.length === 0) return;
    const colors = ribbons.map((r) => r.color);
    particlesRef.current = [];
    for (let i = 0; i < 20; i++) {
      const color = colors[i % colors.length];
      particlesRef.current.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.05,
        size: 2,
        opacity: 0.3 + Math.random() * 0.3,
        color,
      });
    }

    const animate = () => {
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 100;
        if (p.x > 100) p.x = 0;
        if (p.y < 0) p.y = 100;
        if (p.y > 100) p.y = 0;
      });
      if (particleHostRef.current) {
        particleHostRef.current.innerHTML = '';
        particlesRef.current.forEach((p) => {
          const div = document.createElement('div');
          div.style.cssText = `position:absolute;left:${p.x}%;top:${p.y}%;width:${p.size}px;height:${p.size}px;border-radius:50%;background:${p.color};opacity:${p.opacity};box-shadow:0 0 ${p.size * 2}px ${p.color};pointer-events:none;transition:background 0.5s;`;
          particleHostRef.current!.appendChild(div);
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [ribbons.length]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let rafId = 0;
    const step = () => {
      const diff = targetScrollRef.current - currentScrollRef.current;
      if (Math.abs(diff) > 0.5) {
        currentScrollRef.current += diff * 0.25;
        scroller.scrollTop = currentScrollRef.current;
        rafId = requestAnimationFrame(step);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetScrollRef.current = Math.max(
        0,
        Math.min(scroller.scrollHeight - scroller.clientHeight, targetScrollRef.current + e.deltaY)
      );
      cancelAnimationFrame(rafId);
      step();
    };

    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      scroller.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToRibbon = (id: string) => {
    const el = document.getElementById(`ribbon-${id}`);
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const target = el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2;
      targetScrollRef.current = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, target));
    }
  };

  useEffect(() => {
    if (activeId) {
      scrollToRibbon(activeId);
    }
  }, [activeId]);

  const getFilterOpacity = (r: SentenceRibbon) => {
    if (filter === 'all') return 1;
    if (filter === 'positive' && r.score > 0.1) return 1;
    if (filter === 'negative' && r.score < -0.1) return 1;
    if (filter === 'neutral' && r.score >= -0.1 && r.score <= 0.1) return 1;
    return 0.2;
  };

  const totalChars = ribbons.reduce((acc, r) => acc + r.charCount, 0) || 1;
  const maxChars = Math.max(...ribbons.map((r) => r.charCount), 1);

  const active = ribbons.find((r) => r.id === editingId);

  const handleSliderChange = (field: 'hue' | 'saturation' | 'lightness', val: number) => {
    if (!active) return;
    const newHue = field === 'hue' ? val : active.hue;
    const newSat = field === 'saturation' ? val : active.saturation;
    const newLight = field === 'lightness' ? val : active.lightness;

    let newScore = active.score;
    if (field === 'hue') {
      if (val >= 0 && val < 35) newScore = (35 - val) / 35;
      else if (val >= 35 && val <= 190) newScore = 0;
      else if (val > 190 && val <= 280) newScore = -(val - 190) / 90;
    }
    newScore = Math.max(-1, Math.min(1, newScore));

    onColorChange(active.id, newHue, newSat, newLight, newScore);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#15152A',
        border: '1px solid rgba(148, 163, 184, 0.15)',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          backgroundColor: 'rgba(21, 21, 42, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F97316, #EF4444)',
              boxShadow: '0 0 10px #F9731680',
            }}
          />
          <span style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '14px' }}>
            情绪丝带 ({ribbons.length})
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748B' }}>
          共 {totalChars} 字符
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          ref={particleHostRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '100px',
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'linear-gradient(180deg, transparent, rgba(148,163,184,0.2) 10%, rgba(148,163,184,0.2) 90%, transparent)',
            zIndex: 2,
          }}
        />

        <div
          style={{
            position: 'relative',
            padding: '24px 40px 24px 130px',
            minHeight: '100%',
            zIndex: 3,
          }}
        >
          {ribbons.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#64748B',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '48px', opacity: 0.4 }}>🎨</div>
              <div style={{ fontSize: '14px' }}>在左侧输入文字，这里将显示情绪丝带</div>
            </div>
          ) : (
            ribbons.map((r, idx) => {
              const opacity = getFilterOpacity(r);
              const isActive = activeId === r.id;
              const isHover = hoverId === r.id;
              const isEditing = editingId === r.id;
              const ribbonHeight = Math.max(28, 40 + (r.charCount / maxChars) * 30);
              const ribbonWidth = isHover || isEditing ? 16 : 10;
              const intensity = Math.abs(r.score);
              const topOffset = (1 - r.charCount / maxChars) * 20;

              const glowColor = `hsla(${r.hue}, ${r.saturation}%, ${Math.min(100, r.lightness + 20)}%, 0.8)`;
              const gradStart = `hsl(${r.hue}, ${r.saturation}%, ${r.lightness}%)`;
              const gradEnd = `hsl(${r.hue}, ${r.saturation}%, ${Math.min(100, r.lightness + 40)}%)`;

              return (
                <div
                  key={r.id}
                  id={`ribbon-${r.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    opacity,
                    transform: isEditing ? 'scale(1.02)' : 'scale(1)',
                    transition: 'opacity 0.3s ease, transform 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-90px',
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '12px',
                      color: isActive ? '#A78BFA' : '#64748B',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s',
                    }}
                  >
                    #{idx + 1}
                  </div>

                  <div
                    onClick={() => {
                      onRibbonClick(r.id);
                      setEditingId(r.id);
                    }}
                    onMouseEnter={() => setHoverId(r.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      position: 'relative',
                      width: `${ribbonWidth + 16}px`,
                      height: `${ribbonHeight}px`,
                      marginLeft: `${topOffset}px`,
                      marginRight: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${ribbonWidth}px`,
                        height: '100%',
                        borderRadius: `${ribbonWidth / 2}px`,
                        background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})`,
                        boxShadow: `0 0 ${4 + intensity * 12}px ${glowColor}, inset 0 0 ${4 + intensity * 4}px rgba(255,255,255,${0.1 + intensity * 0.15})`,
                        outline: `2px solid ${glowColor}`,
                        outlineOffset: isActive ? '3px' : '1px',
                        transition: 'all 0.2s ease-out',
                        transform: isActive ? 'scaleX(1.15)' : 'scaleX(1)',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: isHover || isEditing ? '#F1F5F9' : '#94A3B8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'color 0.2s',
                        padding: '4px 0',
                      }}
                    >
                      {r.text.length > 30 ? r.text.substring(0, 30) + '…' : r.text}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        marginTop: '2px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {r.keywords.slice(0, 3).map((k, ki) => (
                        <span
                          key={ki}
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '8px',
                            backgroundColor: `${gradStart}33`,
                            color: gradStart,
                            border: `1px solid ${gradStart}44`,
                          }}
                        >
                          {k}
                        </span>
                      ))}
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#64748B',
                          padding: '1px 4px',
                        }}
                      >
                        {r.charCount}字 · {r.score >= 0 ? '+' : ''}{r.score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editingId && active && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingId(null);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '80px 24px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '320px',
              backgroundColor: '#1E1E2E',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              animation: 'slideIn 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '14px' }}>🎨 情绪调色板</span>
              <button
                onClick={() => setEditingId(null)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                height: '60px',
                borderRadius: '12px',
                marginBottom: '16px',
                background: `linear-gradient(90deg, hsl(${active.hue}, ${active.saturation}%, ${active.lightness}%), hsl(${active.hue}, ${active.saturation}%, ${Math.min(100, active.lightness + 40)}%))`,
                boxShadow: `0 0 24px hsla(${active.hue}, ${active.saturation}%, ${active.lightness}%, 0.5)`,
                border: '2px solid rgba(255,255,255,0.1)',
              }}
            />

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>色相 Hue</span>
                <span style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600 }}>{active.hue}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={active.hue}
                onChange={(e) => handleSliderChange('hue', Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  appearance: 'none',
                  background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>饱和度 Saturation</span>
                <span style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600 }}>{active.saturation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={active.saturation}
                onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  appearance: 'none',
                  background: `linear-gradient(to right, hsl(${active.hue}, 0%, ${active.lightness}%), hsl(${active.hue}, 100%, ${active.lightness}%))`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>亮度 Lightness</span>
                <span style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600 }}>{active.lightness}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={active.lightness}
                onChange={(e) => handleSliderChange('lightness', Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  appearance: 'none',
                  background: `linear-gradient(to right, hsl(${active.hue}, ${active.saturation}%, 10%), hsl(${active.hue}, ${active.saturation}%, 50%), hsl(${active.hue}, ${active.saturation}%, 90%))`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(148,163,184,0.08)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#94A3B8',
                lineHeight: '1.7',
              }}
            >
              <div style={{ marginBottom: '6px', color: '#E2E8F0', fontWeight: 500 }}>
                情绪分数: {active.score >= 0 ? '+' : ''}{active.score.toFixed(3)}
              </div>
              <div style={{ fontSize: '11px' }}>
                {active.score > 0.1 ? '积极情绪 😊' : active.score < -0.1 ? '消极情绪 😔' : '中性情绪 😐'}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #A78BFA;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 12px rgba(167,139,250,0.6);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #A78BFA;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
