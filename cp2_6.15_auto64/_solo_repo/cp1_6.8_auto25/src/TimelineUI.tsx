import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventManager, TimelineEvent } from './EventManager';
import { LayerManager, LayoutMode } from './LayerManager';
import { TimelineEngine } from './TimelineEngine';

const ICONS = ['🎂', '📚', '🎓', '✈️', '💼', '🏛️', '❤️', '🏠', '🎵', '🏆', '🌟', '🎒', '💻', '🎨', '🌍', '💍'];
const COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#f87171', '#38bdf8', '#818cf8', '#4ade80'];

type AppMode = 'browse' | 'edit';

const eventManager = new EventManager();
const layerManager = new LayerManager();

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasWrap: {
    width: '100%',
    height: 'calc(100% - 64px)',
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: 'rgba(15,23,42,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(96,165,250,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  navBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.3)',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  navBtnActive: {
    padding: '8px 20px',
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.6)',
    background: 'rgba(96,165,250,0.15)',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  navDivider: {
    width: 1,
    height: 28,
    background: 'rgba(96,165,250,0.2)',
  },
  card: {
    position: 'absolute',
    width: 320,
    background: 'rgba(30,41,59,0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 16,
    border: '1px solid rgba(96,165,250,0.2)',
    padding: 24,
    color: '#e2e8f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(96,165,250,0.1)',
    zIndex: 20,
    animation: 'cardIn 0.3s ease',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#cbd5e1',
  },
  cardClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(96,165,250,0.15)',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  },
  panel: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 360,
    maxHeight: 'calc(100% - 96px)',
    background: 'rgba(15,23,42,0.9)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 16,
    border: '1px solid rgba(96,165,250,0.2)',
    padding: 20,
    color: '#e2e8f0',
    overflowY: 'auto' as const,
    zIndex: 15,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    color: '#60a5fa',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.2)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.2)',
    background: 'rgba(30,41,59,0.8)',
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical' as React.CSSProperties['resize'],
    minHeight: 60,
  },
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.15)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  iconBtnSelected: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.5)',
    background: 'rgba(96,165,250,0.15)',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  colorGrid: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  colorDotSelected: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    transform: 'scale(1.15)',
  },
  btnPrimary: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  btnDanger: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(248,113,113,0.3)',
    background: 'rgba(248,113,113,0.1)',
    color: '#f87171',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  eventListItem: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(96,165,250,0.1)',
    background: 'rgba(30,41,59,0.5)',
    marginBottom: 8,
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'all 0.2s ease',
  },
  eventListIcon: {
    fontSize: 20,
  },
  eventListInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventListTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  eventListDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  eventListActions: {
    display: 'flex',
    gap: 4,
  },
  smallBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid rgba(96,165,250,0.2)',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
  },
  headerTitle: {
    position: 'absolute',
    top: 16,
    left: 20,
    fontSize: 22,
    fontWeight: 700,
    color: 'rgba(96,165,250,0.7)',
    zIndex: 5,
    pointerEvents: 'none',
    letterSpacing: 2,
  },
  emptyHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
    color: '#475569',
    zIndex: 5,
    pointerEvents: 'none',
  },
};

export function TimelineUI() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TimelineEngine | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(() => eventManager.getAll());
  const [appMode, setAppMode] = useState<AppMode>('browse');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('vertical');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: '',
    icon: '🎂',
    color: '#60a5fa',
  });
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = eventManager.subscribe(() => {
      setEvents(eventManager.getAll());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new TimelineEngine(layerManager);
    engine.attach(canvasRef.current);
    engineRef.current = engine;

    engine.setOnNodeClick((idx: number) => {
      const evts = eventManager.getAll();
      if (idx >= 0 && idx < evts.length) {
        const evt = evts[idx];
        setSelectedEvent(evt);
        const positions = engine.getPositions();
        if (positions[idx]) {
          const p = positions[idx];
          const mode = layerManager.getMode();
          const cx = mode === 'vertical' ? (p.side === 'left' ? p.x - 190 : p.x + 30) : p.x - 160;
          const cy = mode === 'vertical' ? p.y - 60 : (p.side === 'left' ? p.y - 140 : p.y + 20);
          setCardPos({ x: Math.max(10, cx), y: Math.max(10, cy) });
        }
      }
    });

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engine.detach();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setEvents(events);
    }
  }, [events]);

  useEffect(() => {
    layerManager.setMode(layoutMode);
    if (engineRef.current) {
      engineRef.current.setEvents(events);
    }
    setSelectedEvent(null);
  }, [layoutMode, events]);

  useEffect(() => {
    if (appMode === 'browse') {
      setSelectedEvent(null);
    }
  }, [appMode]);

  const handleAddEvent = useCallback(() => {
    if (!formData.title || !formData.date) return;
    if (editingEvent) {
      eventManager.update(editingEvent.id, {
        title: formData.title,
        date: formData.date,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
      });
      setEditingEvent(null);
    } else {
      eventManager.add({
        title: formData.title,
        date: formData.date,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
      });
    }
    setFormData({ title: '', date: '', description: '', icon: '🎂', color: '#60a5fa' });
    setShowAddForm(false);
  }, [formData, editingEvent]);

  const startEdit = useCallback((evt: TimelineEvent) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      date: evt.date,
      description: evt.description,
      icon: evt.icon,
      color: evt.color,
    });
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    eventManager.remove(id);
    if (selectedEvent?.id === id) setSelectedEvent(null);
  }, [selectedEvent]);

  const handleDragStart = useCallback((idx: number) => {
    dragItemRef.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverRef.current = idx;
  }, []);

  const handleDrop = useCallback(() => {
    if (dragItemRef.current === null || dragOverRef.current === null) return;
    if (dragItemRef.current === dragOverRef.current) return;
    const sorted = eventManager.getAll();
    const reordered = [...sorted];
    const [removed] = reordered.splice(dragItemRef.current, 1);
    reordered.splice(dragOverRef.current, 0, removed);
    eventManager.reorder(reordered.map((e) => e.id));
    dragItemRef.current = null;
    dragOverRef.current = null;
  }, []);

  const renderAddForm = () => (
    <div style={{ marginTop: 12 }}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>标题</label>
        <input
          style={styles.input}
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
          placeholder="事件标题"
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>日期</label>
        <input
          style={styles.input}
          type="date"
          value={formData.date}
          onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>描述</label>
        <textarea
          style={styles.textarea}
          value={formData.description}
          onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder="描述这个事件..."
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>图标</label>
        <div style={styles.iconGrid}>
          {ICONS.map((icon) => (
            <button
              key={icon}
              style={formData.icon === icon ? styles.iconBtnSelected : styles.iconBtn}
              onClick={() => setFormData((f) => ({ ...f, icon }))}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>颜色</label>
        <div style={styles.colorGrid}>
          {COLORS.map((color) => (
            <div
              key={color}
              style={{
                ...(formData.color === color ? styles.colorDotSelected : styles.colorDot),
                background: color,
              }}
              onClick={() => setFormData((f) => ({ ...f, color }))}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button style={styles.btnPrimary} onClick={handleAddEvent}>
          {editingEvent ? '保存修改' : '添加事件'}
        </button>
        <button
          style={styles.smallBtn}
          onClick={() => {
            setShowAddForm(false);
            setEditingEvent(null);
            setFormData({ title: '', date: '', description: '', icon: '🎂', color: '#60a5fa' });
          }}
        >
          取消
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.2); border-radius: 2px; }
        input:focus, textarea:focus {
          border-color: rgba(96,165,250,0.5) !important;
        }
        button:hover { filter: brightness(1.1); }
      `}</style>

      <div style={styles.headerTitle}>时光篆刻</div>

      <div style={styles.canvasWrap}>
        <canvas ref={canvasRef} style={styles.canvas} />
        {events.length === 0 && (
          <div style={styles.emptyHint}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16 }}>点击下方编辑模式添加你的第一个事件</div>
          </div>
        )}
      </div>

      {selectedEvent && appMode === 'browse' && (
        <div style={{ ...styles.card, left: cardPos.x, top: cardPos.y }}>
          <button style={styles.cardClose} onClick={() => setSelectedEvent(null)}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>{selectedEvent.icon}</span>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: selectedEvent.color,
                boxShadow: `0 0 12px ${selectedEvent.color}`,
              }}
            />
          </div>
          <div style={{ ...styles.cardTitle, color: selectedEvent.color }}>{selectedEvent.title}</div>
          <div style={styles.cardDate}>{selectedEvent.date}</div>
          <div style={styles.cardDesc}>{selectedEvent.description}</div>
        </div>
      )}

      {appMode === 'edit' && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>编辑事件</div>

          {!showAddForm && (
            <button
              style={{ ...styles.btnPrimary, width: '100%', marginBottom: 16 }}
              onClick={() => {
                setEditingEvent(null);
                setFormData({ title: '', date: '', description: '', icon: '🎂', color: '#60a5fa' });
                setShowAddForm(true);
              }}
            >
              + 添加新事件
            </button>
          )}

          {showAddForm && renderAddForm()}

          <div style={{ marginTop: 16, borderTop: '1px solid rgba(96,165,250,0.1)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              事件列表（拖拽排序）
            </div>
            {events.map((evt, idx) => (
              <div
                key={evt.id}
                style={styles.eventListItem}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDrop}
              >
                <span style={styles.eventListIcon}>{evt.icon}</span>
                <div style={styles.eventListInfo}>
                  <div style={styles.eventListTitle}>{evt.title}</div>
                  <div style={styles.eventListDate}>{evt.date}</div>
                </div>
                <div style={styles.eventListActions}>
                  <button style={styles.smallBtn} onClick={() => startEdit(evt)}>编辑</button>
                  <button
                    style={{ ...styles.smallBtn, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                    onClick={() => handleDelete(evt.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button style={styles.smallBtn} onClick={() => eventManager.sortByDate()}>
              按日期排序
            </button>
            <button
              style={{ ...styles.smallBtn, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
              onClick={() => {
                eventManager.reset();
              }}
            >
              重置示例
            </button>
          </div>
        </div>
      )}

      <div style={styles.navBar}>
        <button
          style={appMode === 'browse' ? styles.navBtnActive : styles.navBtn}
          onClick={() => setAppMode('browse')}
        >
          🔍 浏览模式
        </button>
        <button
          style={appMode === 'edit' ? styles.navBtnActive : styles.navBtn}
          onClick={() => setAppMode('edit')}
        >
          ✏️ 编辑模式
        </button>
        <div style={styles.navDivider} />
        <button
          style={layoutMode === 'vertical' ? styles.navBtnActive : styles.navBtn}
          onClick={() => setLayoutMode('vertical')}
        >
          ↕ 垂直
        </button>
        <button
          style={layoutMode === 'horizontal' ? styles.navBtnActive : styles.navBtn}
          onClick={() => setLayoutMode('horizontal')}
        >
          ↔ 水平
        </button>
      </div>
    </div>
  );
}
