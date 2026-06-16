import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Dot,
} from 'recharts';
import {
  MonthlyCategoryData,
  DailyHeatData,
  CATEGORY_COLORS,
  generateMonthlyData,
  generateDailyHeatData,
  getTopThreeDays,
  parseBorrowCSV,
  calculateCategoryStats,
} from '../utils/bookData';

interface DashboardProps {
  selectedExhibitionDate?: string;
  onDataLoaded?: () => void;
}

const MONTHS = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#2C3E50',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          animation: 'fadeIn 0.2s ease-out',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '4px 0', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: entry.color,
                marginRight: '8px',
              }}
            />
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload, topThree } = props;
  const isTop = topThree?.some((d: DailyHeatData) => d.date === payload.date);

  if (isTop) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        fill="#F39C12"
        stroke="white"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(243, 156, 18, 0.4))' }}
      />
    );
  }
  return <Dot cx={cx} cy={cy} r={3} fill="#4A90D9" />;
};

const Dashboard: React.FC<DashboardProps> = ({
  selectedExhibitionDate = '2024-06-15',
  onDataLoaded,
}) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyCategoryData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-06');
  const [dailyData, setDailyData] = useState<DailyHeatData[]>([]);
  const [topThree, setTopThree] = useState<DailyHeatData[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const data = generateMonthlyData(MONTHS);
      setMonthlyData(data);
      const daily = generateDailyHeatData(selectedExhibitionDate);
      setDailyData(daily);
      setTopThree(getTopThreeDays(daily));
      setIsLoading(false);
      onDataLoaded?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedExhibitionDate]);

  const handleMonthChange = (month: string) => {
    if (month === selectedMonth) return;
    setIsAnimating(true);
    setSelectedMonth(month);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const records = parseBorrowCSV(content);
      if (records.length > 0) {
        const stats = calculateCategoryStats(records);
        const month = records[0]?.date?.slice(0, 7) || selectedMonth;
        const newData = [...monthlyData];
        const idx = newData.findIndex(d => d.month === month);
        const monthData: MonthlyCategoryData = {
          month,
          '科幻': stats['科幻'] || 0,
          '推理': stats['推理'] || 0,
          '绘本': stats['绘本'] || 0,
        };
        if (idx >= 0) {
          newData[idx] = monthData;
        } else {
          newData.push(monthData);
        }
        setMonthlyData(newData);
        setSelectedMonth(month);
      }
    };
    reader.readAsText(file);
  };

  const currentMonthData = monthlyData.find(d => d.month === selectedMonth);

  if (isLoading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#7F8C8D', fontSize: '16px' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ marginBottom: '24px', color: '#2C3E50', fontSize: '22px' }}>借阅趋势分析</h2>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#2C3E50', fontSize: '16px', margin: 0 }}>各分类月度借阅频次</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4A90D9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#357ABD')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4A90D9')}
            >
              导入CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #D5DBDB',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ height: '300px', opacity: isAnimating ? 0.6 : 1, transition: 'opacity 0.4s ease' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData.filter(d => d.month === selectedMonth)}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: '#7F8C8D', fontSize: 12 }} axisLine={{ stroke: '#D5DBDB' }} />
              <YAxis dataKey="month" type="category" tick={{ fill: '#7F8C8D', fontSize: 12 }} axisLine={{ stroke: '#D5DBDB' }} width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74, 144, 217, 0.1)' }} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="rect"
                iconSize={12}
                formatter={(value: string) => <span style={{ fontSize: '12px', color: '#2C3E50' }}>{value}</span>}
              />
              <Bar
                dataKey="科幻"
                stackId="a"
                fill={CATEGORY_COLORS['科幻']}
                radius={[0, 0, 0, 0]}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Bar
                dataKey="推理"
                stackId="a"
                fill={CATEGORY_COLORS['推理']}
                radius={[0, 0, 0, 0]}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Bar
                dataKey="绘本"
                stackId="a"
                fill={CATEGORY_COLORS['绘本']}
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
                animationDuration={400}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', justifyContent: 'center' }}>
          {currentMonthData && (
            <>
              <StatItem label="科幻" value={currentMonthData['科幻']} color={CATEGORY_COLORS['科幻']} />
              <StatItem label="推理" value={currentMonthData['推理']} color={CATEGORY_COLORS['推理']} />
              <StatItem label="绘本" value={currentMonthData['绘本']} color={CATEGORY_COLORS['绘本']} />
            </>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '24px' }}>
        <h3 style={{ color: '#2C3E50', fontSize: '16px', margin: '0 0 20px 0' }}>热度趋势对比（书展前后各一周）</h3>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dailyData}
              margin={{ top: 20, right: 60, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#7F8C8D', fontSize: 11 }}
                axisLine={{ stroke: '#D5DBDB' }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#7F8C8D', fontSize: 12 }}
                axisLine={{ stroke: '#D5DBDB' }}
                label={{ value: '借阅量', angle: -90, position: 'insideLeft', fill: '#4A90D9', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#7F8C8D', fontSize: 12 }}
                axisLine={{ stroke: '#D5DBDB' }}
                label={{ value: '预约排队数', angle: 90, position: 'insideRight', fill: '#8E44AD', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="borrowCount"
                name="每日借阅量"
                stroke="#4A90D9"
                strokeWidth={2.5}
                dot={(props) => <CustomDot {...props} topThree={topThree} />}
                activeDot={{ r: 8, fill: '#F39C12', stroke: 'white', strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="reservationCount"
                name="预约排队人数"
                stroke="#8E44AD"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#8E44AD' }}
                activeDot={{ r: 6, fill: '#8E44AD' }}
                isAnimationActive={true}
                animationDuration={400}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#4A90D9',
              }}
            />
            <span style={{ fontSize: '14px', color: '#2C3E50' }}>每日借阅量</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#8E44AD',
              }}
            />
            <span style={{ fontSize: '14px', color: '#2C3E50' }}>预约排队人数</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#F39C12',
              }}
            />
            <span style={{ fontSize: '14px', color: '#2C3E50' }}>热度最高三天</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: color }}></span>
    <span style={{ fontSize: '13px', color: '#5D6D7E' }}>{label}:</span>
    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2C3E50' }}>{value} 册</span>
  </div>
);

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(160, 160, 160, 0.15)',
};

export default Dashboard;
