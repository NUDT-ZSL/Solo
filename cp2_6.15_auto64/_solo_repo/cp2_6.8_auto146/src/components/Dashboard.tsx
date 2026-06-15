import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Product } from '../types';

interface DashboardProps {
  totalSales: number;
  conversionLift: number;
  inventoryTurnover: number;
  products: Product[];
  loading: boolean;
}

const useAnimatedNumber = (targetValue: number, duration: number = 500): number => {
  const [value, setValue] = useState(targetValue);
  const previousValue = useRef(targetValue);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (previousValue.current === targetValue) return;

    const startVal = previousValue.current;
    const endVal = targetValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endVal;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration]);

  return value;
};

const MetricCard: React.FC<{
  type: 'sales' | 'conversion' | 'inventory';
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  loading: boolean;
}> = ({ type, label, value, suffix = '', prefix = '', loading }) => {
  const animatedValue = useAnimatedNumber(value);

  if (loading) {
    return <div className={`metric-card ${type} skeleton skeleton-metric`} />;
  }

  const getInventoryColor = () => {
    if (value < 7) return 'inventory-green';
    if (value <= 14) return 'inventory-orange';
    return 'inventory-red';
  };

  const displayValue = type === 'sales'
    ? animatedValue.toFixed(2)
    : animatedValue.toFixed(1);

  const valueClass = type === 'inventory' ? getInventoryColor() : '';

  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${valueClass}`}>
        {prefix}
        {displayValue}
        {suffix && <span className="unit">{suffix}</span>}
        {type === 'conversion' && <span className="arrow-up">▲</span>}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  totalSales,
  conversionLift,
  inventoryTurnover,
  products,
  loading,
}) => {
  const chartData = products.map((p) => ({
    name: p.name.substring(0, 5),
    活动前: Math.round(p.salesBefore),
    活动后: Math.round(p.salesAfter),
  }));

  return (
    <div className="dashboard">
      <div className="metrics-row">
        <MetricCard
          type="sales"
          label="预估总销售额"
          value={totalSales}
          prefix="¥"
          loading={loading}
        />
        <MetricCard
          type="conversion"
          label="转化率提升"
          value={conversionLift}
          suffix="%"
          loading={loading}
        />
        <MetricCard
          type="inventory"
          label="库存周转天数"
          value={inventoryTurnover}
          suffix="天"
          loading={loading}
        />
      </div>

      <div className="chart-container">
        <div className="chart-title">活动前后销售额对比</div>
        {loading ? (
          <div className="skeleton skeleton-chart" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#718096' }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#718096' }} />
              <Tooltip
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Bar dataKey="活动前" fill="#A0AEC0" barSize={10} radius={[4, 4, 0, 0]} />
              <Bar dataKey="活动后" fill="#3182CE" barSize={10} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
