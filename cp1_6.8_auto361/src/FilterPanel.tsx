import React, { useCallback } from 'react';

interface FilterPanelProps {
  selectedMonths: Set<number>;
  sentimentRange: [number, number];
  onMonthToggle: (month: number) => void;
  onSentimentChange: (range: [number, number]) => void;
  onReset: () => void;
}

const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedMonths,
  sentimentRange,
  onMonthToggle,
  onSentimentChange,
  onReset,
}) => {
  const handleMinSentiment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSentimentChange([parseFloat(e.target.value), sentimentRange[1]]);
    },
    [sentimentRange, onSentimentChange],
  );

  const handleMaxSentiment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSentimentChange([sentimentRange[0], parseFloat(e.target.value)]);
    },
    [sentimentRange, onSentimentChange],
  );

  const allSelected = selectedMonths.size === 12;
  const noneSelected = selectedMonths.size === 0;

  return (
    <div
      style={{
        width: 220,
        height: '100%',
        padding: '20px 16px',
        background: 'rgba(245, 239, 224, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(180, 165, 140, 0.3)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h3
        style={{
          fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
          fontSize: 18,
          color: '#5a4a3a',
          margin: 0,
          paddingBottom: 8,
          borderBottom: '2px solid rgba(90, 74, 58, 0.2)',
          letterSpacing: 4,
        }}
      >
        筛 选
      </h3>

      <div>
        <div
          style={{
            fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
            fontSize: 13,
            color: '#7a6a5a',
            marginBottom: 8,
            letterSpacing: 2,
          }}
        >
          月 份
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {MONTH_LABELS.map((label, idx) => {
            const month = idx + 1;
            const active = selectedMonths.has(month);
            return (
              <button
                key={month}
                onClick={() => onMonthToggle(month)}
                style={{
                  width: 56,
                  height: 32,
                  border: active ? '1.5px solid #7a6a5a' : '1px solid rgba(180,165,140,0.4)',
                  borderRadius: 16,
                  background: active
                    ? 'rgba(90, 74, 58, 0.15)'
                    : 'rgba(245, 239, 224, 0.3)',
                  color: active ? '#5a4a3a' : '#a09888',
                  fontSize: 12,
                  fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget.style.background = 'rgba(90, 74, 58, 0.08)');
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget.style.background = 'rgba(245, 239, 224, 0.3)');
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
            fontSize: 13,
            color: '#7a6a5a',
            marginBottom: 8,
            letterSpacing: 2,
          }}
        >
          情 感
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#6080a0', fontFamily: "'KaiTi', 'STKaiti', '楷体', serif" }}>悲</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sentimentRange[0]}
              onChange={handleMinSentiment}
              style={{
                flex: 1,
                accentColor: '#7a6a5a',
                height: 4,
              }}
            />
            <span style={{ fontSize: 11, color: '#c08060', fontFamily: "'KaiTi', 'STKaiti', '楷体', serif" }}>喜</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: '#a09888',
              fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
            }}
          >
            <span>最低 {sentimentRange[0].toFixed(1)}</span>
            <span>最高 {sentimentRange[1].toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#6080a0', fontFamily: "'KaiTi', 'STKaiti', '楷体', serif" }}>悲</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sentimentRange[1]}
              onChange={handleMaxSentiment}
              style={{
                flex: 1,
                accentColor: '#7a6a5a',
                height: 4,
              }}
            />
            <span style={{ fontSize: 11, color: '#c08060', fontFamily: "'KaiTi', 'STKaiti', '楷体', serif" }}>喜</span>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '2px solid #8a3a2a',
          background: 'rgba(140, 58, 42, 0.08)',
          color: '#8a3a2a',
          fontSize: 14,
          fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
          cursor: 'pointer',
          alignSelf: 'center',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(140, 58, 42, 0.18)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(140, 58, 42, 0.08)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        重 置
      </button>

      <div
        style={{
          fontSize: 11,
          color: '#b0a898',
          fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
          textAlign: 'center',
          marginTop: 'auto',
          lineHeight: 1.8,
        }}
      >
        {allSelected ? '显示全部月份' : noneSelected ? '未选择月份' : `已选 ${selectedMonths.size} 个月份`}
      </div>
    </div>
  );
};

export default React.memo(FilterPanel);
