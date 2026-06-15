import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
} from 'recharts';
import {
  DailyTrendItem,
  TypeDistributionItem,
  StackedWeekItem,
  MonthlyTypeItem,
} from '../api';

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#7c4dff', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#ff9f43'];
const STACK_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{label}</div>
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {entry.value}{entry.name.includes('心率') ? ' bpm' : entry.name.includes('消耗') ? ' kcal' : ' 分钟'}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function BarClickTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{label}</div>
        {payload.filter(p => p.value > 0).map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: entry.fill }} />
            <span>{entry.dataKey}: {entry.value} 分钟</span>
          </div>
        ))}
        {payload.filter(p => p.value > 0).length === 0 && (
          <div style={{ color: '#6b6b8b' }}>暂无数据</div>
        )}
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{data.name}</div>
        <div className="tooltip-item">
          <span className="tooltip-dot" style={{ backgroundColor: payload[0].payload.fill }} />
          <span>时长: {data.value} 分钟</span>
        </div>
        <div className="tooltip-item" style={{ marginTop: '4px' }}>
          <span style={{ color: '#6b6b8b' }}>占比: {data.percent}</span>
        </div>
      </div>
    );
  }
  return null;
}

interface DurationTrendChartProps {
  data: DailyTrendItem[];
  height?: number;
}

export function DurationTrendChart({ data, height = 280 }: DurationTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c4dff" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#7c4dff" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#6b6b8b', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="duration"
          name="运动时长"
          stroke="#7c4dff"
          strokeWidth={3}
          fill="url(#durationGradient)"
          dot={{ fill: '#7c4dff', strokeWidth: 2, r: 4, stroke: '#1e1e2e' }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface WeeklyTypeStackedChartProps {
  data: TypeDistributionItem[];
  onBarClick?: (type: string) => void;
  height?: number;
}

export function WeeklyTypeStackedChart({ data, onBarClick, height = 280 }: WeeklyTypeStackedChartProps) {
  const chartData = [{
    name: '本周',
    ...Object.fromEntries(data.map(d => [d.type, d.duration])),
  }];

  const keys = data.map(d => d.type);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="name"
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#6b6b8b', fontSize: 11 }}
        />
        <Tooltip content={<BarClickTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#a0a0c0' }}
          iconType="circle"
          iconSize={8}
        />
        {keys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={STACK_COLORS[index % STACK_COLORS.length]}
            onClick={() => onBarClick?.(key)}
            cursor={onBarClick ? 'pointer' : 'default'}
            animationDuration={600}
            radius={[0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface WeeklyDualChartProps {
  data: DailyTrendItem[];
  height?: number;
}

export function WeeklyDualChart({ data, height = 320 }: WeeklyDualChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dualDurationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c4dff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c4dff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          yAxisId="left"
          stroke="#7c4dff"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#7c4dff', fontSize: 11 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#ff6b6b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: 'bpm', angle: 90, position: 'insideRight', fill: '#ff6b6b', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#a0a0c0' }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="duration"
          name="运动时长"
          stroke="#7c4dff"
          strokeWidth={3}
          fill="url(#dualDurationGradient)"
          animationDuration={600}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgHeartRate"
          name="平均心率"
          stroke="#ff6b6b"
          strokeWidth={2.5}
          dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 4, stroke: '#1e1e2e' }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          animationDuration={600}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface MonthlyStackedChartProps {
  data: StackedWeekItem[];
  exerciseTypes: string[];
  onBarClick?: (type: string) => void;
  height?: number;
}

export function MonthlyStackedChart({ data, exerciseTypes, onBarClick, height = 320 }: MonthlyStackedChartProps) {
  const activeTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(item => {
      exerciseTypes.forEach(t => {
        if (typeof item[t] === 'number' && (item[t] as number) > 0) {
          types.add(t);
        }
      });
    });
    return Array.from(types);
  }, [data, exerciseTypes]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="week"
          stroke="#6b6b8b"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke="#6b6b8b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#6b6b8b', fontSize: 11 }}
        />
        <Tooltip content={<BarClickTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#a0a0c0' }}
          iconType="circle"
          iconSize={8}
        />
        {activeTypes.map((type, index) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="month"
            fill={COLORS[index % COLORS.length]}
            onClick={() => onBarClick?.(type)}
            cursor={onBarClick ? 'pointer' : 'default'}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MonthlyHeartRateChartProps {
  data: StackedWeekItem[];
  height?: number;
}

export function MonthlyHeartRateChart({ data, height = 220 }: MonthlyHeartRateChartProps) {
  const chartData = data.map(d => ({
    week: d.week,
    平均心率: d.avgHeartRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="week"
          stroke="#6b6b8b"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke="#ff6b6b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          label={{ value: 'bpm', angle: -90, position: 'insideLeft', fill: '#ff6b6b', fontSize: 11 }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="custom-tooltip">
                  <div className="tooltip-label">{label}</div>
                  <div className="tooltip-item">
                    <span className="tooltip-dot" style={{ backgroundColor: '#ff6b6b' }} />
                    <span>平均心率: {payload[0].value} bpm</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="平均心率"
          stroke="#ff6b6b"
          strokeWidth={3}
          fill="url(#hrGradient)"
          dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 4, stroke: '#1e1e2e' }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface TypePieChartProps {
  data: MonthlyTypeItem[];
  height?: number;
}

export function TypePieChart({ data, height = 300 }: TypePieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const pieData = data.map((d, i) => ({
    ...d,
    fill: COLORS[i % COLORS.length],
    percent: total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : '0%',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip content={<PieTooltip />} />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: '11px', color: '#a0a0c0', paddingTop: '10px' }}
          iconType="circle"
          iconSize={8}
        />
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
          animationDuration={600}
          stroke="none"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
