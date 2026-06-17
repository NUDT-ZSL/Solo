import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

export interface DateRange {
  start: string;
  end: string;
}

interface DateSelectorProps {
  onChange: (range: DateRange) => void;
}

export default function DateSelector({ onChange }: DateSelectorProps) {
  const today = dayjs().format('YYYY-MM-DD');
  const weekAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD');

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    onChange({ start: startDate, end: endDate });
  }, [startDate, endDate, onChange]);

  return (
    <div className="date-selector">
      <label>日期范围:</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        max={endDate}
      />
      <span>至</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        min={startDate}
      />
    </div>
  );
}
