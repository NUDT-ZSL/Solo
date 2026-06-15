import React, { useState, useMemo, useEffect } from 'react';
import { Building, useScene, SunReport } from '../App';

interface BuildingInfoModalProps {
  building: Building;
}

const BuildingInfoModal: React.FC<BuildingInfoModalProps> = ({ building }) => {
  const {
    setModalBuildingId,
    updateBuilding,
    calculateShadowRatio,
    generateSunReport,
  } = useScene();

  const [localWidth, setLocalWidth] = useState(building.width);
  const [localDepth, setLocalDepth] = useState(building.depth);
  const [localHeight, setLocalHeight] = useState(building.height);
  const [localColor, setLocalColor] = useState(building.color);
  const [showReport, setShowReport] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const currentShadowRatio = useMemo(
    () => calculateShadowRatio(building.id),
    [building.id, calculateShadowRatio]
  );

  const volume = useMemo(
    () => localWidth * localDepth * localHeight,
    [localWidth, localDepth, localHeight]
  );

  const shadowArea = useMemo(() => {
    const totalArea = 40 * 40;
    return totalArea * currentShadowRatio;
  }, [currentShadowRatio]);

  const sunReport = useMemo<SunReport | null>(() => {
    if (!showReport) return null;
    return generateSunReport(building.id);
  }, [showReport, building.id, generateSunReport]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setModalBuildingId(null), 250);
  };

  const handleApply = () => {
    updateBuilding(building.id, {
      width: parseFloat(String(localWidth)) || 2,
      depth: parseFloat(String(localDepth)) || 2,
      height: parseFloat(String(localHeight)) || 3,
      color: localColor,
    });
  };

  const BarChart = ({ data, title }: { data: Array<{ hour: number; shadowRatio: number }>; title: string }) => {
    const chartWidth = 360;
    const chartHeight = 140;
    const barGap = 4;
    const padding = { top: 20, right: 10, bottom: 24, left: 36 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const barWidth = innerWidth / data.length - barGap;

    const formatHour = (h: number) => {
      if (h < 10) return `0${h}`;
      return `${h}`;
    };

    const maxValue = 1;

    const gradientId = `gradient-${title.replace(/\s/g, '')}`;

    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
          {title}
        </div>
        <svg width={chartWidth} height={chartHeight} style={{ background: '#f8fafc', borderRadius: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((val, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={padding.top + innerHeight * (1 - val)}
                x2={chartWidth - padding.right}
                y2={padding.top + innerHeight * (1 - val)}
                stroke="#e2e8f0"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 6}
                y={padding.top + innerHeight * (1 - val) + 4}
                fontSize="10"
                fill="#94a3b8"
                textAnchor="end"
              >
                {Math.round(val * 100)}%
              </text>
            </g>
          ))}

          {data.map((item, index) => {
            const barHeight = Math.max(1, innerHeight * (item.shadowRatio / maxValue));
            const x = padding.left + index * (barWidth + barGap);
            const y = padding.top + innerHeight - barHeight;

            return (
              <g key={item.hour}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={`url(#${gradientId})`}
                  rx={2}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding.bottom + 16}
                  fontSize="10"
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {formatHour(item.hour)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: '90vw',
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          padding: 24,
          overflowY: 'auto',
          transform: isVisible ? 'scale(1)' : 'scale(0.85)',
          opacity: isVisible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              🏢 {building.name}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              ID: {building.id.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={infoCardStyle}>
            <div style={infoCardLabelStyle}>底面积</div>
            <div style={infoCardValueStyle}>
              {(building.width * building.depth).toFixed(1)}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}> 单位²</span>
            </div>
          </div>
          <div style={infoCardStyle}>
            <div style={infoCardLabelStyle}>体积</div>
            <div style={infoCardValueStyle}>
              {volume.toFixed(1)}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}> 单位³</span>
            </div>
          </div>
          <div style={{ ...infoCardStyle, gridColumn: 'span 2' }}>
            <div style={infoCardLabelStyle}>当前阴影面积占比</div>
            <div style={{ ...infoCardValueStyle, color: '#3b82f6' }}>
              {(currentShadowRatio * 100).toFixed(1)}%
              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                约 {shadowArea.toFixed(1)} 单位²
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
            尺寸设置
          </div>

          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>宽度</label>
            <input
              type="number"
              value={localWidth}
              onChange={(e) => setLocalWidth(parseFloat(e.target.value) || 0)}
              style={fieldInputStyle}
              min="1"
              step="0.5"
            />
            <span style={fieldUnitStyle}>单位</span>
          </div>

          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>深度</label>
            <input
              type="number"
              value={localDepth}
              onChange={(e) => setLocalDepth(parseFloat(e.target.value) || 0)}
              style={fieldInputStyle}
              min="1"
              step="0.5"
            />
            <span style={fieldUnitStyle}>单位</span>
          </div>

          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>高度</label>
            <input
              type="number"
              value={localHeight}
              onChange={(e) => setLocalHeight(parseFloat(e.target.value) || 0)}
              style={fieldInputStyle}
              min="1"
              step="0.5"
            />
            <span style={fieldUnitStyle}>单位</span>
          </div>

          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>颜色</label>
            <input
              type="color"
              value={localColor}
              onChange={(e) => setLocalColor(e.target.value)}
              style={{
                ...fieldInputStyle,
                height: 36,
                padding: 2,
                cursor: 'pointer',
              }}
            />
            <span style={{ ...fieldUnitStyle, fontFamily: 'monospace' }}>
              {localColor}
            </span>
          </div>

          <button
            onClick={handleApply}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#0ea5e9',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 12,
              transition: 'all 0.2s',
            }}
          >
            应用更改
          </button>
        </div>

        <button
          onClick={() => setShowReport(!showReport)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: showReport ? '#e0f2fe' : '#f0f9ff',
            color: '#0284c7',
            border: '1px solid #7dd3fc',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showReport ? '收起日照报告' : '📊 生成日照报告'}
        </button>

        {sunReport && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
              ☀️ 分时阴影面积占比
            </div>

            <BarChart data={sunReport.summerSolstice} title="夏至日 (6月21日)" />
            <BarChart data={sunReport.winterSolstice} title="冬至日 (12月21日)" />

            <div style={{ marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>时刻</th>
                    <th style={thStyle}>夏至阴影比</th>
                    <th style={thStyle}>冬至阴影比</th>
                  </tr>
                </thead>
                <tbody>
                  {sunReport.summerSolstice.map((item, i) => (
                    <tr key={item.hour} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{item.hour}:00</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          width: 50,
                          height: 6,
                          background: '#e0e7ff',
                          borderRadius: 3,
                          marginRight: 8,
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                        }}>
                          <span style={{
                            display: 'block',
                            height: '100%',
                            background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
                            width: `${item.shadowRatio * 100}%`,
                          }} />
                        </span>
                        {(item.shadowRatio * 100).toFixed(1)}%
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          width: 50,
                          height: 6,
                          background: '#e0e7ff',
                          borderRadius: 3,
                          marginRight: 8,
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                        }}>
                          <span style={{
                            display: 'block',
                            height: '100%',
                            background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
                            width: `${sunReport.winterSolstice[i]?.shadowRatio * 100 || 0}%`,
                          }} />
                        </span>
                        {((sunReport.winterSolstice[i]?.shadowRatio || 0) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const infoCardStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: 10,
  padding: '12px 14px',
};

const infoCardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  marginBottom: 4,
};

const infoCardValueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#0f172a',
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#475569',
  width: 48,
  flexShrink: 0,
  fontWeight: 500,
};

const fieldInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  color: '#0f172a',
  fontSize: 13,
  outline: 'none',
};

const fieldUnitStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  width: 40,
  flexShrink: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 4px',
  color: '#64748b',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 4px',
  color: '#334155',
  fontSize: 12,
};

export default BuildingInfoModal;
