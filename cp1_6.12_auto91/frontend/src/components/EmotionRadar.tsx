import { useMemo, useState, useEffect } from 'react';
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

const scoreToColor = (score: number): string => {
  const t = Math.max(0, Math.min(1, (score - 1) / 9));
  const r = Math.round(64 + (179 - 64) * t);
  const g = Math.round(196 + (136 - 196) * t);
  const b = Math.round(255 + (255 - 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const lerpColor = (c1: string, c2: string, t: number): string => {
  const parse = (c: string) => {
    const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

interface CustomShapeProps {
  points: { x: number; y: number; value: number; fullMark: number }[];
}

const CustomRadarShape = ({ points }: CustomShapeProps) => {
  if (!points || points.length < 2) return null;

  const fillPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  const strokeElements = points.map((p, i) => {
    const nextIdx = (i + 1) % points.length;
    const next = points[nextIdx];
    const avgScore = (p.value + next.value) / 2;
    const color = scoreToColor(avgScore);
    return (
      <line
        key={i}
        x1={p.x}
        y1={p.y}
        x2={next.x}
        y2={next.y}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 2px rgba(64,196,255,0.4))' }}
      />
    );
  });

  const dotElements = points.map((p, i) => {
    const color = scoreToColor(p.value);
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
      {strokeElements}
      {dotElements}
    </g>
  );
};

const createAngleTick =
  (scores: Record<string, number>) =>
  ({ x, y, cx, cy, payload, index }: any) => {
    const emotionKey = payload?.value || EMOTION_ORDER[index] || 'joy';
    const score = scores[emotionKey] ?? 0;
    const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const angle = Math.atan2(y - cy, x - cx);
    const labelRadius = radius + 28;
    const lx = cx + Math.cos(angle) * labelRadius;
    const ly = cy + Math.sin(angle) * labelRadius;

    return (
      <g
        className="emotion-label-anim"
        style={{ animationDelay: `${index * 100 + 100}ms` }}
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
          y={ly + 10}
          textAnchor="middle"
          fill="#90a4ae"
          fontSize={14}
          fontWeight={600}
          style={{ fill: scoreToColor(score) }}
        >
          {score.toFixed(1)}
        </text>
      </g>
    );
  };

export default function EmotionRadar({ data }: EmotionRadarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

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

  const AngleTick = useMemo(() => createAngleTick(scores), [scores]);

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
        <RadarChart data={chartData} outerRadius="65%" innerRadius="10%">
          <PolarGrid stroke="rgba(64,196,255,0.15)" />
          <PolarAngleAxis
            dataKey="emotion"
            tick={AngleTick as any}
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
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
