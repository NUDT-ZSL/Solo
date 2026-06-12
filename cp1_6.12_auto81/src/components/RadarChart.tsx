import React, { useMemo, useState } from 'react';
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

const RadarChartComponent: React.FC<RadarChartProps> = ({
  skills,
  compareSkills,
  compareName,
  memberName,
}) => {
  const [diffMarkers, setDiffMarkers] = useState<DiffMarkerData[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    if (!compareSkills || !containerRef.current || diffs.length === 0) {
      setDiffMarkers([]);
      return;
    }

    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = 300;
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) * 0.7 * 0.5;

    const diffNames = new Set(diffs.map((d) => d.name));
    const markers: DiffMarkerData[] = [];

    radarData.forEach((item, index) => {
      if (diffNames.has(item.skill)) {
        const diff = diffs.find((d) => d.name === item.skill)?.diff || 0;
        const angle = (index / radarData.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * (outerRadius + 28);
        const y = cy + Math.sin(angle) * (outerRadius + 28);

        markers.push({
          axisValue: item.skill,
          diff,
          x,
          y,
          angle,
        });
      }
    });

    setDiffMarkers(markers);
  }, [radarData, diffs, compareSkills]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          cx="50%"
          cy="50%"
          outerRadius="70%"
          data={radarData}
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

      {diffMarkers.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {diffMarkers.map((marker, i) => (
            <g key={i} style={{ pointerEvents: 'auto' }}>
              <text
                x={marker.x}
                y={marker.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ff4757"
                fontSize={18}
                fontWeight="bold"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  const tip = document.createElement('div');
                  tip.id = `diff-tip-${i}`;
                  tip.innerHTML = `<strong>${marker.axisValue}</strong><br/>差值: ${marker.diff.toFixed(1)}分`;
                  tip.style.cssText = `
                    position: fixed;
                    background: rgba(22, 33, 62, 0.98);
                    border: 1px solid #ff4757;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 12px;
                    color: #ff4757;
                    z-index: 9999;
                    pointer-events: none;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                  `;
                  const rect = target.getBoundingClientRect();
                  tip.style.left = `${rect.left + rect.width / 2 - 50}px`;
                  tip.style.top = `${rect.top - 50}px`;
                  document.body.appendChild(tip);
                }}
                onMouseLeave={() => {
                  const tip = document.getElementById(`diff-tip-${i}`);
                  if (tip) tip.remove();
                }}
                onClick={(e) => {
                  const existing = document.getElementById(`diff-tip-${i}`);
                  if (existing) {
                    existing.remove();
                  } else {
                    const target = e.currentTarget;
                    const tip = document.createElement('div');
                    tip.id = `diff-tip-${i}`;
                    tip.innerHTML = `<strong>${marker.axisValue}</strong><br/>差值: ${marker.diff.toFixed(1)}分<br/><span style="color:#a0a0c0;font-size:11px">点击空白处关闭</span>`;
                    tip.style.cssText = `
                      position: fixed;
                      background: rgba(22, 33, 62, 0.98);
                      border: 1px solid #ff4757;
                      border-radius: 6px;
                      padding: 8px 12px;
                      font-size: 12px;
                      color: #ff4757;
                      z-index: 9999;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    `;
                    const rect = target.getBoundingClientRect();
                    tip.style.left = `${rect.left + rect.width / 2 - 50}px`;
                    tip.style.top = `${rect.top - 70}px`;
                    document.body.appendChild(tip);
                    const closeHandler = (ev: MouseEvent) => {
                      if (!tip.contains(ev.target as Node) && ev.target !== target) {
                        tip.remove();
                        document.removeEventListener('click', closeHandler);
                      }
                    };
                    setTimeout(() => document.addEventListener('click', closeHandler), 0);
                  }
                }}
              >
                ⚠
              </text>
            </g>
          ))}
        </svg>
      )}

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
            zIndex: 5,
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
