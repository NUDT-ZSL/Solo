import { useState, useMemo } from 'react';
import FlowerCanvas from '../components/FlowerCanvas';
import type { ScentEntry, EmotionType } from '../types';
import { SCENT_COLORS, EMOTION_GRADIENTS, EMOTION_EMOJIS, EMOTION_LABELS, SCENT_LABELS } from '../types';

interface CalendarPageProps {
  entries: ScentEntry[];
  onNavigate: (path: string) => void;
  onSpeak: (text: string) => void;
}

const CalendarPage = ({ entries, onNavigate, onSpeak }: CalendarPageProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthlyEntries = useMemo(() => {
    const grouped: Record<string, ScentEntry[]> = {};

    entries.forEach((entry) => {
      const monthKey = entry.date.substring(0, 7);
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(entry);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, monthEntries]) => ({ month, entries: monthEntries }));
  }, [entries]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const selectedEntry = selectedDate
    ? entries.find((e) => e.date === selectedDate)
    : null;

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  const getDominantEmotion = (dayEntries: ScentEntry[]): EmotionType => {
    const counts: Record<string, number> = {};
    dayEntries.forEach((e) => {
      counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    });
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionType) || 'happy';
  };

  const renderMonthCard = (monthKey: string, monthEntries: ScentEntry[]) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const entriesByDay: Record<number, ScentEntry[]> = {};
    monthEntries.forEach((entry) => {
      const day = parseInt(entry.date.split('-')[2]);
      if (!entriesByDay[day]) {
        entriesByDay[day] = [];
      }
      entriesByDay[day].push(entry);
    });

    return (
      <div
        key={monthKey}
        style={{
          background: 'rgba(255, 248, 220, 0.9)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          color: '#5D4E37',
        }}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          {formatMonth(monthKey)}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
          }}
        >
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#8B7355',
                padding: '4px',
              }}
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} style={{ padding: '4px' }} />;
            }

            const dayEntries = entriesByDay[day] || [];
            const hasEntry = dayEntries.length > 0;
            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
            const dotColor = hasEntry ? SCENT_COLORS[dayEntries[0].scentType] : 'transparent';

            return (
              <button
                key={day}
                onClick={() => hasEntry && setSelectedDate(dateStr)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: hasEntry ? dotColor : 'transparent',
                  color: hasEntry ? '#fff' : '#8B7355',
                  fontSize: '13px',
                  cursor: hasEntry ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: hasEntry ? 600 : 400,
                  boxShadow: hasEntry ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  transition: 'transform 0.2s',
                  transform: selectedDate === dateStr ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1A1A2E',
        color: '#E0D8C8',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(224, 216, 200, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>气味花园</h1>
        <button
          onClick={() => onNavigate('/record')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(224, 216, 200, 0.3)',
            background: 'transparent',
            color: '#E0D8C8',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ✏️ 记录
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {monthlyEntries.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: '#6B6B7A',
            }}
          >
            <div style={{ fontSize: '48px' }}>🌸</div>
            <div style={{ fontSize: '16px' }}>还没有记录，去记录第一朵气味花吧</div>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              paddingLeft: '20px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '6px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(180deg, #FFB6C1 0%, #7CCD7C 50%, #6B7B8D 100%)',
                borderRadius: '1px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {monthlyEntries.map(({ month, entries: monthEntries }) => (
                <div key={month} style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-26px',
                      top: '24px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#FFB6C1',
                      border: '2px solid #1A1A2E',
                    }}
                  />
                  {renderMonthCard(month, monthEntries)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedDate && selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, ${EMOTION_GRADIENTS[selectedEntry.emotion][0]} 0%, ${EMOTION_GRADIENTS[selectedEntry.emotion][1]} 100%)`,
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              color: '#5D4E37',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                  {selectedDate}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {SCENT_LABELS[selectedEntry.scentType]}
                </div>
              </div>
              <div style={{ fontSize: '32px' }}>
                {EMOTION_EMOJIS[selectedEntry.emotion]}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <FlowerCanvas
                petalCount={Math.min(selectedEntry.description.length, 20)}
                baseColor={selectedEntry.scentType}
                textDescription={selectedEntry.description}
                imageData={selectedEntry.imageData}
                size={180}
                isBloomed={true}
                bloomProgress={1}
              />
            </div>

            {selectedEntry.imageData && (
              <img
                src={selectedEntry.imageData}
                alt="气味图片"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  maxHeight: '200px',
                  objectFit: 'cover',
                }}
              />
            )}

            <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
              {selectedEntry.description}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => onSpeak(selectedEntry.description)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.8)',
                  color: '#5D4E37',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔊 播放语音
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(93, 78, 55, 0.8)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
