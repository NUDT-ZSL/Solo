import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { scheduleApi } from '../utils/api';
import type { ScheduleItem, Room } from '../types';

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getDayName = (dateStr: string) => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `周${days[new Date(dateStr).getDay()]}`;
};

const isWeekend = (dateStr: string) => {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

const SchedulePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    dates: string[];
    rooms: Room[];
    schedule: Record<string, ScheduleItem[]>;
  } | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const result = await scheduleApi.getBoard(14);
      setData(result);
    } catch (err) {
      console.error('加载日程失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newOffset = direction === 'left' 
        ? Math.max(0, scrollOffset - scrollAmount)
        : scrollOffset + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newOffset,
        behavior: 'smooth',
      });
      setScrollOffset(newOffset);
    }
  };

  const scheduleItems = useMemo(() => {
    if (!data) return [];
    return data.rooms.map(room => {
      const roomSchedule = data.schedule[room.id] || [];
      return {
        room,
        items: roomSchedule,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px', borderRadius: '8px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '500px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: '32px 24px' }}>加载失败</div>;
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={28} style={{ color: 'var(--color-primary)' }} />
            日程看板
          </h1>
          <p style={{ color: 'var(--color-text-light)', marginTop: '4px', fontSize: '0.95rem' }}>
            未来14天房间入住情况
          </p>
        </div>
        <Link to="/booking" className="btn btn-primary">
          <Plus size={18} />
          新增预订
        </Link>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
        }}
        className="fade-in"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-alt)',
          }}
        >
          <button
            onClick={() => handleScroll('left')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', marginRight: '12px' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div
            ref={scrollContainerRef}
            style={{
              flex: 1,
              overflowX: 'auto',
              display: 'flex',
              gap: '0',
              scrollbarWidth: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                minWidth: 'max-content',
              }}
            >
              <div
                style={{
                  width: '140px',
                  flexShrink: 0,
                  padding: '8px',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  color: 'var(--color-text-light)',
                }}
              >
                房间
              </div>
              {data.dates.map((date, index) => (
                <div
                  key={date}
                  style={{
                    width: '80px',
                    flexShrink: 0,
                    padding: '8px',
                    textAlign: 'center',
                    fontWeight: '500',
                    fontSize: '0.85rem',
                    color: isWeekend(date) ? 'var(--color-warning)' : 'var(--color-text)',
                    borderLeft: index > 0 ? '1px solid var(--color-border)' : 'none',
                    background: index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  }}
                >
                  <div>{formatDateShort(date)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{getDayName(date)}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleScroll('right')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', marginLeft: '12px' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          style={{
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {scheduleItems.map(({ room, items }) => (
            <div
              key={room.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderBottom: '1px solid var(--color-border)',
                minHeight: '56px',
              }}
            >
              <div
                style={{
                  width: '140px',
                  flexShrink: 0,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: 'var(--color-bg-alt)',
                  borderRight: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{room.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                  {room.area}㎡ · ¥{room.weekdayPrice}起
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  position: 'relative',
                  minWidth: data.dates.length * 80 + 'px',
                }}
              >
                {data.dates.map((date, dateIndex) => {
                  const dateItems = items.filter(item => item.date === date);
                  return (
                    <div
                      key={date}
                      style={{
                        width: '80px',
                        flexShrink: 0,
                        position: 'relative',
                        padding: '4px',
                        borderLeft: dateIndex > 0 ? '1px solid var(--color-border)' : 'none',
                        background: dateIndex % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                      }}
                    >
                      {dateItems.map(item => {
                        const petInitials = item.petNames
                          .map(name => name.charAt(0))
                          .join('');
                        return (
                          <Link
                            key={item.bookingId}
                            to={`/order/${item.bookingId}`}
                            style={{
                              display: 'block',
                              padding: '6px 8px',
                              margin: '2px',
                              borderRadius: '4px',
                              background: item.isConflict ? 'var(--color-danger)' : 'var(--color-success)',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              textDecoration: 'none',
                              textAlign: 'center',
                              transition: 'transform 0.2s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={`${item.petNames.join('、')} - ${date}`}
                          >
                            {petInitials}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-alt)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--color-success)',
              }}
            />
            <span>已预订</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--color-danger)',
              }}
            />
            <span>预订冲突</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'white',
                border: '1px solid var(--color-border)',
              }}
            />
            <span>空房</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
