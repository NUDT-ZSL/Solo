import { useState } from 'react';
import type { ActivityWordPoint } from '../../shared/types';

interface Props {
  data: ActivityWordPoint[];
  height?: number;
}

const BarChart = ({ data, height = 260 }: Props) => {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  if (!data.length) return <div style={{ padding: 40, textAlign: 'center', color: '#9E9E9E' }}>暂无数据</div>;

  const padding = { top: 24, right: 24, bottom: 44, left: 52 };
  const maxVal = Math.max(...data.map((d) => d.words), 100);
  const niceMax = Math.ceil(maxVal / 100) * 100;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64B5F6" />
            <stop offset="100%" stopColor="#1E88E5" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (1 - t));
          const val = Math.round(niceMax * t);
          return (
            <g key={i}>
              <line x1={padding.left} x2={600 - padding.right} y1={y} y2={y} stroke="#F0F0F0" strokeDasharray={i === 0 ? '0' : '4 4'} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#9E9E9E">{val}</text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const chartW = 600 - padding.left - padding.right;
          const barW = chartW / data.length;
          const x = padding.left + barW * i + barW * 0.18;
          const w = barW * 0.64;
          const h = ((height - padding.top - padding.bottom) * d.words) / niceMax;
          const y = height - padding.bottom - h;
          return (
            <g key={i}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ idx: i, x: (x + w / 2) * (rect.width / 600), y: y * (rect.height / height) });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={x} y={y} width={w} height={h} rx={6} fill="url(#barGradient)"
                style={{ transition: 'all 0.2s ease', opacity: hover?.idx === i ? 1 : 0.92 }} />
              <text x={padding.left + barW * i + barW / 2} y={height - padding.bottom + 20}
                textAnchor="middle" fontSize="11" fill="#757575">{formatDate(d.date)}</text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div style={{
          position: 'absolute',
          left: hover.x,
          top: hover.y - 10,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#212121',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontWeight: 600 }}>{data[hover.idx].words} 字</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{data[hover.idx].date}</div>
        </div>
      )}
    </div>
  );
};

export default BarChart;
