import { useRef, useState } from 'react';
import type { ActivityWordPoint } from '../../shared/types';

interface Props {
  data: ActivityWordPoint[];
  height?: number;
}

const BarChart = ({ data, height = 280 }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9E9E9E', fontSize: 14 }}>
        暂无活跃度数据
      </div>
    );
  }

  const padding = { top: 28, right: 20, bottom: 48, left: 56 };
  const chartW = 600 - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map((d) => d.words), 100);
  const niceMax = Math.ceil(maxVal / 100) * 100;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const barW = chartW / data.length;

  const handleMouseMove = (e: React.MouseEvent, idx: number) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTooltipPos({ x, y });
    }
    setHoverIdx(idx);
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 600 ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64B5F6" />
            <stop offset="100%" stopColor="#1E88E5" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => {
          const y = padding.top + chartH * (1 - t);
          const val = Math.round(niceMax * t);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={600 - padding.right}
                y1={y}
                y2={y}
                stroke="#F0F0F0"
                strokeDasharray={i === 0 ? '0' : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#9E9E9E"
              >
                {val}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barX = padding.left + barW * i + barW * 0.18;
          const barWidth = barW * 0.64;
          const barHeight = (chartH * d.words) / niceMax;
          const barY = padding.top + chartH - barHeight;

          return (
            <g key={i}>
              <rect
                x={padding.left + barW * i}
                y={padding.top}
                width={barW}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseMove={(e) => handleMouseMove(e, i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill="url(#barGradientBlue)"
                style={{
                  transition: 'all 0.2s ease',
                  opacity: hoverIdx === i ? 1 : 0.88,
                  transform: hoverIdx === i ? 'translateY(-2px)' : 'translateY(0)',
                  transformOrigin: 'bottom',
                }}
              />
              <text
                x={padding.left + barW * i + barW / 2}
                y={height - padding.bottom + 22}
                textAnchor="middle"
                fontSize="11"
                fill={hoverIdx === i ? '#1976D2' : '#757575'}
                fontWeight={hoverIdx === i ? 600 : 400}
                style={{ transition: 'all 0.15s ease' }}
              >
                {formatDate(d.date)}
              </text>
              {hoverIdx === i && (
                <text
                  x={padding.left + barW * i + barW / 2}
                  y={barY - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1976D2"
                  fontWeight={600}
                >
                  {d.words}字
                </text>
              )}
            </g>
          );
        })}

        <text
          x={padding.left - 40}
          y={padding.top - 10}
          textAnchor="start"
          fontSize="11"
          fill="#9E9E9E"
        >
          字数
        </text>
      </svg>

      {hoverIdx !== null && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#212121',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
            {data[hoverIdx].words} 字
          </div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{data[hoverIdx].date}</div>
        </div>
      )}
    </div>
  );
};

export default BarChart;
