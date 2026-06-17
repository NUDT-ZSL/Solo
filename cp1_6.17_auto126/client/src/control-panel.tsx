import React from 'react';

interface ControlPanelProps {
  open: boolean;
  onToggle: () => void;
  showBikeLayer: boolean;
  setShowBikeLayer: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  refreshInterval: 1000 | 3000 | 5000;
  setRefreshInterval: (v: 1000 | 3000 | 5000) => void;
  stats: { total: number; avgBattery: number; highDensityCount: number };
  lowFps: boolean;
}

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  accentColor: '#4CAF50',
  cursor: 'pointer'
};

const labelStyle: React.CSSProperties = {
  color: '#ddd',
  fontSize: 13,
  cursor: 'pointer',
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  transition: 'color 0.2s'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: '#333',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
  transition: 'background 0.2s',
  marginTop: 6
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  open,
  onToggle,
  showBikeLayer,
  setShowBikeLayer,
  showHeatmap,
  setShowHeatmap,
  refreshInterval,
  setRefreshInterval,
  stats,
  lowFps
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: open ? 300 : 16,
          bottom: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#1E1E1E',
          color: '#fff',
          border: '1px solid #444',
          cursor: 'pointer',
          fontSize: 18,
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.3s ease, background 0.2s, transform 0.1s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#555';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#1E1E1E';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
        title={open ? '收起面板' : '展开面板'}
      >
        {open ? '›' : '‹'}
      </button>

      <div
        style={{
          position: 'absolute',
          right: open ? 0 : -300,
          bottom: 0,
          width: 280,
          background: '#1E1E1E',
          borderRadius: '12px 0 0 12px',
          padding: 16,
          zIndex: 1000,
          color: '#fff',
          transition: 'right 0.3s ease',
          maxHeight: '100vh',
          overflowY: 'auto',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.5)',
          borderTop: '1px solid #333',
          borderLeft: '1px solid #333',
          borderBottom: '1px solid #333'
        }}
      >
        <h3
          style={{
            fontSize: 15,
            marginBottom: 14,
            color: '#fff',
            borderBottom: '1px solid #333',
            paddingBottom: 10,
            fontWeight: 600,
            letterSpacing: 0.5
          }}
        >
          ⚙️ 控制面板
        </h3>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              ...labelStyle,
              padding: '6px 8px',
              borderRadius: 6
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <input
              type="checkbox"
              checked={showBikeLayer}
              onChange={(e) => setShowBikeLayer(e.target.checked)}
              style={checkboxStyle}
            />
            <span>显示单车图层</span>
          </div>

          <div
            style={{
              ...labelStyle,
              padding: '6px 8px',
              borderRadius: 6
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              style={checkboxStyle}
            />
            <span>显示路况热力图</span>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#ccc', marginBottom: 4 }}>刷新频率</div>
          <select
            value={refreshInterval}
            onChange={(e) =>
              setRefreshInterval(parseInt(e.target.value) as 1000 | 3000 | 5000)
            }
            style={selectStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#444';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#333';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <option value={1000}>1 秒</option>
            <option value={3000}>3 秒</option>
            <option value={5000}>5 秒</option>
          </select>
        </div>

        <div
          style={{
            borderTop: '1px solid #333',
            paddingTop: 14,
            marginBottom: 10
          }}
        >
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10, fontWeight: 600 }}>
            📊 实时统计
          </div>
          <div
            style={{
              background: '#2a2a2a',
              borderRadius: 8,
              padding: 12
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <span style={{ fontSize: 12, color: '#999' }}>在线单车</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#4CAF50' }}>
                {stats.total}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <span style={{ fontSize: 12, color: '#999' }}>平均电量</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color:
                    stats.avgBattery >= 70
                      ? '#00FF00'
                      : stats.avgBattery >= 40
                      ? '#FFA500'
                      : '#FF0000'
                }}
              >
                {stats.avgBattery}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: 12, color: '#999' }}>高密度区域</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FF6B6B' }}>
                {stats.highDensityCount}
              </span>
            </div>
          </div>
        </div>

        {lowFps && (
          <div
            style={{
              marginTop: 12,
              background: '#ff444422',
              border: '1px solid #ff4444',
              color: '#ff6b6b',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            ⚠️ 性能下降，建议降低刷新频率
          </div>
        )}
      </div>

      <style>{`
        select option {
          background: #2a2a2a;
          color: #fff;
        }
      `}</style>
    </>
  );
};

export default ControlPanel;
