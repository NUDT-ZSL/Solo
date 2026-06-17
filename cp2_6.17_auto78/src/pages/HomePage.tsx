import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import dayjs from 'dayjs';
import { fetchOrders, fetchLogs, type Order, type Log } from '../api';
import OrderCard from '../components/OrderCard';
import { Link } from 'react-router-dom';

interface StatBar {
  name: string;
  quantity: number;
}

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, logsData] = await Promise.all([
        fetchOrders(),
        fetchLogs(),
      ]);
      setOrders(ordersData);
      setLogs(logsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingOrders = orders.filter((o) => o.status !== 'completed');
  const today = dayjs().format('YYYY-MM-DD');
  const weekStart = dayjs().startOf('week').add(1, 'day');
  const weekEnd = dayjs().endOf('week').add(1, 'day');

  const weekLogs = logs.filter((l) => {
    const d = dayjs(l.date);
    return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd.add(1, 'day'));
  });

  const ingredientMap = new Map<string, number>();
  weekLogs.forEach((log) => {
    log.ingredients.forEach((ing) => {
      const cur = ingredientMap.get(ing.name) || 0;
      ingredientMap.set(ing.name, cur + ing.quantity);
    });
  });

  const chartData: StatBar[] = Array.from(ingredientMap.entries())
    .map(([name, quantity]) => ({ name, quantity: Math.round(quantity * 10) / 10 }))
    .sort((a, b) => b.quantity - a.quantity);

  const totalOrders = orders.length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const newCount = orders.filter((o) => o.status === 'new').length;

  const barColor = (index: number) => {
    if (chartData.length <= 1) return '#388e3c';
    const ratio = index / (chartData.length - 1);
    const start = [165, 214, 167];
    const end = [56, 142, 60];
    const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
    const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
    const b = Math.round(start[2] + (end[2] - start[2]) * ratio);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="home-page">
      <div className="stats-row">
        <div className="stat-card stat-total">
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-label">总订单数</div>
        </div>
        <div className="stat-card stat-new">
          <div className="stat-value">{newCount}</div>
          <div className="stat-label">待处理</div>
        </div>
        <div className="stat-card stat-processing">
          <div className="stat-value">{processingCount}</div>
          <div className="stat-label">制作中</div>
        </div>
        <div className="stat-card stat-completed">
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">已完成</div>
        </div>
      </div>

      <div className="page-section">
        <div className="section-header">
          <h2 className="section-title">📋 待处理订单</h2>
          <Link to="/orders" className="more-link">查看全部 →</Link>
        </div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : pendingOrders.length === 0 ? (
          <div className="empty-state">暂无待处理订单 🎉</div>
        ) : (
          <div className="cards-grid">
            {pendingOrders.slice(0, 6).map((order) => (
              <OrderCard key={order.id} order={order} onUpdate={loadData} />
            ))}
          </div>
        )}
      </div>

      <div className="page-section">
        <div className="section-header">
          <h2 className="section-title">📊 本周原料消耗统计</h2>
          <div className="section-sub">
            {weekStart.format('YYYY/MM/DD')} - {weekEnd.format('YYYY/MM/DD')}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">本周暂无烘焙日志数据</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#555' }} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fill: '#888' } }} />
                <Tooltip
                  formatter={(value: number) => [`${value} kg`, '消耗量']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
                />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColor(index)} />
                  ))}
                  <LabelList dataKey="quantity" position="top" formatter={(v: number) => `${v}kg`} style={{ fontSize: 12, fill: '#388e3c', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
