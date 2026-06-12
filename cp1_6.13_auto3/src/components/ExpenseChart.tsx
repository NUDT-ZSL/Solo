import { useMemo } from 'react';
import type { Record } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExpenseChartProps {
  records: Record[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

function ExpenseChart({ records }: ExpenseChartProps) {
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    records
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        const current = categoryMap.get(r.category) || 0;
        categoryMap.set(r.category, current + r.amount);
      });
    const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + v, 0);
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const last7DaysData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i);
      const dayStr = format(day, 'MM-dd');
      const dayRecords = records.filter((r) =>
        isSameDay(parseISO(r.date), day)
      );
      const income = dayRecords
        .filter((r) => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      const expense = dayRecords
        .filter((r) => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      days.push({
        date: dayStr,
        收入: income,
        支出: expense,
      });
    }
    return days;
  }, [records]);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${name}\n${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <div className="chart-card fade-in-up">
        <h3 className="chart-title">支出分类占比</h3>
        {expenseByCategory.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">暂无支出数据</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={160}
                    innerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`¥${value.toFixed(2)}`, '金额']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingLeft: '20px',
                minWidth: '140px',
              }}
            >
              {expenseByCategory.map((item, index) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#4b5563',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: COLORS[index % COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                    {item.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="chart-card fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="chart-title">近7天收支趋势</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={last7DaysData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              dataKey="收入"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="支出"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default ExpenseChart;
