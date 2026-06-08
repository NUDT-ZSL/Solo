import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TimelineEvent, EventManager, SearchResult } from './EventManager';
import { LayoutMode } from './TimelineEngine';

const ICON_OPTIONS = ['🏛️', '⚔️', '📜', '👑', '🔬', '🎨', '🚀', '💡', '🌍', '⚓', '⚒️', '🎭', '信仰', '⚡', '🔮', '🎵', '📐', '🌿'];
const COLOR_OPTIONS = ['#c9a84c', '#e06040', '#4ca8e0', '#5ce060', '#e0c040', '#a060e0', '#e06080', '#60e0c0', '#e08040', '#8080e0'];

interface UIOverlayProps {
  eventManager: EventManager;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onEventClick: (id: string | null) => void;
  selectedEventId: string | null;
  onAddEvent?: () => void;
}

const overlayStyles: Record<string, React.CSSProperties> = {
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    background: 'rgba(10, 10, 15, 0.7)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
    zIndex: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #f0d878, #c9a84c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 2,
    whiteSpace: 'nowrap',
  },
  searchWrap: {
    position: 'relative',
    flex: '0 1 320px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 14px 8px 36px',
    borderRadius: 8,
    border: '1px solid rgba(201, 168, 76, 0.25)',
    background: 'rgba(20, 18, 12, 0.8)',
    color: '#e0d8c8',
    fontSize: 13,
    outline: 'none',
    backdropFilter: 'blur(8px)',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(201, 168, 76, 0.5)',
    fontSize: 14,
    pointerEvents: 'none',
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: 'rgba(20, 18, 12, 0.95)',
    border: '1px solid rgba(201, 168, 76, 0.2)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 200,
    backdropFilter: 'blur(12px)',
  },
  suggestionItem: {
    padding: '8px 14px',
    color: '#d0c8b0',
    fontSize: 13,
    cursor: 'pointer',
    borderBottom: '1px solid rgba(201, 168, 76, 0.08)',
    transition: 'background 0.15s',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(201, 168, 76, 0.3)',
    background: 'rgba(201, 168, 76, 0.1)',
    color: '#c9a84c',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  btnActive: {
    background: 'rgba(201, 168, 76, 0.25)',
    borderColor: 'rgba(201, 168, 76, 0.5)',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.3), rgba(240, 216, 120, 0.15))',
    borderColor: 'rgba(240, 216, 120, 0.4)',
    color: '#f0d878',
    fontWeight: 600,
  },
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  eventManager,
  layoutMode,
  onLayoutModeChange,
  onEventClick,
  selectedEventId,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    year: 1,
    isBCE: false,
    description: '',
    icon: '🏛️',
    color: '#c9a84c',
    imageUrl: '',
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (q.trim()) {
        const result = eventManager.search(q);
        setSearchResult(result);
        setShowSuggestions(true);
      } else {
        setSearchResult(null);
        setShowSuggestions(false);
      }
    },
    [eventManager]
  );

  const handleSuggestionClick = useCallback(
    (title: string) => {
      setSearchQuery(title);
      setShowSuggestions(false);
      const result = eventManager.search(title);
      if (result.events.length > 0) {
        onEventClick(result.events[0].id);
      }
    },
    [eventManager, onEventClick]
  );

  const openAddForm = useCallback(() => {
    setEditingEvent(null);
    setFormData({
      title: '',
      year: 1,
      isBCE: false,
      description: '',
      icon: '🏛️',
      color: '#c9a84c',
      imageUrl: '',
    });
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((evt: TimelineEvent) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      year: evt.year,
      isBCE: evt.isBCE,
      description: evt.description,
      icon: evt.icon,
      color: evt.color,
      imageUrl: evt.imageUrl || '',
    });
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.title.trim()) return;
    if (editingEvent) {
      eventManager.updateEvent(editingEvent.id, {
        title: formData.title,
        year: formData.year,
        isBCE: formData.isBCE,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        imageUrl: formData.imageUrl || undefined,
      });
    } else {
      eventManager.addEvent({
        title: formData.title,
        year: formData.year,
        isBCE: formData.isBCE,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        imageUrl: formData.imageUrl || undefined,
      });
    }
    setShowForm(false);
    setEditingEvent(null);
  }, [formData, editingEvent, eventManager]);

  const handleDelete = useCallback(() => {
    if (editingEvent) {
      eventManager.removeEvent(editingEvent.id);
      onEventClick(null);
      setShowForm(false);
      setEditingEvent(null);
    }
  }, [editingEvent, eventManager, onEventClick]);

  const selectedEvent = selectedEventId ? eventManager.getEvent(selectedEventId) : null;

  return (
    <>
      <div style={overlayStyles.topBar}>
        <span style={overlayStyles.title}>光阴织机</span>

        <div style={overlayStyles.searchWrap} ref={searchRef}>
          <span style={overlayStyles.searchIcon}>🔍</span>
          <input
            style={overlayStyles.searchInput}
            placeholder="搜索事件..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
          />
          {showSuggestions && searchResult && searchResult.suggestions.length > 0 && (
            <div style={overlayStyles.suggestions}>
              {searchResult.suggestions.map((s, i) => (
                <div
                  key={i}
                  style={overlayStyles.suggestionItem}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = 'rgba(201, 168, 76, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = 'transparent';
                  }}
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </div>
              ))}
              <div
                style={{
                  ...overlayStyles.suggestionItem,
                  color: 'rgba(201, 168, 76, 0.6)',
                  fontSize: 11,
                  cursor: 'default',
                }}
              >
                找到 {searchResult.events.length} 个事件
              </div>
            </div>
          )}
        </div>

        <button
          style={{ ...overlayStyles.btn, ...(layoutMode === 'horizontal' ? overlayStyles.btnActive : {}) }}
          onClick={() => onLayoutModeChange('horizontal')}
        >
          ↔ 水平
        </button>
        <button
          style={{ ...overlayStyles.btn, ...(layoutMode === 'vertical' ? overlayStyles.btnActive : {}) }}
          onClick={() => onLayoutModeChange('vertical')}
        >
          ↕ 垂直
        </button>
        <button style={{ ...overlayStyles.btn, ...overlayStyles.btnPrimary }} onClick={openAddForm}>
          + 添加事件
        </button>
      </div>

      {selectedEvent && !showForm && (
        <EventCard
          event={selectedEvent}
          onClose={() => onEventClick(null)}
          onEdit={() => openEditForm(selectedEvent)}
        />
      )}

      {showForm && (
        <EventForm
          data={formData}
          onChange={setFormData}
          isEdit={!!editingEvent}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
          onDelete={editingEvent ? handleDelete : undefined}
        />
      )}
    </>
  );
};

interface EventCardProps {
  event: TimelineEvent;
  onClose: () => void;
  onEdit: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClose, onEdit }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const yearLabel = event.isBCE ? `公元前 ${event.year} 年` : `公元 ${event.year} 年`;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: `translateX(-50%) scale(${visible ? 1 : 0.85})`,
        opacity: visible ? 1 : 0,
        width: 'min(420px, 90vw)',
        background: 'rgba(18, 16, 12, 0.82)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid rgba(201, 168, 76, 0.25)',
        borderRadius: 16,
        padding: 24,
        zIndex: 150,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        boxShadow: `0 0 40px rgba(201, 168, 76, 0.1), 0 20px 60px rgba(0,0,0,0.5)`,
      }}
    >
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          color: 'rgba(201, 168, 76, 0.5)',
          fontSize: 18,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{event.icon}</span>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: event.color,
              marginBottom: 2,
            }}
          >
            {event.title}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(201, 168, 76, 0.7)' }}>{yearLabel}</div>
        </div>
      </div>

      {event.imageUrl && (
        <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden' }}>
          <img
            src={event.imageUrl}
            alt={event.title}
            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: 'rgba(220, 210, 190, 0.9)',
          marginBottom: 16,
        }}
      >
        {event.description}
      </div>

      <button
        onClick={onEdit}
        style={{
          ...overlayStyles.btn,
          width: '100%',
          textAlign: 'center',
        }}
      >
        编辑事件
      </button>
    </div>
  );
};

interface EventFormProps {
  data: {
    title: string;
    year: number;
    isBCE: boolean;
    description: string;
    icon: string;
    color: string;
    imageUrl: string;
  };
  isEdit: boolean;
  onChange: (data: EventFormProps['data']) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ data, isEdit, onChange, onSubmit, onCancel, onDelete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onCancel, 200);
  };

  const set = <K extends keyof EventFormProps['data']>(key: K, value: EventFormProps['data'][K]) => {
    onChange({ ...data, [key]: value });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid rgba(201, 168, 76, 0.2)',
    background: 'rgba(30, 26, 18, 0.9)',
    color: '#e0d8c8',
    fontSize: 13,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'rgba(201, 168, 76, 0.7)',
    marginBottom: 4,
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'rgba(18, 16, 12, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(201, 168, 76, 0.25)',
          borderRadius: 16,
          padding: 28,
          transform: visible ? 'scale(1)' : 'scale(0.92)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#f0d878',
            marginBottom: 20,
          }}
        >
          {isEdit ? '编辑事件' : '添加新事件'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>标题</label>
            <input
              style={inputStyle}
              value={data.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="事件名称"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>年份</label>
              <input
                style={inputStyle}
                type="number"
                value={data.year}
                onChange={(e) => set('year', Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
            </div>
            <div>
              <label style={labelStyle}>公元前</label>
              <button
                onClick={() => set('isBCE', !data.isBCE)}
                style={{
                  ...inputStyle,
                  width: 72,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: data.isBCE ? 'rgba(201, 168, 76, 0.2)' : 'rgba(30, 26, 18, 0.9)',
                  borderColor: data.isBCE ? 'rgba(201, 168, 76, 0.5)' : 'rgba(201, 168, 76, 0.2)',
                  color: data.isBCE ? '#f0d878' : '#888',
                }}
              >
                {data.isBCE ? '是' : '否'}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>描述</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="事件描述..."
            />
          </div>

          <div>
            <label style={labelStyle}>图标</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => set('icon', ic)}
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: ic === data.icon ? '2px solid rgba(240, 216, 120, 0.6)' : '1px solid rgba(201, 168, 76, 0.15)',
                    background: ic === data.icon ? 'rgba(201, 168, 76, 0.15)' : 'rgba(30, 26, 18, 0.5)',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>颜色</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: c === data.color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                    background: c,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>图片 URL（可选）</label>
            <input
              style={inputStyle}
              value={data.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {isEdit && onDelete && (
            <button
              onClick={onDelete}
              style={{
                ...overlayStyles.btn,
                borderColor: 'rgba(220, 60, 60, 0.4)',
                color: '#e06040',
              }}
            >
              删除
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={handleClose} style={overlayStyles.btn}>
            取消
          </button>
          <button
            onClick={onSubmit}
            style={{
              ...overlayStyles.btn,
              ...overlayStyles.btnPrimary,
            }}
          >
            {isEdit ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
};
