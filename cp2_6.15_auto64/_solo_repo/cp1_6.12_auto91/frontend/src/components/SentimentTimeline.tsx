import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
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
  const parse = (c: string): [number, number, number] => {
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const CustomDot = (
  props: DotProps & { onClick?: (payload: TimelinePoint) => void }
) => {
  const { cx, cy, payload, onClick } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const score = (payload as TimelinePoint).avg_sentiment;
  const color = getScoreColor(score);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(payload as TimelinePoint);
    },
    [onClick, payload]
  );
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="#1a1a2e"
      strokeWidth={2}
      style={{ cursor: 'pointer', transition: 'r 200ms ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.setAttribute('r', '8');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.setAttribute('r', '6');
      }}
      onClick={handleClick}
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as TimelinePoint;
  const score = data.avg_sentiment;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-time">⏰ {data.time}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">平均情绪：</span>
        <span
          className="tooltip-value"
          style={{ color: score > 0 ? '#69f0ae' : score < 0 ? '#ff8a80' : '#fff' }}
        >
          {(score > 0 ? '+' : '') + score.toFixed(3)}
        </span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">评论数量：</span>
        <span className="tooltip-value">{data.comment_count} 条</span>
      </div>
      {data.emotion_distribution && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
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

interface GradientDefsProps {
  yDomain: [number, number];
  emotionType: EmotionType;
  gradientId: string;
}

const GradientDefs = ({ yDomain, emotionType, gradientId }: GradientDefsProps) => {
  const [yMin, yMax] = yDomain;
  const yRange = yMax - yMin;

  const valueToPercent = (val: number) => {
    return ((yMax - val) / yRange) * 100;
  };

  if (emotionType !== 'all') {
    const color = EMOTION_COLORS[emotionType as Exclude<EmotionType, 'all'>] || '#40c4ff';
    return (
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.9} />
        </linearGradient>
      </defs>
    );
  }

  const p0_3 = valueToPercent(0.3);
  const p_0_3 = valueToPercent(-0.3);

  return (
    <defs>
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00e676" />
        <stop offset={`${Math.min(p0_3, 100).toFixed(2)}%`} stopColor="#4caf50" />
        <stop offset={`${Math.min(p0_3, 100).toFixed(2)}%`} stopColor="#9e9e9e" />
        <stop offset={`${Math.max(p_0_3, 0).toFixed(2)}%`} stopColor="#9e9e9e" />
        <stop offset={`${Math.max(p_0_3, 0).toFixed(2)}%`} stopColor="#ff9800" />
        <stop offset="100%" stopColor="#f44336" />
      </linearGradient>
    </defs>
  );
};

export default function SentimentTimeline({
  data,
  emotionType,
  onPointClick,
}: SentimentTimelineProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const gradientId = useMemo(
    () => `sentiment-grad-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setIsTransitioning(true);
    const t = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(t);
  }, [data, mounted]);

  const yDomain: [number, number] = useMemo(() => {
    if (emotionType === 'all') return [-1, 1];
    return [0, 1];
  }, [emotionType]);

  const strokeColor = useMemo(() => `url(#${gradientId})`, [gradientId]);

  const renderStartTime = useRef(0);
  const renderEndTime = useRef(0);

  useEffect(() => {
    renderEndTime.current = performance.now();
    if (renderStartTime.current > 0) {
      const duration = renderEndTime.current - renderStartTime.current;
      console.debug(
        `[性能] 折线图渲染完成: ${duration.toFixed(2)}ms (${data.length} 个数据点)`
      );
    }
  });

  const handleClick = useCallback(
    (point: TimelinePoint) => {
      onPointClick?.(point);
    },
    [onPointClick]
  );

  renderStartTime.current = performance.now();

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '32vh',
        minHeight: 220,
        maxHeight: 380,
        opacity: mounted ? (isTransitioning ? 0.7 : 1) : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <GradientDefs
            yDomain={yDomain}
            emotionType={emotionType}
            gradientId={gradientId}
          />
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,196,255,0.1)" />
          <XAxis
            dataKey="time"
            stroke="#78909c"
            tick={{ fill: '#90a4ae', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(64,196,255,0.3)' }}
            tickLine={{ stroke: 'rgba(64,196,255,0.2)' }}
            allowDuplicatedCategory={false}
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
            dot={<CustomDot onClick={handleClick} />}
            activeDot={{ r: 9, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={400}
            animationEasing="ease-out"
            filter="url(#line-glow)"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
