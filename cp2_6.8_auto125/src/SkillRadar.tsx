import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SkillData {
  skill: string;
  score: number;
  [key: string]: any;
}

interface MultiDataSet {
  name: string;
  data: SkillData[];
  color: string;
}

interface SkillRadarProps {
  data: SkillData[];
  size?: number;
  color?: string;
  highlightOnHover?: boolean;
  multiData?: MultiDataSet[];
  onSkillHover?: (skill: string | null) => void;
}

const SkillRadar: React.FC<SkillRadarProps> = ({
  data,
  size = 120,
  color = '#4299E1',
  highlightOnHover = false,
  multiData,
  onSkillHover,
}) => {
  const [activeLegend, setActiveLegend] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const handleMouseEnter = (skill: string) => {
    setHoveredSkill(skill);
    if (onSkillHover) {
      onSkillHover(skill);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSkill(null);
    if (onSkillHover) {
      onSkillHover(null);
    }
  };

  const handleLegendEnter = (value: string) => {
    setActiveLegend(value);
  };

  const handleLegendLeave = () => {
    setActiveLegend(null);
  };

  const chartData = multiData && multiData.length > 0
    ? multiData[0].data.map((item, index) => {
        const combined: Record<string, any> = { skill: item.skill };
        multiData.forEach((set) => {
          combined[set.name] = set.data[index]?.score || 0;
        });
        return combined;
      })
    : data;

  const renderRadarLayers = () => {
    if (multiData && multiData.length > 0) {
      return multiData.map((set) => {
        const isActive = activeLegend === set.name;
        const scale = isActive ? 1.05 : 1;
        return (
          <Radar
            key={set.name}
            name={set.name}
            dataKey={set.name}
            stroke={set.color}
            fill={set.color}
            fillOpacity={0.3}
            strokeWidth={isActive ? 3 : 2}
            isAnimationActive
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
            scale={scale}
          />
        );
      });
    }
    return (
      <Radar
        name="技能评分"
        dataKey="score"
        stroke={color}
        fill={color}
        fillOpacity={0.3}
        strokeWidth={2}
        isAnimationActive
        animationBegin={0}
        animationDuration={500}
        animationEasing="ease-out"
      />
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: '#2D3748' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{
                margin: '4px 0 0 0',
                color: entry.color,
                fontSize: '14px',
              }}
            >
              {entry.name}: {entry.value}分
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: size, height: size }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes rotateIn {
            from { transform: rotate(-180deg); opacity: 0; }
            to { transform: rotate(0deg); opacity: 1; }
          }
          .radar-chart-wrapper {
            animation: rotateIn 0.5s ease-out;
          }
        `}
      </style>
      <div className="radar-chart-wrapper" style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="80%"
            data={chartData}
          >
            <PolarGrid stroke="#A0AEC0" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="skill"
              tick={{
                fill: '#718096',
                fontSize: size < 200 ? 10 : 12,
              }}
              onMouseEnter={(_, index) => {
                if (highlightOnHover && chartData[index]) {
                  handleMouseEnter(chartData[index].skill);
                }
              }}
              onMouseLeave={handleMouseLeave}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tickCount={6}
              tick={{
                fill: '#A0AEC0',
                fontSize: 10,
              }}
              axisLine={{ stroke: '#A0AEC0' }}
              tickLine={{ stroke: '#A0AEC0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {multiData && multiData.length > 0 && (
              <Legend
                onMouseEnter={handleLegendEnter}
                onMouseLeave={handleLegendLeave}
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '8px',
                }}
              />
            )}
            {renderRadarLayers()}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SkillRadar;
