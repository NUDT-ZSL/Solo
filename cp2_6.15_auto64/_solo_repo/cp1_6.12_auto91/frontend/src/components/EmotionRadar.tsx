import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { EmotionSummary, EmotionType } from '../types';
import { EMOTION_LABELS_CN } from '../types';

type EmotionKey = Exclude<EmotionType, 'all'>;

interface EmotionRadarProps {
  data: Record<EmotionKey, EmotionSummary>;
}

const EMOTION_ORDER: EmotionKey[] = ['joy', 'surprise', 'fear', 'anger', 'sadness'];

const scoreToBluePurple = (score: number): string => {
  const t = Math.max(0, Math.min(1, (score - 1) / 9));
  const r = Math.round(64 + (179 - 64) * t);
  const g = Math.round(196 + (136 - 196) * t);
  const b = 255;
  return `rgb(${r}, ${g}, ${b})`;
};

interface CustomRadarShapeProps {
  points: { x: number; y: number; value: number; fullMark: number }[];
}

const CustomRadarShape = ({ points }: CustomRadarShapeProps) => {
  if (!points || points.length < 2) return null;

  const fillPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  const strokeLines = points.map((p, i) => {
    const nextIdx = (i + 1) % points.length;
    const next = points[nextIdx];
    const avgScore = (p.value + next.value) / 2;
    const color = scoreToBluePurple(avgScore);
    return (
      <line
        key={`stroke-${i}`}
        x1={p.x}
        y1={p.y}
        x2={next.x}
        y2={next.y}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px rgba(64,196,255,0.35))' }}
      />
    );
  });

  const dotElements = points.map((p, i) => {
    const color = scoreToBluePurple(p.value);
    return (
      <circle
        key={`dot-${i}`}
        cx={p.x}
        cy={p.y}
        r={5}
        fill={color}
        stroke="#1a1a2e"
        strokeWidth={2}
      />
    );
  });

  return (
    <g>
      <path d={fillPath} fill="rgba(64, 196, 255, 0.4)" />
      {strokeLines}
      {dotElements}
    </g>
  );
};

interface CustomTickProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  payload: { value: string };
  index: number;
}

const createCustomTick =
  (scores: Record<string, number>) =>
  ({ x, y, cx, cy, payload, index }: CustomTickProps) => {
    const emotionKey = payload?.value || EMOTION_ORDER[index] || 'joy';
    const score = scores[emotionKey] ?? 0;
    const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const angle = Math.atan2(y - cy, x - cx);
    const labelRadius = radius + 32;
    const lx = cx + Math.cos(angle) * labelRadius;
    const ly = cy + Math.sin(angle) * labelRadius;

    return (
      <g
        className="emotion-label-anim"
        style={{
          animationDelay: `${index * 100 + 150}ms`,
          animationDuration: '500ms',
        }}
      >
        <text
          x={lx}
          y={ly - 8}
          textAnchor="middle"
          fill="#b0bec5"
          fontSize={13}
          fontWeight={500}
        >
          {EMOTION_LABELS_CN[emotionKey as EmotionKey] || emotionKey}
        </text>
        <text
          x={lx}
          y={ly + 12}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          style={{ fill: scoreToBluePurple(score) }}
        >
          {score.toFixed(1)}
        </text>
      </g>
    );
  };

export default function EmotionRadar({ data }: EmotionRadarProps) {
  const [visible, setVisible] = useState(false);
  const renderStartRef = useRef(0);
  const renderEndRef = useRef(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    renderEndRef.current = performance.now();
    if (renderStartRef.current > 0) {
      const duration = renderEndRef.current - renderStartRef.current;
      console.debug(`[性能] 雷达图渲染完成: ${duration.toFixed(2)}ms`);
    }
  });

  const chartData = useMemo(() => {
    return EMOTION_ORDER.map((emo) => ({
      emotion: emo,
      score: data[emo]?.score ?? 0,
      fullMark: 10,
    }));
  }, [data]);

  const scores = useMemo(() => {
    const s: Record<string, number> = {};
    for (const emo of EMOTION_ORDER) {
      s[emo] = data[emo]?.score ?? 0;
    }
    return s;
  }, [data]);

  const CustomTick = useMemo(() => createCustomTick(scores), [scores]);

  renderStartRef.current = performance.now();

  return (
    <div
      className="radar-wrapper"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease',
        width: '100%',
        height: 360,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={chartData}
          outerRadius="65%"
          innerRadius="10%"
          margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
        >
          <PolarGrid stroke="rgba(64,196,255,0.15)" />
          <PolarAngleAxis
            dataKey="emotion"
            tick={CustomTick as any}
            stroke="rgba(64,196,255,0.2)"
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fill: '#78909c', fontSize: 11 }}
            stroke="rgba(64,196,255,0.2)"
            tickCount={5}
          />
          <Radar
            name="情绪值"
            dataKey="score"
            stroke="#40c4ff"
            fill="rgba(64,196,255,0.4)"
            shape={CustomRadarShape as any}
            animationDuration={700}
            animationEasing="ease-out"
            isAnimationActive={true}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
