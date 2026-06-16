import React from 'react';

interface ControlPanelProps {
  month: number;
  day: number;
  hour: number;
  buildings: Array<{ id: string; number: number; height: number }>;
  selectedBuildingId: string | null;
  onMonthChange: (m: number) => void;
  onDayChange: (d: number) => void;
  onHourChange: (h: number) => void;
  onBuildingSelect: (id: string) => void;
  onSunReport: () => void;
  showSunReport: boolean;
}

const sliderStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  outline: 'none',
  cursor: 'pointer',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  month, day, hour, buildings, selectedBuildingId,
  onMonthChange, onDayChange, onHourChange, onBuildingSelect, onSunReport, showSunReport,
}) => {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = daysInMonth[month - 1] || 31;
  const dayOfYear = daysInMonth.slice(0, month - 1).reduce((a, b) => a + b, 0) + day;
  const dateStr = `${month}月${day}日`;

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      width: 240,
      background: 'rgba(30,41,59,0.85)',
      borderRadius: 12,
      padding: 20,
      color: '#f8fafc',
      fontSize: 14,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      backdropFilter: 'blur(8px)',
      maxHeight: 'calc(90vh - 32px)',
      overflowY: 'auto',
    }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, letterSpacing: '0.5px' }}>
        日照模拟控制
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, color: '#f8fafc' }}>
          日期: {dateStr}
        </label>
        <input
          type="range"
          min={1}
          max={365}
          value={dayOfYear}
          onChange={e => {
            const doy = parseInt(e.target.value);
            let m = 1, d = doy;
            for (let i = 0; i < daysInMonth.length; i++) {
              if (d <= daysInMonth[i]) {
                m = i + 1;
                break;
              }
              d -= daysInMonth[i];
            }
            onMonthChange(m);
            onDayChange(Math.min(d, daysInMonth[m - 1]));
          }}
          style={{
            ...sliderStyle,
            background: `linear-gradient(to right, #3b82f6 ${(dayOfYear / 365) * 100}%, #334155 ${(dayOfYear / 365) * 100}%)`,
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
          }
        `}</style>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, color: '#f8fafc' }}>
          时间: {hour.toFixed(1)}:00
        </label>
        <input
          type="range"
          min={6}
          max={18}
          step={0.5}
          value={hour}
          onChange={e => onHourChange(parseFloat(e.target.value))}
          style={{
            ...sliderStyle,
            background: `linear-gradient(to right, #f59e0b ${((hour - 6) / 12) * 100}%, #334155 ${((hour - 6) / 12) * 100}%)`,
          }}
        />
        <style>{`
          input[type=range]:last-of-type::-webkit-slider-thumb {
            background: #f59e0b !important;
          }
        `}</style>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, color: '#f8fafc' }}>
          选择建筑
        </label>
        <select
          value={selectedBuildingId || ''}
          onChange={e => onBuildingSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: 14,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">-- 请选择 --</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>
              建筑 #{b.number} (高度 {b.height})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onSunReport}
        style={{
          width: 160,
          height: 40,
          borderRadius: 8,
          border: 'none',
          background: showSunReport ? '#2563eb' : '#3b82f6',
          color: '#f8fafc',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s',
          alignSelf: 'center',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
        onMouseLeave={e => (e.currentTarget.style.background = showSunReport ? '#2563eb' : '#3b82f6')}
      >
        {showSunReport ? '隐藏日照报告' : '日照报告'}
      </button>

      {selectedBuildingId && (
        <div style={{
          padding: '8px 10px',
          background: 'rgba(59,130,246,0.15)',
          borderRadius: 6,
          border: '1px solid rgba(59,130,246,0.3)',
          fontSize: 12,
          color: '#93c5fd',
        }}>
          💡 点击3D场景中的建筑可选中并查看日照详情
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
