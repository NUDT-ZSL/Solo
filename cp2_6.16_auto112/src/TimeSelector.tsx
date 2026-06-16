import React from 'react';
import type { DayType } from './types';

interface TimeSelectorProps {
  dayType: DayType;
  hour: number;
  onDayTypeChange: (dayType: DayType) => void;
  onHourChange: (hour: number) => void;
  width: number;
}

function formatHour(hour: number): string {
  if (hour === 0) return '凌晨0点';
  if (hour < 12) return `上午${hour}点`;
  if (hour === 12) return '中午12点';
  if (hour < 18) return `下午${hour - 12}点`;
  return `晚上${hour - 12}点`;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  dayType,
  hour,
  onDayTypeChange,
  onHourChange,
  width
}) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: '0 10px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderRadius: 10,
          backgroundColor: '#0f172a',
          padding: 4
        }}
      >
        <button
          onClick={() => onDayTypeChange('weekday')}
          style={{
            minWidth: 88,
            minHeight: 44,
            padding: '0 24px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.3s ease',
            backgroundColor: dayType === 'weekday' ? '#3b82f6' : '#1f2937',
            color: dayType === 'weekday' ? '#ffffff' : '#9ca3af'
          }}
        >
          工作日
        </button>
        <button
          onClick={() => onDayTypeChange('weekend')}
          style={{
            minWidth: 88,
            minHeight: 44,
            padding: '0 24px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.3s ease',
            backgroundColor: dayType === 'weekend' ? '#3b82f6' : '#1f2937',
            color: dayType === 'weekend' ? '#ffffff' : '#9ca3af'
          }}
        >
          周末
        </button>
      </div>

      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#e5e7eb',
            fontWeight: 500
          }}
        >
          {formatHour(hour)}
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 44,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 8,
              backgroundColor: '#374151',
              borderRadius: 4
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${(hour / 23) * 100}%`,
              height: 8,
              backgroundColor: '#3b82f6',
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }}
          />
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={hour}
            onChange={(e) => onHourChange(Number(e.target.value))}
            style={{
              position: 'absolute',
              width: '100%',
              height: 44,
              margin: 0,
              padding: 0,
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${(hour / 23) * 100}% - 14px)`,
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              border: '3px solid #3b82f6',
              transition: 'left 0.3s ease',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: 11,
            color: '#6b7280'
          }}
        >
          <span>0点</span>
          <span>6点</span>
          <span>12点</span>
          <span>18点</span>
          <span>23点</span>
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
