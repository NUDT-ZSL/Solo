import React, { useMemo, useState, useCallback } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Skill } from '../utils/skillMatch';
import { getSkillDifferences, getScoreLabel } from '../utils/skillMatch';

interface RadarChartProps {
  skills: Skill[];
  compareSkills?: Skill[] | null;
  compareName?: string;
  memberName: string;
}

interface DiffMarkerData {
  axisValue: string;
  diff: number;
  x: number;
  y: number;
  angle: number;
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string }>;
  label?: string;
  memberName: string;
  compareName?: string;
}> = ({ active, payload, label, memberName, compareName }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'rgba(22, 33, 62, 0.95)',
        border: '1px solid rgba(138, 43, 226, 0.5)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: '#e0e0e0',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{label}</div>
      {payload.map((entry, i) => {
        const label2 = entry.dataKey === 'score' ? memberName : compareName || '对比';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: entry.dataKey === 'score' ? '#4dabf7' : '#ff6b6b',
                display: 'inline-block',
              }}
            />
            <span>
              {label2}: {entry.value} ({getScoreLabel(entry.value)})
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DiffMarker: React.FC<{ data: DiffMarkerData; onClose: () => void }> = ({ data }) => {
  const [showTip, setShowTip] = useState(false);

  return (
    <g>
      <text
        x={data.x}
        y={data.y - 14}
        textAnchor="middle"
        fill="#ff4757"
        fontSize={16}
        fontWeight="bold"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={() => setShowTip(!showTip)}
      >
        ⚠
      </text>
      {showTip && (
        <g>
          <rect
            x={data.x - 50}
            y={data.y - 46}
            width={100}
            height={28}
            rx={6}
            fill="rgba(22, 33, 62, 0.95)"
            stroke="#ff4757"
            strokeWidth={1}
          />
          <text
            x={data.x}
            y={data.y - 28}
            textAnchor="middle"
            fill="#ff4757"
            fontSize={12}
            fontWeight={600}
          >
            差值: {data.diff.toFixed(1)}分
          </text>
        </g>
      )}
    </g>
  );
};

const RadarChartComponent: React.FC<RadarChartProps> = ({
  skills,
  compareSkills,
  compareName,
  memberName,
}) => {
  const [diffMarkers, setDiffMarkers] = useState<DiffMarkerData[]>([]);

  const radarData = useMemo(() => {
    if (!compareSkills) {
      return skills.slice(0, 8).map((s) => ({
        skill: s.name,
        score: s.score,
      }));
    }

    const mapA = new Map<string, number>();
    skills.forEach((s) => mapA.set(s.name, s.score));
    const mapB = new Map<string, number>();
    compareSkills.forEach((s) => mapB.set(s.name, s.score));

    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    const keysArray = Array.from(allKeys).slice(0, 8);

    return keysArray.map((key) => ({
      skill: key,
      score: mapA.get(key) || 0,
      compareScore: mapB.get(key) || 0,
    }));
  }, [skills, compareSkills]);

  const diffs = useMemo(() => {
    if (!compareSkills) return [];
    return getSkillDifferences(skills, compareSkills);
  }, [skills, compareSkills]);

  const handleRadarRef = useCallback(
    (node: any) => {
      if (!node || !diffs.length) {
        setDiffMarkers([]);
        return;
      }

      try {
        const polarAxis = node;
        if (!polarAxis || typeof polarAxis.getPolarAngleAxis !== 'function') {
          setDiffMarkers([]);
          return;
        }
      } catch {
        setDiffMarkers([]);
      }
    },
    [diffs]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          cx="50%"
          cy="50%"
          outerRadius="70%"
          data={radarData}
          ref={handleRadarRef}
        >
          <PolarGrid
            stroke="rgba(138, 43, 226, 0.2)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: '#a0a0c0', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: '#707090', fontSize: 10 }}
            axisLine={false}
          />

          <Radar
            name={memberName}
            dataKey="score"
            stroke="#4dabf7"
            fill="#4dabf7"
            fillOpacity={0.3}
            strokeWidth={2}
          />

          {compareSkills && (
            <Radar
              name={compareName || '对比成员'}
              dataKey="compareScore"
              stroke="#ff6b6b"
              fill="#ff6b6b"
              fillOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}

          <Tooltip
            content={
              <CustomTooltip
                memberName={memberName}
                compareName={compareName}
              />
            }
          />
        </RechartsRadarChart>
      </ResponsiveContainer>

      {diffs.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(22, 33, 62, 0.9)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            border: '1px solid rgba(255, 71, 87, 0.4)',
            maxWidth: 160,
          }}
        >
          <div style={{ color: '#ff4757', fontWeight: 600, marginBottom: 4 }}>
            ⚠ 差异超过2分
          </div>
          {diffs.map((d, i) => (
            <div key={i} style={{ color: '#e0e0e0', lineHeight: 1.6 }}>
              {d.name}: 差{d.diff.toFixed(1)}分
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RadarChartComponent;
