import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MoodRecord, MoodStats } from '../types';
import { MOOD_EMOJIS, MOOD_COLORS } from '../types';
import { formatDateDisplay, isToday } from '../utils/dateUtils';
import { hexToRgba } from '../utils/moodColors';
import MoodShape from './MoodShape';
import StatsRing from './StatsRing';

interface TimelineProps {
  dateRange: string[];
  moodRecords: MoodRecord[];
  stats: MoodStats;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectCapsule: (record: MoodRecord) => void;
  canGoNext: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  dateRange,
  moodRecords,
  stats,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectCapsule,
  canGoNext,
}) => {
  const moodsByDate = useMemo(() => {
    const map: Record<string, MoodRecord[]> = {};
    for (const rec of moodRecords) {
      if (!map[rec.date]) map[rec.date] = [];
      map[rec.date].push(rec);
    }
    return map;
  }, [moodRecords]);

  const containsToday = dateRange.some((d) => isToday(d));

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        animation: 'float-in 0.8s ease-out 0.1s both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 1400,
          padding: '0 60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: 0.02,
            }}
          >
            情绪河流
          </h2>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              padding: '3px 10px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 20,
            }}
          >
            {dateRange.length} 天
          </span>
          {!containsToday && (
            <button
              onClick={onToday}
              style={{
                fontSize: 12,
                color: 'var(--mood-happy)',
                padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${hexToRgba('#FFD700', 0.3)}`,
                background: hexToRgba('#FFD700', 0.08),
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hexToRgba('#FFD700', 0.18);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = hexToRgba('#FFD700', 0.08);
              }}
            >
              回到今天
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {containsToday && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                background: 'var(--bg-card)',
                borderRadius: 14,
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              >
                近7天
              </span>
              <StatsRing stats={stats} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NavButton onClick={onPrevWeek} direction="prev" />
            <NavButton onClick={onNextWeek} direction="next" disabled={!canGoNext} />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1400,
          padding: '0 60px',
          overflowX: 'auto',
          overflowY: 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 18,
            padding: '10px 4px 24px',
            minWidth: 'max-content',
          }}
        >
          {dateRange.map((date, idx) => {
            const dayMoods = moodsByDate[date] || [];
            const latestMood = dayMoods.length > 0 ? dayMoods[dayMoods.length - 1] : null;
            const today = isToday(date);

            return (
              <DateCardSlot
                key={date}
                date={date}
                index={idx}
                isToday={today}
                record={latestMood}
                totalCount={dayMoods.length}
                onClick={() => latestMood && onSelectCapsule(latestMood)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface NavButtonProps {
  onClick: () => void;
  direction: 'prev' | 'next';
  disabled?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, direction, disabled }) => {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? '上一周' : '下一周'}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)',
        color: disabled ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
        transition: 'all 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
    >
      <Icon size={18} strokeWidth={2.2} />
    </button>
  );
};

interface DateCardSlotProps {
  date: string;
  index: number;
  isToday: boolean;
  record: MoodRecord | null;
  totalCount: number;
  onClick: () => void;
}

const DateCardSlot: React.FC<DateCardSlotProps> = ({
  date,
  index,
  isToday,
  record,
  totalCount,
  onClick,
}) => {
  return (
    <div
      data-date-slot={date}
      onClick={record ? onClick : undefined}
      style={{
        width: 'var(--card-slot-width)',
        height: 'var(--card-slot-height)',
        position: 'relative',
        flexShrink: 0,
        animation: `float-in 0.5s ease-out ${0.06 * index}s both`,
        cursor: record ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -22,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: isToday ? 'var(--mood-happy)' : 'var(--text-secondary)',
          }}
        >
          {formatDateDisplay(date)}
        </span>
        {isToday && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: hexToRgba('#FFD700', 0.18),
              color: 'var(--mood-happy)',
              fontWeight: 600,
            }}
          >
            今天
          </span>
        )}
      </div>

      {record ? (
        <CapsuleBadge record={record} totalCount={totalCount} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 16,
            border: '1.5px dashed rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 3,
            }}
          >
            留 白
          </span>
        </div>
      )}
    </div>
  );
};

interface CapsuleBadgeProps {
  record: MoodRecord;
  totalCount: number;
}

const CapsuleBadge: React.FC<CapsuleBadgeProps> = ({ record, totalCount }) => {
  const color = MOOD_COLORS[record.mood];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 16,
        background: 'var(--bg-card)',
        border: `1px solid ${hexToRgba(color, 0.35)}`,
        boxShadow: `0 6px 20px ${hexToRgba(color, 0.15)}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 8px',
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
        e.currentTarget.style.boxShadow = `0 14px 32px ${hexToRgba(color, 0.28)}, inset 0 1px 0 rgba(255,255,255,0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 6px 20px ${hexToRgba(color, 0.15)}, inset 0 1px 0 rgba(255,255,255,0.06)`;
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>
          {MOOD_EMOJIS[record.mood]}
        </span>
        {totalCount > 1 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 10,
              background: hexToRgba(color, 0.2),
              color,
            }}
          >
            ×{totalCount}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoodShape shape={record.shape} mood={record.mood} size={44} />
      </div>

      <span
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.5,
        }}
      >
        {record.time}
      </span>
    </div>
  );
};

export default Timeline;
