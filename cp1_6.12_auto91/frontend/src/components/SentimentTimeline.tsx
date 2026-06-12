import { useMemo, useRef, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  DotProps,
} from 'recharts';
import type { TimelinePoint, EmotionType } from '../types';
import { EMOTION_COLORS, EMOTION_LABELS_CN } from '../types';

interface SentimentTimelineProps {
  data: TimelinePoint[];
  emotionType: EmotionType;
  onPointClick?: (point: TimelinePoint) => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 0.3) {
    const t = Math.min(1, (score - 0.3) / 0.7);
    return lerpColor('#4caf50', '#00e676', t);
  }
  if (score <= -0.3) {
    const t = Math.min(1, (-score - 0.3) / 0.7);
    return lerpColor('#ff9800', '#f44336', t);
  }
  return '#9e9e9e';
};

const lerpColor = (a: string, b: string, t: number): string => {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 255;
  const ag = (ah >> 8) & 255;
  const ab = ah & 255;
  const br = (bh >> 16) & 255;
  const bg = (bh >> 8) & 255;
  const bb = bh & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
};

const CustomDot = (props: DotProps & { onClick?: (e: any) => void }) => {
  const { cx, cy, stroke, payload, onClick } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const score = payload.avg_sentiment as number;
  const color = getScoreColor(score);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="#1a1a2e"
      strokeWidth={2}
      style={{ cursor: 'pointer', transition: 'r 200ms ease, filter 200ms ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.setAttribute('r', '8');
        e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(64,196,255,0.8))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.setAttribute('r', '6');
        e.currentTarget.style.filter = 'none';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(payload);
      }}
    />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as TimelinePoint;
  const score = data.avg_sentiment;
  const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
  return (
    <div className="custom-tooltip">
      <div className="tooltip-time">⏰ {data.time}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">平均情绪：</span>
        <span className={`tooltip-value ${scoreClass}`}>
          {(score > 0 ? '+' : '') + score.toFixed(3)}
        </span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">评论数量：</span>
        <span className="tooltip-value">{data.comment_count} 条</span>
      </div>
      {data.emotion_distribution && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          {Object.entries(data.emotion_distribution).map(([k, v]) => (
            <div key={k} className="tooltip-row">
              <span className="tooltip-label">
                {EMOTION_LABELS_CN[k as keyof typeof EMOTION_LABELS_CN]}：
              </span>
              <span className="tooltip-value">{(v as number).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SentimentTimeline({
  data,
  emotionType,
  onPointClick,
}: SentimentTimelineProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const gradientId = useMemo(() => `sentiment-gradient-${Math.random().toString(36).slice(2, 9)}`, []);

  const strokeColor = useMemo(() => {
    if (emotionType === 'all') return `url(#${gradientId})`;
    return EMOTION_COLORS[emotionType as Exclude<EmotionType, 'all'>] || '#40c4ff';
  }, [emotionType, gradientId]);

  const yDomain = useMemo(() => {
    if (emotionType === 'all') return [-1, 1] as [number, number];
    return [0, 1] as [number, number];
  }, [emotionType]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '32vh',
        minHeight: 220,
        maxHeight: 380,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00e676" />
              <stop offset="35%" stopColor="#4caf50" />
              <stop offset="50%" stopColor="#9e9e9e" />
              <stop offset="65%" stopColor="#ff9800" />
              <stop offset="100%" stopColor="#f44336" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,196,255,0.1)" />
          <XAxis
            dataKey="time"
            stroke="#78909c"
            tick={{ fill: '#90a4ae', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(64,196,255,0.3)' }}
            tickLine={{ stroke: 'rgba(64,196,255,0.2)' }}
          />
          <YAxis
            domain={yDomain}
            stroke="#78909c"
            tick={{ fill: '#90a4ae', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(64,196,255,0.3)' }}
            tickLine={{ stroke: 'rgba(64,196,255,0.2)' }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(64,196,255,0.4)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Line
            type="monotone"
            dataKey="avg_sentiment"
            stroke={strokeColor}
            strokeWidth={3}
            dot={<CustomDot onClick={onPointClick ? (p: any) => onPointClick(p) : undefined} />}
            activeDot={{ r: 9, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={700}
            animationEasing="ease-out"
            filter="url(#glow)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
