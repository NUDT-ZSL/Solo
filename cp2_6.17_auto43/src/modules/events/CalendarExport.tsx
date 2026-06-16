import React from 'react';
import type { Event } from '@/types';
import { downloadICS } from '@/utils/ics';

interface CalendarExportProps {
  event: Event;
}

const CalendarExport: React.FC<CalendarExportProps> = ({ event }) => {
  const handleExport = () => {
    downloadICS(event);
  };

  return (
    <button
      onClick={handleExport}
      style={{
        width: '100%',
        height: '40px',
        borderRadius: '8px',
        background: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.2s ease-out'
      }}
      onMouseEnter={e => ((e.target as HTMLElement).style.background = '#2563eb')}
      onMouseLeave={e => ((e.target as HTMLElement).style.background = '#3b82f6')}
    >
      导出日历
    </button>
  );
};

export default CalendarExport;
