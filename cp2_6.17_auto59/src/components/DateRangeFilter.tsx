import React from 'react';
import { format, subDays } from 'date-fns';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

const presetOptions = [
  { label: '过去7天', days: 7 },
  { label: '过去30天', days: 30 },
];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const handlePreset = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}
    >
      <span style={{ fontSize: 14, color: '#757575', fontWeight: 500 }}>日期范围：</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {presetOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handlePreset(opt.days)}
            style={{
              padding: '7px 16px',
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              fontSize: 13,
              color: '#212121',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#bdbdbd';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0';
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          style={{
            padding: '7px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            background: '#fff',
          }}
        />
        <span style={{ color: '#757575' }}>至</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          style={{
            padding: '7px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            background: '#fff',
          }}
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
