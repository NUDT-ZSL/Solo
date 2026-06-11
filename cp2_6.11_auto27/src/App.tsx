import React, { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import FlowerCanvas from './components/FlowerCanvas';
import { useIndexedDB } from './hooks/useIndexedDB';
import type { ScentEntry } from './server';
import type { SyncStatus } from './hooks/useIndexedDB';

type ScentType = 'flower' | 'food' | 'nature' | 'city';
type EmotionType = 'happy' | 'calm' | 'nostalgic' | 'melancholy' | 'excited';
type View = 'record' | 'calendar' | 'detail';

interface AppState {
  view: View;
  entries: ScentEntry[];
  currentEntry: ScentEntry | null;
  selectedDate: string;
  selectedScentType: ScentType | null;
  description: string;
  emotion: EmotionType;
  imageData: string | null;
  bloomProgress: number;
  error: string | null;
}

type Action =
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'SET_ENTRIES'; payload: ScentEntry[] }
  | { type: 'ADD_ENTRY'; payload: ScentEntry }
  | { type: 'UPDATE_ENTRY'; payload: ScentEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_CURRENT_ENTRY'; payload: ScentEntry | null }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_SCENT_TYPE'; payload: ScentType | null }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_EMOTION'; payload: EmotionType }
  | { type: 'SET_IMAGE_DATA'; payload: string | null }
  | { type: 'SET_BLOOM_PROGRESS'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FORM' };

const SCENT_COLORS: Record<ScentType, string> = {
  flower: '#FFB6C1',
  food: '#FFBF00',
  nature: '#7CCD7C',
  city: '#6B7B8D',
};

const SCENT_ICONS: Record<ScentType, string> = {
  flower: '🌸',
  food: '🍯',
  nature: '🌿',
  city: '🏙️',
};

const SCENT_NAMES: Record<ScentType, string> = {
  flower: '花香',
  food: '食物香',
  nature: '自然香',
  city: '城市香',
};

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happy: '😊',
  calm: '😌',
  nostalgic: '🥹',
  melancholy: '😔',
  excited: '🤩',
};

const EMOTION_NAMES: Record<EmotionType, string> = {
  happy: '快乐',
  calm: '平静',
  nostalgic: '怀旧',
  melancholy: '忧郁',
  excited: '兴奋',
};

const EMOTION_GRADIENTS: Record<string, string> = {
  happy: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  melancholy: 'linear-gradient(135deg, #C0B4D0 0%, #A69AC8 100%)',
  calm: 'linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)',
  nostalgic: 'linear-gradient(135deg, #DEB887 0%, #D2691E 100%)',
  excited: 'linear-gradient(135deg, #FF6B6B 0%, #FF4757 100%)',
};

const initialState: AppState = {
  view: 'record',
  entries: [],
  currentEntry: null,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedScentType: null,
  description: '',
  emotion: 'calm',
  imageData: null,
  bloomProgress: 0,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload };
    case 'ADD_ENTRY':
      return { ...state, entries: [action.payload, ...state.entries] };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
      };
    case 'SET_CURRENT_ENTRY':
      return { ...state, currentEntry: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_SCENT_TYPE':
      return { ...state, selectedScentType: action.payload, bloomProgress: 0 };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_EMOTION':
      return { ...state, emotion: action.payload };
    case 'SET_IMAGE_DATA':
      return { ...state, imageData: action.payload };
    case 'SET_BLOOM_PROGRESS':
      return { ...state, bloomProgress: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_FORM':
      return {
        ...state,
        selectedScentType: null,
        description: '',
        emotion: 'calm',
        imageData: null,
        bloomProgress: 0,
        currentEntry: null,
      };
    default:
      return state;
  }
}

interface Particle {
  x: number;
  y: number;
  size: number;
  baseSize: number;
  opacity: number;
  maxOpacity: number;
  speed: number;
  driftSpeed: number;
  driftOffset: number;
  driftDirection: number;
  phase: number;
}

const SyncOverlay: React.FC<{ syncStatus: SyncStatus }> = ({ syncStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (syncStatus !== 'syncing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particleCount = Math.floor(Math.random() * 31) + 20;
    particlesRef.current = [];

    const createParticle = (startY?: number): Particle => {
      const riseDuration = Math.random() * 1 + 0.5;
      const speed = height / (riseDuration * 60);
      const baseSize = Math.random() * 20 + 15;
      const maxOpacity = Math.random() * 0.25 + 0.15;

      return {
        x: Math.random() * width,
        y: startY !== undefined ? startY : height + Math.random() * 100,
        size: baseSize * 0.3,
        baseSize,
        opacity: 0,
        maxOpacity,
        speed,
        driftSpeed: Math.random() * 0.02 + 0.01,
        driftOffset: Math.random() * Math.PI * 2,
        driftDirection: Math.random() > 0.5 ? 1 : -1,
        phase: Math.random(),
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(Math.random() * height));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 0.016;

      particlesRef.current.forEach((p, i) => {
        p.y -= p.speed;
        p.phase += p.driftSpeed;
        p.x += Math.sin(p.phase + p.driftOffset) * p.driftDirection * 0.8;

        const progress = 1 - p.y / height;

        if (progress < 0.2) {
          p.opacity = (progress / 0.2) * p.maxOpacity;
        } else if (progress > 0.7) {
          p.opacity = ((1 - progress) / 0.3) * p.maxOpacity;
        } else {
          p.opacity = p.maxOpacity;
        }

        p.size = p.baseSize * (0.4 + progress * 0.8);

        if (p.y < -p.size || p.opacity <= 0) {
          particlesRef.current[i] = createParticle();
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(255, 248, 220, ${p.opacity})`);
        gradient.addColorStop(0.4, `rgba(255, 248, 220, ${p.opacity * 0.6})`);
        gradient.addColorStop(0.7, `rgba(255, 248, 220, ${p.opacity * 0.2})`);
        gradient.addColorStop(1, 'rgba(255, 248, 220, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncStatus]);

  if (syncStatus !== 'syncing') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(26, 26, 46, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(6px)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '32px 48px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💨</div>
        <h2
          style={{
            color: '#1A1A2E',
            marginBottom: '16px',
            fontSize: '20px',
          }}
        >
          香气飘送中...
        </h2>
        <div
          style={{
            width: '200px',
            height: '8px',
            background: '#E0D8C8',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #FFB6C1, #7CCD7C, #FFBF00, #6B7B8D)',
              animation: 'progress 2s ease-in-out infinite',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

const RecordPage: React.FC<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onSave: () => void;
}> = ({ state, dispatch, onSave }) => {
  const petalCount = Math.min(20, state.description.length);

  useEffect(() => {
    if (state.selectedScentType && state.bloomProgress < 1) {
      const startTime = Date.now();
      const duration = 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        dispatch({ type: 'SET_BLOOM_PROGRESS', payload: progress });

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [state.selectedScentType, state.bloomProgress, dispatch]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        dispatch({
          type: 'SET_IMAGE_DATA',
          payload: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A2E',
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          marginBottom: '24px',
          color: '#E0D8C8',
          fontSize: '28px',
        }}
      >
        🌸 气味日记
      </h1>

      <div
        style={{
          background: 'radial-gradient(circle at center, #FFF8DC 0%, #F5DEB3 100%)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <FlowerCanvas
          petalCount={state.selectedScentType ? petalCount : 0}
          scentType={state.selectedScentType || undefined}
          textDescription={state.description}
          imageData={state.imageData || undefined}
          bloomProgress={state.bloomProgress}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '12px',
            color: '#E0D8C8',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          选择气味类型
        </label>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {(Object.keys(SCENT_COLORS) as ScentType[]).map((type) => (
            <button
              key={type}
              onClick={() => dispatch({ type: 'SET_SCENT_TYPE', payload: type })}
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                border: state.selectedScentType === type
                  ? `3px solid ${SCENT_COLORS[type]}`
                  : '2px solid transparent',
                background: SCENT_COLORS[type],
                fontSize: '28px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: state.selectedScentType === type
                  ? `0 0 20px ${SCENT_COLORS[type]}80`
                  : '0 2px 8px rgba(0,0,0,0.2)',
                transform: state.selectedScentType === type ? 'scale(1.1)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <span>{SCENT_ICONS[type]}</span>
              <span style={{ fontSize: '10px', color: '#1A1A2E', marginTop: '2px' }}>
                {SCENT_NAMES[type]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            color: '#E0D8C8',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          描述这个气味
        </label>
        <textarea
          value={state.description}
          onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
          placeholder="今天闻到了什么？比如：雨后泥土的清新..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #3A3A5A',
            background: '#2A2A4A',
            color: '#E0D8C8',
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <div style={{ textAlign: 'right', color: '#888', fontSize: '12px', marginTop: '4px' }}>
          {state.description.length}/20 花瓣
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            color: '#E0D8C8',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          此刻的心情
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(EMOTION_EMOJIS) as EmotionType[]).map((emotion) => (
            <button
              key={emotion}
              onClick={() => dispatch({ type: 'SET_EMOTION', payload: emotion })}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: state.emotion === emotion
                  ? '2px solid #FFD700'
                  : '1px solid #3A3A5A',
                background: state.emotion === emotion ? '#3A3A5A' : '#2A2A4A',
                color: '#E0D8C8',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {EMOTION_EMOJIS[emotion]} {EMOTION_NAMES[emotion]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            color: '#E0D8C8',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          上传图片（可选）
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{
            color: '#E0D8C8',
          }}
        />
        {state.imageData && (
          <div style={{ marginTop: '12px' }}>
            <img
              src={state.imageData}
              alt="预览"
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          </div>
        )}
      </div>

      <button
        onClick={onSave}
        disabled={!state.selectedScentType || !state.description.trim()}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: state.selectedScentType && state.description.trim()
            ? 'linear-gradient(135deg, #FFB6C1 0%, #7CCD7C 100%)'
            : '#3A3A5A',
          color: state.selectedScentType && state.description.trim() ? '#1A1A2E' : '#666',
          fontSize: '16px',
          fontWeight: 600,
          cursor: state.selectedScentType && state.description.trim()
            ? 'pointer'
            : 'not-allowed',
          transition: 'all 0.3s ease',
        }}
      >
        保存这朵气味花 💐
      </button>
    </div>
  );
};

const CalendarPage: React.FC<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<ScentEntry | null>(null);

  const getEntriesByMonth = () => {
    const months: Record<string, ScentEntry[]> = {};
    state.entries.forEach((entry) => {
      const monthKey = entry.date.substring(0, 7);
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(entry);
    });
    return months;
  };

  const entriesByMonth = getEntriesByMonth();
  const sortedMonths = Object.keys(entriesByMonth).sort().reverse();

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const getEntriesForDay = (yearMonth: string, day: number) => {
    const dateStr = `${yearMonth}-${day.toString().padStart(2, '0')}`;
    return state.entries.filter((e) => e.date === dateStr);
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const handleDayClick = (yearMonth: string, day: number) => {
    const dateStr = `${yearMonth}-${day.toString().padStart(2, '0')}`;
    const entries = getEntriesForDay(yearMonth, day);
    if (entries.length > 0) {
      setSelectedDay(dateStr);
      setPreviewEntry(entries[0]);
    }
  };

  const handleViewDetail = (entry: ScentEntry) => {
    dispatch({ type: 'SET_CURRENT_ENTRY', payload: entry });
    dispatch({ type: 'SET_VIEW', payload: 'detail' });
    setSelectedDay(null);
    setPreviewEntry(null);
  };

  const getDominantEmotion = (entries: ScentEntry[]): string => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A2E',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          marginBottom: '24px',
          color: '#E0D8C8',
          fontSize: '28px',
        }}
      >
        📅 气味花园
      </h1>

      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'linear-gradient(to bottom, #FFB6C1, #7CCD7C, #FFBF00, #6B7B8D)',
            transform: 'translateX(-50%)',
          }}
        />

        {sortedMonths.map((yearMonth, index) => {
          const [year, month] = yearMonth.split('-').map(Number);
          const daysInMonth = getDaysInMonth(yearMonth);
          const monthEntries = entriesByMonth[yearMonth];
          const dominantEmotion = getDominantEmotion(monthEntries);

          return (
            <div
              key={yearMonth}
              style={{
                marginBottom: '32px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '20px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: EMOTION_GRADIENTS[dominantEmotion] || '#FFD700',
                  transform: 'translateX(-50%)',
                  zIndex: 1,
                  boxShadow: '0 0 12px rgba(255, 215, 0, 0.5)',
                }}
              />

              <div
                style={{
                  width: '45%',
                  marginLeft: index % 2 === 0 ? '0' : '55%',
                  background: '#2A2A4A',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  border: '1px solid #3A3A5A',
                }}
              >
                <h3
                  style={{
                    color: '#E0D8C8',
                    marginBottom: '16px',
                    fontSize: '18px',
                    borderBottom: '1px solid #3A3A5A',
                    paddingBottom: '8px',
                  }}
                >
                  {year}年 {monthNames[month - 1]}
                  <span style={{ float: 'right', color: '#888', fontSize: '14px' }}>
                    {monthEntries.length} 条记录
                  </span>
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                  }}
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayEntries = getEntriesForDay(yearMonth, day);
                    const hasEntry = dayEntries.length > 0;
                    const entryColor = hasEntry
                      ? SCENT_COLORS[dayEntries[0].scentType]
                      : '#3A3A5A';

                    return (
                      <div
                        key={day}
                        onClick={() => handleDayClick(yearMonth, day)}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '50%',
                          background: hasEntry ? entryColor : 'transparent',
                          border: hasEntry ? 'none' : '1px solid #3A3A5A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: hasEntry ? '#1A1A2E' : '#666',
                          cursor: hasEntry ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          fontWeight: hasEntry ? 600 : 400,
                        }}
                        title={hasEntry ? `点击查看${dayEntries.length}条记录` : undefined}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedMonths.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌸</div>
          <p>还没有记录，去记录你的第一朵气味花吧！</p>
        </div>
      )}

      {selectedDay && previewEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => {
            setSelectedDay(null);
            setPreviewEntry(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: EMOTION_GRADIENTS[previewEntry.emotion] || EMOTION_GRADIENTS.calm,
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              filter: 'drop-shadow(0 8px 8px rgba(0, 0, 0, 0.3))',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ color: '#1A1A2E', fontSize: '20px' }}>
                {selectedDay}
              </h3>
              <span style={{ fontSize: '32px' }}>
                {EMOTION_EMOJIS[previewEntry.emotion]}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <FlowerCanvas
                petalCount={Math.min(20, previewEntry.description.length)}
                scentType={previewEntry.scentType}
                textDescription={previewEntry.description}
                imageData={previewEntry.imageData}
                bloomProgress={1}
              />
            </div>

            <p
              style={{
                color: '#1A1A2E',
                fontSize: '16px',
                lineHeight: 1.6,
                marginBottom: '16px',
              }}
            >
              {previewEntry.description}
            </p>

            <button
              onClick={() => handleViewDetail(previewEntry)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: '#1A1A2E',
                color: '#E0D8C8',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              查看详情 🔍
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailPage: React.FC<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onDelete: (id: string) => void;
}> = ({ state, dispatch, onDelete }) => {
  const entry = state.currentEntry;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const playSpeech = () => {
    if (!entry) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const text = `${SCENT_NAMES[entry.scentType]}。${entry.description}。心情是${EMOTION_NAMES[entry.emotion]}。`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  if (!entry) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1A1A2E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E0D8C8',
        }}
      >
        <p>未找到记录</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A2E',
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <button
        onClick={() => {
          stopSpeech();
          dispatch({ type: 'SET_VIEW', payload: 'calendar' });
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#E0D8C8',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px',
          padding: '8px 0',
        }}
      >
        ← 返回日历
      </button>

      <div
        style={{
          background: EMOTION_GRADIENTS[entry.emotion] || EMOTION_GRADIENTS.calm,
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
              {entry.date}
            </div>
            <h2 style={{ color: '#1A1A2E', fontSize: '24px' }}>
              {SCENT_ICONS[entry.scentType]} {SCENT_NAMES[entry.scentType]}
            </h2>
          </div>
          <span style={{ fontSize: '48px' }}>
            {EMOTION_EMOJIS[entry.emotion]}
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <FlowerCanvas
            petalCount={Math.min(20, entry.description.length)}
            scentType={entry.scentType}
            textDescription={entry.description}
            imageData={entry.imageData}
            bloomProgress={1}
          />
        </div>

        {entry.imageData && (
          <div style={{ marginBottom: '20px' }}>
            <img
              src={entry.imageData}
              alt="气味场景"
              style={{
                width: '100%',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              }}
            />
          </div>
        )}

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              color: '#1A1A2E',
              fontSize: '16px',
              lineHeight: 1.8,
            }}
          >
            {entry.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={isSpeaking ? stopSpeech : playSpeech}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: isSpeaking ? '#FF6B6B' : '#1A1A2E',
              color: '#E0D8C8',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {isSpeaking ? '🔇 停止播放' : '🔊 播放气味描述'}
          </button>

          <button
            onClick={() => {
              stopSpeech();
              onDelete(entry.id);
            }}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              background: '#FF4757',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#2A2A4A',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '12px',
          color: '#888',
        }}
      >
        <p>创建时间: {new Date(entry.createdAt).toLocaleString('zh-CN')}</p>
        <p>更新时间: {new Date(entry.updatedAt).toLocaleString('zh-CN')}</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { saveOffline, loadOffline, deleteOffline, syncStatus, syncWithServer } = useIndexedDB();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const offlineEntries = await loadOffline();
        if (offlineEntries.length > 0) {
          dispatch({ type: 'SET_ENTRIES', payload: offlineEntries });
        }

        if (isOnline) {
          const response = await fetch('/api/entries');
          if (response.ok) {
            const serverEntries: ScentEntry[] = await response.json();
            dispatch({ type: 'SET_ENTRIES', payload: serverEntries });
            for (const entry of serverEntries) {
              await saveOffline(entry);
            }
          }
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: '加载数据失败' });
      }
    };

    initData();
  }, [loadOffline, saveOffline, isOnline]);

  const handleSave = useCallback(async () => {
    if (!state.selectedScentType || !state.description.trim()) return;

    const newEntry: ScentEntry = {
      id: '',
      date: state.selectedDate,
      scentType: state.selectedScentType,
      description: state.description.trim(),
      emotion: state.emotion,
      imageData: state.imageData || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (isOnline) {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });

        if (!response.ok) {
          throw new Error('保存失败');
        }

        const savedEntry: ScentEntry = await response.json();
        dispatch({ type: 'ADD_ENTRY', payload: savedEntry });
        await saveOffline(savedEntry);
      } else {
        const offlineEntry: ScentEntry = {
          ...newEntry,
          id: `offline-${Date.now()}`,
        };
        dispatch({ type: 'ADD_ENTRY', payload: offlineEntry });
        await saveOffline(offlineEntry);
      }

      dispatch({ type: 'RESET_FORM' });
      dispatch({ type: 'SET_VIEW', payload: 'calendar' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: '保存失败，请重试' });
    }
  }, [state, saveOffline, isOnline]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      if (isOnline && !id.startsWith('offline-')) {
        await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      }
      dispatch({ type: 'DELETE_ENTRY', payload: id });
      await deleteOffline(id);
      dispatch({ type: 'SET_VIEW', payload: 'calendar' });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '删除失败' });
    }
  }, [deleteOffline, isOnline]);

  const handleSync = useCallback(() => {
    syncWithServer();
  }, [syncWithServer]);

  useEffect(() => {
    if (isOnline && state.entries.length > 0) {
      handleSync();
    }
  }, [isOnline, state.entries.length, handleSync]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <SyncOverlay syncStatus={syncStatus} />

      {state.error && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FF4757',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 2000,
          }}
        >
          {state.error}
          <button
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            style={{
              marginLeft: '12px',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {state.view !== 'detail' && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            background: '#2A2A4A',
            padding: '8px',
            borderRadius: '30px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            zIndex: 50,
          }}
        >
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'record' })}
            style={{
              padding: '12px 24px',
              borderRadius: '24px',
              border: 'none',
              background: state.view === 'record'
                ? 'linear-gradient(135deg, #FFB6C1, #7CCD7C)'
                : 'transparent',
              color: state.view === 'record' ? '#1A1A2E' : '#E0D8C8',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
          >
            ✏️ 记录
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'calendar' })}
            style={{
              padding: '12px 24px',
              borderRadius: '24px',
              border: 'none',
              background: state.view === 'calendar'
                ? 'linear-gradient(135deg, #FFB6C1, #7CCD7C)'
                : 'transparent',
              color: state.view === 'calendar' ? '#1A1A2E' : '#E0D8C8',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
          >
            📅 花园
          </button>
        </div>
      )}

      {state.view === 'record' && (
        <RecordPage state={state} dispatch={dispatch} onSave={handleSave} />
      )}
      {state.view === 'calendar' && (
        <CalendarPage state={state} dispatch={dispatch} />
      )}
      {state.view === 'detail' && (
        <DetailPage state={state} dispatch={dispatch} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default App;
