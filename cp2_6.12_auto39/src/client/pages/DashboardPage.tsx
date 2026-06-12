import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useInventory } from '../App';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(30, 45, 61, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(74, 158, 255, 0.3)',
        borderRadius: 8,
        padding: '12px 16px',
        color: '#f0f4f8',
      }}>
        <div style={{ fontSize: 13, color: '#8899aa', marginBottom: 6 }}>日期: {label}</div>
        {payload.map((entry, index) => (
          <div key={index} style={{ fontSize: 13, margin: '2px 0' }}>
            <span style={{ color: entry.color, marginRight: 8 }}>●</span>
            {entry.name}: <span style={{ fontWeight: 600 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const { dashboard } = useInventory();

  if (!dashboard) return <div style={{ padding: 24 }}>Loading...</div>;

  const cards = [
    { label: '品类总数', value: dashboard.totalCategories, color: '#4a9eff' },
    { label: '库存总量', value: dashboard.totalQuantity.toLocaleString(), color: '#34d399' },
    { label: '低于安全库存', value: dashboard.lowStockCount, color: '#f87171', highlight: true },
    { label: '即将过期', value: dashboard.expiringCount, color: '#fbbf24', highlight: true },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 700, color: '#fff' }}>仪表盘</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div
            key={card.label}
            className="glass-card"
            style={{
              padding: 20,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
            }}
          >
            <div style={{ color: '#8899aa', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: card.color,
                transition: 'transform 0.3s ease',
              }}
            >
              {card.value}
            </div>
            {card.highlight && card.value > 0 && (
              <div style={{
                display: 'inline-block',
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 4,
                background: card.highlight && card.value > 0 ? (card.label.includes('安全') ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)') : 'transparent',
                color: card.color,
                fontSize: 11,
                fontWeight: 500,
              }}>
                需关注
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="glass-card" style={{ padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, color: '#f0f4f8', fontWeight: 600 }}>近30天出入库趋势</h3>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.trend} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7f94', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                tick={{ fill: '#6b7f94', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span style={{ color: '#8899aa', fontSize: 12 }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="inbound"
                name="入库"
                stroke="#4a9eff"
                strokeWidth={2.5}
                dot={{ fill: '#4a9eff', r: 3 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="outbound"
                name="出库"
                stroke="#f87171"
                strokeWidth={2.5}
                dot={{ fill: '#f87171', r: 3 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
