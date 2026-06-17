import { useState } from 'react';
import dayjs from 'dayjs';

interface Props {
  onChange?: (range: { start: string; end: string } | null) => void;
}

const presets = [
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
];

export default function DateSelector({ onChange }: Props) {
  const [start, setStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [end, setEnd] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [activePreset, setActivePreset] = useState<string>('all');

  const applyPreset = (value: string) => {
    setActivePreset(value);
    let startDate = '';
    let endDate = '';

    if (value === 'all') {
      onChange?.(null);
      return;
    } else if (value === 'today') {
      startDate = endDate = dayjs().format('YYYY-MM-DD');
    } else if (value === 'week') {
      startDate = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
      endDate = dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD');
    } else if (value === 'month') {
      startDate = dayjs().startOf('month').format('YYYY-MM-DD');
      endDate = dayjs().endOf('month').format('YYYY-MM-DD');
    }

    setStart(startDate);
    setEnd(endDate);
    onChange?.({ start: startDate, end: endDate });
  };

  const handleCustomRange = () => {
    setActivePreset('custom');
    onChange?.({ start, end });
  };

  return (
    <div className="date-selector">
      <div className="preset-buttons">
        {presets.map((p) => (
          <button
            key={p.value}
            className={`preset-btn ${activePreset === p.value ? 'active' : ''}`}
            onClick={() => applyPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <span className="range-sep">至</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button className="apply-btn" onClick={handleCustomRange}>
          应用
        </button>
      </div>
    </div>
  );
}
