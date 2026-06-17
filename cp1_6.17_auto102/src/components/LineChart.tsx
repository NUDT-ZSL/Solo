import { useState } from 'react';
import type { TrendPoint } from '../../shared/types';

interface Props {
  data: TrendPoint[];
  color?: string;
  height?: number;
  onPointClick?: (date: string) => void;
  title?: string;
}

const LineChart = ({
  data,
  color = '#FF7043',
  height = 280,
  onPointClick,
  title,
}: Props) => {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  if (!data.length) return <div style={{ padding: 40, textAlign: 'center', color: '#9E9E9E' }}>暂无数据</div>;

  const padding = { top: 36, right: 32, bottom: 48, left: 52 };
  const maxVal = Math.max(...data.map((d) => d.count), 5);
  const niceMax = Math.ceil(maxVal / 5) * 5;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const chartW = 600 - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (chartW * i) / (data.length - 1 || 1);
    const y = padding.top + chartH - (chartH * d.count) / niceMax;
    return { x, y, d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(2)} ${(padding.top + chartH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padding.top + chartH).toFixed(2)} Z`;

  return (
    <div className="card" style={{ padding: 20 }}>
      {title && <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: '#424242' }}>{title}</div>}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg width="100%" height={height} viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padding.top + chartH * (1 - t);
            const val = Math.round(niceMax * t);
            return (
              <g key={i}>
                <line x1={padding.left} x2={600 - padding.right} y1={y} y2={y} stroke="#F0F0F0" strokeDasharray={i === 0 ? '0' : '4 4'} />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#9E9E9E">{val}</text>
              </g>
            );
          })}

          <path d={areaD} fill={`url(#areaGrad-${color.replace('#', '')})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={i}
              onClick={() => onPointClick?.(p.d.date)}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ idx: i, x: p.x * (rect.width / 600), y: p.y * (rect.height / height) });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: onPointClick ? 'pointer' : 'default' }}
            >
              <circle cx={p.x} cy={p.y} r={hover?.idx === i ? 7 : 4.5} fill="#fff" stroke={color} strokeWidth={2.4}
                style={{ transition: 'all 0.18s ease' }} />
              {i % 5 === 0 && (
                <text x={p.x} y={height - padding.bottom + 20} textAnchor="middle" fontSize="11" fill="#757575">
                  {formatDate(p.d.date)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hover && (
          <div style={{
            position: 'absolute',
            left: hover.x,
            top: hover.y - 10,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#212121',
            color: '#fff',
            padding: '7px 13px',
            borderRadius: 8,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, backgroundColor: color, borderRadius: '50%' }} />
              {points[hover.idx].d.count}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{points[hover.idx].d.date}</div>
            {onPointClick && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>点击查看详情 →</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
