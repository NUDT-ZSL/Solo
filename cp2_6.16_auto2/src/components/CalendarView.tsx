import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Photo, MOOD_COLORS, getAllPhotos } from '../services/dataService';

const MOOD_LABEL_MAP: Record<string, string> = {
  happy: '开心',
  calm: '平静',
  sad: '忧伤',
  angry: '生气',
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllPhotos();
        setPhotos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, []);

  const today = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const photoMap = useMemo(() => {
    const map = new Map<string, Photo>();
    photos.forEach((p) => map.set(p.date, p));
    return map;
  }, [photos]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleCellClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    setAnimatingCell(dateKey);
    setTimeout(() => {
      navigate(`/photo/${dateKey}`);
    }, 150);
  };

  const goPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  return (
    <div className="min-h-screen w-full py-8 px-4" style={{ backgroundColor: '#fdfaf6' }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .calendar-cell {
          animation: fadeInUp 0.3s ease-out forwards;
          opacity: 0;
        }
        .calendar-cell-animate {
          animation: fadeInUp 0.3s ease-out !important;
        }
        .mood-dot {
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .today-ring {
          box-shadow: 0 0 0 3px rgba(134, 239, 172, 0.4), inset 0 0 0 2px #86efac;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }
        .calendar-grid-mobile {
          gap: 6px;
        }
        .calendar-cell-btn {
          width: 100%;
          aspect-ratio: 1;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          will-change: transform, opacity;
        }
        .calendar-cell-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        @media (max-width: 840px) {
          .calendar-grid {
            gap: 8px;
          }
        }
        @media (max-width: 640px) {
          .calendar-grid {
            gap: 4px;
          }
          .calendar-cell-btn {
            border-radius: 6px !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: '#4a3a2a', letterSpacing: '0.02em' }}
          >
            🌱 植物生长日记
          </h1>
          <p className="text-sm" style={{ color: '#8b7355' }}>
            记录每一天的成长，见证生命的美好
          </p>
        </header>

        <div
          className="flex items-center justify-between mb-6 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#faf5ef', border: '1px solid #e4d5c0' }}
        >
          <button
            onClick={goPrevMonth}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ color: '#6b5a47' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0e6d8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronLeft size={24} />
          </button>

          <h2 className="text-xl font-semibold" style={{ color: '#4a3a2a' }}>
            {monthLabel}
          </h2>

          <button
            onClick={goNextMonth}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ color: '#6b5a47' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0e6d8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin mr-2" size={28} style={{ color: '#8b7355' }} />
            <span style={{ color: '#8b7355' }}>加载中...</span>
          </div>
        )}

        {error && (
          <div
            className="text-center py-12 rounded-xl"
            style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="calendar-grid mb-3">
              {weekdays.map((w) => (
                <div
                  key={w}
                  className="text-center text-sm font-medium py-2"
                  style={{ color: '#8b7355' }}
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {daysInMonth.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} />;
                }
                const dateKey = formatDateKey(date);
                const photo = photoMap.get(dateKey);
                const isToday = dateKey === today;
                const isAnimating = animatingCell === dateKey;

                return (
                  <button
                    key={dateKey}
                    onClick={() => handleCellClick(date)}
                    className={`calendar-cell calendar-cell-btn ${
                      isAnimating ? 'calendar-cell-animate' : ''
                    }`}
                    style={{
                      backgroundColor: photo ? '#f5ece0' : '#faf5ef',
                      borderRadius: '8px',
                      border: `1px solid ${photo ? '#d4c4a8' : '#e4d5c0'}`,
                      padding: '10px',
                      animationDelay: `${Math.min(idx * 15, 300)}ms`,
                    }}
                  >
                    {isToday && (
                      <div
                        className="absolute inset-1 today-ring pointer-events-none"
                        style={{ borderRadius: '6px' }}
                      />
                    )}

                    <span
                      className="block text-left font-semibold"
                      style={{
                        fontSize: 'clamp(12px, 2vw, 16px)',
                        color: isToday ? '#16a34a' : '#4a3a2a',
                      }}
                    >
                      {date.getDate()}
                    </span>

                    {photo && (
                      <div
                        className="mood-dot absolute"
                        style={{
                          left: '10px',
                          bottom: '10px',
                          width: 'clamp(8px, 1.5vw, 10px)',
                          height: 'clamp(8px, 1.5vw, 10px)',
                          borderRadius: '50%',
                          backgroundColor: MOOD_COLORS[photo.mood],
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                <div key={mood} className="flex items-center gap-2">
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: color,
                    }}
                  />
                  <span className="text-sm" style={{ color: '#6b5a47' }}>
                    {MOOD_LABEL_MAP[mood] || mood}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
