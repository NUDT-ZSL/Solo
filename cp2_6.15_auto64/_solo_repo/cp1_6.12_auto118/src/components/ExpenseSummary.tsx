import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import dayjs from 'dayjs';
import type { Summary, Member } from '../types';

interface ExpenseSummaryProps {
  summary: Summary;
  members: Member[];
  startDate: string;
  endDate: string;
}

function ExpenseSummary({ summary, members, startDate, endDate }: ExpenseSummaryProps) {
  const dailyData = useMemo(() => {
    const days: string[] = [];
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      days.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }

    return days.map(date => {
      const dayData = summary.dailyBudget.find(d => d.date === date);
      return {
        date: dayjs(date).format('MM/DD'),
        fullDate: date,
        amount: dayData ? dayData.total : 0
      };
    });
  }, [summary.dailyBudget, startDate, endDate]);

  const memberData = useMemo(() => {
    return summary.memberBudget.map(m => ({
      name: m.name,
      amount: m.total,
      color: m.avatar_color
    }));
  }, [summary.memberBudget]);

  const totalBudget = summary.totalBudget;
  const usedBudget = summary.totalBudget * 0.6;
  const remainingBudget = totalBudget - usedBudget;

  const ringData = [
    { name: '已用', value: usedBudget, color: '#2E86C1' },
    { name: '剩余', value: remainingBudget, color: '#E9ECEF' }
  ];

  const GradientBar = (props: any) => {
    const { x, y, width, height } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="url(#barGradient)"
        rx={4}
        ry={4}
      />
    );
  };

  return (
    <div className="card expense-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          💰 开销统计
        </h3>

        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2E86C1" />
                  <stop offset="100%" stopColor="#5DADE2" />
                </linearGradient>
              </defs>
              <Pie
                data={ringData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={800}
              >
                <Cell fill="url(#ringGradient)" />
                <Cell fill="#E9ECEF" />
              </Pie>
              <Tooltip
                formatter={(value: number) => [`¥${value.toFixed(0)}`, '']}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>总预算</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
              ¥{totalBudget.toFixed(0)}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            background: 'rgba(46, 134, 193, 0.08)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>已用</p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>
              ¥{usedBudget.toFixed(0)}
            </p>
          </div>
          <div style={{
            background: 'rgba(243, 156, 18, 0.08)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>剩余</p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--secondary)' }}>
              ¥{remainingBudget.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
          📊 每日开销
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E86C1" />
                <stop offset="100%" stopColor="#85C1E9" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#7F8C8D' }}
            />
            <YAxis
              hide={true}
            />
            <Tooltip
              formatter={(value: number) => [`¥${value.toFixed(0)}`, '预算']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '13px'
              }}
            />
            <Bar
              dataKey="amount"
              shape={<GradientBar />}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
          👥 成员开销
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {memberData.map((member, index) => (
            <div
              key={member.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: `slideInLeft 0.3s ease ${index * 0.08}s both`
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: member.color,
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {member.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{member.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ¥{member.amount.toFixed(0)}
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'var(--border)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      height: '100%',
                      background: member.color,
                      borderRadius: '3px',
                      width: `${Math.min(100, (member.amount / Math.max(...memberData.map(m => m.amount), 1)) * 100)}%`,
                      transition: 'width 0.6s ease-out'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {memberData.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px' }}>
              暂无数据
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseSummary;
