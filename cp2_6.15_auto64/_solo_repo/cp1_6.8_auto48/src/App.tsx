import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TimelineEngine, ViewMode, Priority, NodeLayout } from './TimelineEngine';
import { ParticleSystem } from './ParticleSystem';
import EventCard from './EventCard';

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: '🔴 高' },
  { value: 'medium', label: '🟠 中' },
  { value: 'low', label: '🟢 低' },
];

const SAMPLE_EVENTS: { title: string; desc: string; priority: Priority; offset: number }[] = [
  { title: '项目启动会议', desc: '讨论项目范围、里程碑和团队分工，确定第一轮迭代目标。', priority: 'high', offset: 0 },
  { title: '需求文档评审', desc: '与产品经理确认功能需求细节，梳理优先级和验收标准。', priority: 'medium', offset: 1 },
  { title: '技术选型调研', desc: '对比前端框架方案，评估性能、生态和团队技术栈匹配度。', priority: 'low', offset: 2 },
  { title: 'UI 设计稿交付', desc: '设计团队交付高保真原型，包含响应式断点和动效说明。', priority: 'high', offset: 3 },
  { title: 'API 接口联调', desc: '后端接口就绪后进行前后端联调，处理数据格式和异常情况。', priority: 'medium', offset: 4 },
];

const App: React.FC = () => {
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TimelineEngine | null>(null);
  const particleRef = useRef<ParticleSystem | null>(null);
  const rafRef = useRef<number>(0);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDate, setNewDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<NodeLayout | null>(null);
  const [cardPos, setCardPos] = useState({ x: 0, y: 0 });
  const [cardVisible, setCardVisible] = useState(false);

  const scrollRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);

  const getRangeLabel = useCallback(() => {
    if (!engineRef.current) return '';
    const { start, end } = engineRef.current.getVisibleRange();
    const s = `${start.getMonth() + 1}/${start.getDate()}`;
    const e = `${end.getMonth() + 1}/${end.getDate()}`;
    return `${s} — ${e}`;
  }, []);

  useEffect(() => {
    const engine = new TimelineEngine();
    engineRef.current = engine;
    engine.setViewMode('week');

    const today = new Date();
    SAMPLE_EVENTS.forEach((se) => {
      const d = new Date(today);
      d.setDate(d.getDate() + se.offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      engine.addEvent(se.title, se.desc, se.priority, dateStr);
    });

    return () => {
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!particleCanvasRef.current) return;
    const ps = new ParticleSystem(window.innerWidth < 768 ? 30 : 60);
    ps.init(particleCanvasRef.current);
    particleRef.current = ps;
    return () => {
      ps.destroy();
      particleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (particleRef.current && particleCanvasRef.current) {
        particleRef.current.resize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const animate = (time: number) => {
      const engine = engineRef.current;
      const ps = particleRef.current;
      const tlCanvas = timelineCanvasRef.current;
      const ptCanvas = particleCanvasRef.current;

      if (ps && ptCanvas) {
        ps.update();
        const ptCtx = ptCanvas.getContext('2d');
        if (ptCtx) {
          ptCtx.clearRect(0, 0, ptCanvas.width, ptCanvas.height);
          ps.draw(ptCtx);
        }
      }

      if (engine && tlCanvas) {
        engine.update(time);
        const w = tlCanvas.clientWidth;
        const h = tlCanvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (tlCanvas.width !== w * dpr || tlCanvas.height !== h * dpr) {
          tlCanvas.width = w * dpr;
          tlCanvas.height = h * dpr;
        }
        const ctx = tlCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          engine.drawTimeline(ctx, w, h, scrollRef.current);
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const el = timelineCanvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current = Math.max(0, scrollRef.current + e.deltaY * 0.5);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = timelineCanvasRef.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = engine.hitTest(mx, my, rect.width, scrollRef.current);

      if (hoveredRef.current && hoveredRef.current !== hit?.event.id) {
        engine.setHovered(hoveredRef.current, false);
      }

      if (hit) {
        engine.setHovered(hit.event.id, true);
        hoveredRef.current = hit.event.id;
        el.style.cursor = 'pointer';
      } else {
        hoveredRef.current = null;
        el.style.cursor = 'default';
      }
    };

    const onClick = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = engine.hitTest(mx, my, rect.width, scrollRef.current);

      if (hit) {
        const centerX = rect.width / 2 + hit.currentX;
        const ny = hit.currentY - scrollRef.current;
        setCardPos({ x: e.clientX, y: e.clientY });
        setSelectedEvent(hit);
        setCardVisible(true);
      }
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const engine = engineRef.current;
      const tlCanvas = timelineCanvasRef.current;
      if (!engine || !tlCanvas) return;
      const rect = tlCanvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const hit = engine.hitTest(mx, my, rect.width, scrollRef.current);
      if (hit) {
        setCardPos({ x: touch.clientX, y: touch.clientY });
        setSelectedEvent(hit);
        setCardVisible(true);
      }
    };
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => containerRef.current?.removeEventListener('touchstart', handleTouchStart);
  }, []);

  const handleAddEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    engineRef.current?.addEvent(newTitle.trim(), newDesc.trim(), newPriority, newDate);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewDate('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    engineRef.current?.removeEvent(id);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    engineRef.current?.setViewMode(mode);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(170deg, #12101f 0%, #0a0a0f 50%, #060612 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <canvas
        ref={timelineCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'linear-gradient(180deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0) 100%)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1
            style={{
              color: '#e8e6f0',
              fontSize: 20,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #a29bfe, #6c5ce7, #74b9ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 1,
            }}
          >
            时序光影
          </h1>
          <span
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: 13,
            }}
          >
            {getRangeLabel()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => engineRef.current?.navigatePrev()}
            style={navBtnStyle}
          >
            ◀
          </button>
          <button
            onClick={() => engineRef.current?.setBaseDate(new Date())}
            style={{ ...navBtnStyle, fontSize: 12, padding: '6px 12px' }}
          >
            今天
          </button>
          <button
            onClick={() => engineRef.current?.navigateNext()}
            style={navBtnStyle}
          >
            ▶
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <button
            onClick={() => handleViewChange('week')}
            style={viewMode === 'week' ? viewBtnActive : viewBtnInactive}
          >
            周
          </button>
          <button
            onClick={() => handleViewChange('month')}
            style={viewMode === 'month' ? viewBtnActive : viewBtnInactive}
          >
            月
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
              border: 'none',
              color: '#fff',
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 2px 12px rgba(108,92,231,0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,92,231,0.4)';
            }}
          >
            + 添加事项
          </button>
        </div>
      </div>

      {showAdd && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div
            style={{
              background: 'rgba(20,18,35,0.9)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              borderRadius: 16,
              border: '1px solid rgba(108,92,231,0.3)',
              padding: 28,
              width: 380,
              maxWidth: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(108,92,231,0.15)',
            }}
          >
            <h3 style={{ color: '#e8e6f0', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
              新增待办事项
            </h3>

            <label style={labelStyle}>标题</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入事项标题…"
              style={inputStyle}
            />

            <label style={labelStyle}>描述</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="输入事项描述…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
            />

            <label style={labelStyle}>日期</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>优先级</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewPriority(opt.value)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border:
                      newPriority === opt.value
                        ? '1px solid rgba(108,92,231,0.6)'
                        : '1px solid rgba(255,255,255,0.08)',
                    background:
                      newPriority === opt.value
                        ? 'rgba(108,92,231,0.2)'
                        : 'rgba(255,255,255,0.03)',
                    color: newPriority === opt.value ? '#a29bfe' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={cancelBtnStyle}>
                取消
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newTitle.trim() || !newDate}
                style={{
                  ...confirmBtnStyle,
                  opacity: newTitle.trim() && newDate ? 1 : 0.4,
                  cursor: newTitle.trim() && newDate ? 'pointer' : 'not-allowed',
                }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      <EventCard
        event={selectedEvent?.event ?? null}
        x={cardPos.x}
        y={cardPos.y}
        visible={cardVisible}
        onClose={() => setCardVisible(false)}
        onDelete={handleDelete}
      />
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'all 0.2s',
};

const viewBtnActive: React.CSSProperties = {
  background: 'rgba(108,92,231,0.25)',
  border: '1px solid rgba(108,92,231,0.5)',
  color: '#a29bfe',
  padding: '6px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  transition: 'all 0.2s',
};

const viewBtnInactive: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.4)',
  padding: '6px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'all 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  marginBottom: 6,
  marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e8e6f0',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  padding: '8px 20px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'all 0.2s',
};

const confirmBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
  border: 'none',
  color: '#fff',
  padding: '8px 20px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  transition: 'all 0.2s',
};

export default App;
