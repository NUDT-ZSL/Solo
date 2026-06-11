import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { Summary, getCategoryColor } from '../types';

interface Props {
  summary: Summary | null;
  loading?: boolean;
}

interface StaggeredItem {
  visible: boolean;
  delay: number;
}

function useStaggeredAnimation(count: number, trigger: any): StaggeredItem[] {
  const [items, setItems] = useState<StaggeredItem[]>(
    Array.from({ length: count }, () => ({ visible: false, delay: 0 }))
  );

  useEffect(() => {
    setItems(Array.from({ length: count }, (_, i) => ({ visible: false, delay: i * 100 })));
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => {
          setItems(prev => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], visible: true };
            return next;
          });
        }, i * 100 + 50)
      );
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [trigger, count]);

  return items;
}

export default function Dashboard({ summary, loading }: Props) {
  const trendData = useMemo(
    () =>
      summary?.monthTrend.map(item => ({
        ...item,
        monthLabel: item.month.slice(5) + '月'
      })) || [],
    [summary]
  );

  const pieData = useMemo(() => {
    const data = summary?.categoryExpense || [];
    const total = data.reduce((s, d) => s + d.amount, 0);
    return data.map(d => ({
      name: d.category,
      value: +d.amount.toFixed(2),
      percent: total > 0 ? ((d.amount / total) * 100).toFixed(1) : '0'
    }));
  }, [summary]);

  const pieAnim = useStaggeredAnimation(pieData.length, pieData.map(d => d.name).join(','));
  const trendAnim = useStaggeredAnimation(trendData.length, trendData.map(d => d.month).join(','));

  if (loading || !summary) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: '#999' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        <div>正在加载仪表盘数据...</div>
      </div>
    );
  }

  const currentMonthTrend = trendData[trendData.length - 1];
  const prevMonthTrend = trendData[trendData.length - 2];
  const incomeChange =
    prevMonthTrend && prevMonthTrend.income > 0
      ? ((currentMonthTrend?.income || 0) - prevMonthTrend.income) / prevMonthTrend.income
      : 0;
  const expenseChange =
    prevMonthTrend && prevMonthTrend.expense > 0
      ? ((currentMonthTrend?.expense || 0) - prevMonthTrend.expense) / prevMonthTrend.expense
      : 0;

  const statCards = [
    {
      title: '总收入',
      value: summary.totalIncome,
      color: '#6BCB77',
      bgColor: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
      icon: '💰',
      change: incomeChange,
      suffix: '较上月'
    },
    {
      title: '总支出',
      value: summary.totalExpense,
      color: '#FF6B6B',
      bgColor: 'linear-gradient(135deg, #FFEBEE, #FFCDD2)',
      icon: '💸',
      change: expenseChange,
      suffix: '较上月'
    },
    {
      title: '累计结余',
      value: summary.balance,
      color: summary.balance >= 0 ? '#4A90D9' : '#E53935',
      bgColor:
        summary.balance >= 0
          ? 'linear-gradient(135deg, #E3F2FD, #BBDEFB)'
          : 'linear-gradient(135deg, #FFEBEE, #FFCDD2)',
      icon: summary.balance >= 0 ? '💎' : '📉',
      change: null,
      suffix: ''
    },
    {
      title: '本月支出',
      value: currentMonthTrend?.expense || 0,
      color: '#50E3C2',
      bgColor: 'linear-gradient(135deg, #E0F7FA, #B2EBF2)',
      icon: '📅',
      change: null,
      suffix: `${currentMonthTrend?.monthLabel || ''}`
    }
  ];

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {statCards.map((card, idx) => (
          <div
            key={card.title}
            className="stat-card"
            style={{
              padding: '20px',
              borderRadius: '8px',
              background: card.bgColor,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              animation: `fadeSlideUp 400ms ease ${idx * 80}ms both`,
              transition: 'transform 200ms, box-shadow 200ms'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}
            >
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
                {card.title}
              </span>
              <span style={{ fontSize: '24px' }}>{card.icon}</span>
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: card.color,
                marginBottom: '8px',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.5px'
              }}
            >
              ¥{card.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {card.change !== null ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color:
                    card.change === 0
                      ? '#999'
                      : card.title === '总收入'
                      ? card.change > 0
                        ? '#43A047'
                        : '#E53935'
                      : card.change > 0
                      ? '#E53935'
                      : '#43A047'
                }}
              >
                {card.change !== 0 && (
                  <span>{card.change > 0 ? '↑' : '↓'}</span>
                )}
                <span>{card.change === 0 ? '持平' : `${Math.abs(card.change * 100).toFixed(1)}%`}</span>
                <span style={{ color: '#999', marginLeft: 'auto' }}>{card.suffix}</span>
              </div>
            ) : card.suffix ? (
              <div style={{ fontSize: '12px', color: '#999' }}>{card.suffix}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '20px',
          marginBottom: '24px'
        }}
        className="dashboard-charts"
      >
        <div
          className="card"
          style={{
            padding: '24px',
            animation: 'fadeSlideUp 400ms ease 320ms both'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
              近 6 个月收支趋势
            </h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#6BCB77'
                  }}
                />
                收入
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#FF6B6B'
                  }}
                />
                支出
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6BCB77" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6BCB77" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fill: '#888' }}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v =>
                    v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                    fontSize: '13px'
                  }}
                  labelStyle={{ fontWeight: 600, color: '#333', marginBottom: '8px' }}
                  formatter={(value: number, name: string) => [
                    `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
                    name === 'income' ? '收入' : '支出'
                  ]}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#6BCB77"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    const visible = trendAnim[index]?.visible;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={visible ? 5 : 0}
                        fill="#fff"
                        stroke="#6BCB77"
                        strokeWidth={2}
                        style={{
                          transition: 'r 300ms ease-out',
                          filter: visible ? 'drop-shadow(0 2px 4px rgba(107,203,119,0.4))' : 'none'
                        }}
                      />
                    );
                  }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#FF6B6B"
                  strokeWidth={2.5}
                  fill="url(#expenseGrad)"
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    const visible = trendAnim[index]?.visible;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={visible ? 5 : 0}
                        fill="#fff"
                        stroke="#FF6B6B"
                        strokeWidth={2}
                        style={{
                          transition: 'r 300ms ease-out',
                          transitionDelay: '50ms',
                          filter: visible ? 'drop-shadow(0 2px 4px rgba(255,107,107,0.4))' : 'none'
                        }}
                      />
                    );
                  }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '24px',
            animation: 'fadeSlideUp 400ms ease 400ms both'
          }}
        >
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#333' }}>
            本月分类支出占比
          </h3>
          {pieData.length === 0 ? (
            <div
              style={{
                height: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px'
              }}
            >
              本月暂无支出数据
            </div>
          ) : (
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="48%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(entry.name)}
                        style={{
                          opacity: pieAnim[index]?.visible ? 1 : 0,
                          transition: `opacity 400ms ease ${index * 100}ms`,
                          cursor: 'pointer',
                          filter: pieAnim[index]?.visible
                            ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))'
                            : 'none'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      padding: '12px 16px',
                      fontSize: '13px'
                    }}
                    formatter={(value: number, _name: string, props: any) => {
                      const d = props.payload;
                      return [
                        <div key="tip" style={{ lineHeight: 1.6 }}>
                          <div style={{ fontWeight: 600 }}>¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
                          <div style={{ color: '#888', fontSize: '12px' }}>占比 {d.percent}%</div>
                        </div>,
                        d.name
                      ];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string, entry: any) => {
                      const d = pieData.find(p => p.name === value);
                      return (
                        <span style={{ fontSize: '12px', color: '#555' }}>
                          {value}
                          <span style={{ color: '#999', marginLeft: '4px' }}>
                            {d ? `${d.percent}%` : ''}
                          </span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '24px',
          animation: 'fadeSlideUp 400ms ease 480ms both'
        }}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#333' }}>
          支出分类明细
        </h3>
        {pieData.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>暂无数据</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}
          >
            {pieData.map((item, idx) => {
              const color = getCategoryColor(item.name);
              return (
                <div
                  key={item.name}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: `${color}10`,
                    borderLeft: `3px solid ${color}`,
                    animation: `fadeSlideIn 300ms ease ${idx * 60 + 500}ms both`,
                    transition: 'transform 200ms, box-shadow 200ms'
                  }}
                  className="detail-item"
                >
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: color,
                      fontVariantNumeric: 'tabular-nums',
                      marginBottom: '4px'
                    }}
                  >
                    ¥{item.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>占比 {item.percent}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
