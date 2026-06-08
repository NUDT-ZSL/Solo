import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import {
  Product,
  PromotionConfig,
  DashboardData,
  SimulationState,
  createInitialSimulationState,
  simulateSecond,
  buildDashboardData,
  generateSimulationReport,
  formatCurrency,
  formatNumber,
} from './utils';

interface Props {
  products: Product[];
  promotions: Map<string, PromotionConfig>;
  onDashboardChange?: (data: DashboardData) => void;
  initialData?: DashboardData | null;
}

const TOTAL_SECONDS = 180;

const Dashboard: React.FC<Props> = ({ products, promotions, onDashboardChange, initialData }) => {
  const [, setSimulationState] = useState<SimulationState>(() =>
    createInitialSimulationState(products)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData>(() => {
    if (initialData) return initialData;
    return buildDashboardData(createInitialSimulationState(products), products);
  });
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<{
    roi: number;
    totalProfit: number;
    topProducts: { name: string; units: number; revenue: number }[];
  } | null>(null);
  const [animatingMetrics, setAnimatingMetrics] = useState<{
    sales: boolean;
    profit: boolean;
    orders: boolean;
  }>({ sales: false, profit: false, orders: false });

  const intervalRef = useRef<number | null>(null);
  const secondCountRef = useRef(0);
  const prevDataRef = useRef(dashboardData);

  useEffect(() => {
    if (initialData) {
      setDashboardData(initialData);
      setSimulationState(createInitialSimulationState(products));
      setElapsedSeconds(0);
      setIsRunning(false);
    }
  }, [initialData, products]);

  useEffect(() => {
    if (
      prevDataRef.current.totalSales !== dashboardData.totalSales ||
      prevDataRef.current.totalProfit !== dashboardData.totalProfit ||
      prevDataRef.current.totalOrders !== dashboardData.totalOrders
    ) {
      setAnimatingMetrics({
        sales: prevDataRef.current.totalSales !== dashboardData.totalSales,
        profit: prevDataRef.current.totalProfit !== dashboardData.totalProfit,
        orders: prevDataRef.current.totalOrders !== dashboardData.totalOrders,
      });
      prevDataRef.current = dashboardData;
      const t = setTimeout(() => {
        setAnimatingMetrics({ sales: false, profit: false, orders: false });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [dashboardData]);

  useEffect(() => {
    onDashboardChange?.(dashboardData);
  }, [dashboardData, onDashboardChange]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startSimulation = () => {
    if (isRunning) return;

    const resetState = createInitialSimulationState(products);
    setSimulationState(resetState);
    setElapsedSeconds(0);
    secondCountRef.current = 0;
    setDashboardData(buildDashboardData(resetState, products));
    setIsRunning(true);
    setShowReport(false);
    setReport(null);

    intervalRef.current = window.setInterval(() => {
      secondCountRef.current += 1;
      const currentSecond = secondCountRef.current;

      setSimulationState((prev) => {
        let newState = simulateSecond(prev, products, promotions);
        newState = {
          ...newState,
          minute: Math.floor((currentSecond - 1) / 6),
        };

        const newDashboard = buildDashboardData(newState, products);
        setDashboardData(newDashboard);

        return newState;
      });

      setElapsedSeconds(currentSecond);

      if (currentSecond >= TOTAL_SECONDS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
        setSimulationState((finalState) => {
          const finalDashboard = buildDashboardData(finalState, products);
          const simReport = generateSimulationReport(finalDashboard, products, promotions);
          setReport(simReport);
          setShowReport(true);
          return finalState;
        });
      }
    }, 1000);
  };

  const progress = (elapsedSeconds / TOTAL_SECONDS) * 100;
  const remainingSeconds = TOTAL_SECONDS - elapsedSeconds;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;

  return (
    <div>
      <div className="simulation-controls">
        <button className="btn btn-primary" onClick={startSimulation} disabled={isRunning}>
          {isRunning ? '⏳ 模拟中...' : '▶ 一键模拟运行'}
        </button>
        <div className="simulation-progress">
          <div className="simulation-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className={`simulation-status ${isRunning ? 'running' : ''}`}>
          {isRunning
            ? `剩余 ${remainingMinutes}:${remainingSecs.toString().padStart(2, '0')}`
            : elapsedSeconds > 0
            ? '模拟完成'
            : '点击开始3分钟模拟'}
        </span>
      </div>

      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-label">总销售额</div>
          <div className={`metric-value ${animatingMetrics.sales ? 'animate' : ''}`}>
            {formatCurrency(dashboardData.totalSales)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">总利润</div>
          <div className={`metric-value ${animatingMetrics.profit ? 'animate' : ''}`}>
            {formatCurrency(dashboardData.totalProfit)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">总订单数</div>
          <div className={`metric-value ${animatingMetrics.orders ? 'animate' : ''}`}>
            {formatNumber(dashboardData.totalOrders)}
            <span className="metric-unit">单</span>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h3>各商品原价收入 vs 活动价收入</h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dashboardData.revenueByProduct.filter((r) => r.originalRevenue > 0 || r.promoRevenue > 0)}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                angle={-35}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar
                dataKey="originalRevenue"
                name="原价收入"
                fill="#1A2A5A"
                radius={[4, 4, 0, 0]}
                animationDuration={500}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="promoRevenue"
                name="活动价收入"
                fill="#FF6B35"
                radius={[4, 4, 0, 0]}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>过去30分钟销量趋势（每分钟）</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboardData.minuteTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="minute"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                label={{ value: '分钟', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                formatter={(value: number) => [`${value} 单`, '销量']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="销量"
                stroke="#FF6B35"
                strokeWidth={3}
                dot={{ fill: '#FF6B35', r: 3 }}
                activeDot={{ r: 6, fill: '#FF6B35' }}
                animationDuration={400}
                animationEasing="ease-out"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showReport && report && (
        <div className="report-overlay" onClick={() => setShowReport(false)}>
          <div className="report-card" onClick={(e) => e.stopPropagation()}>
            <h2>📊 模拟运行报告</h2>
            <div className="report-metrics">
              <div className="report-metric">
                <div className="report-metric-label">投资回报率 (ROI)</div>
                <div className="report-metric-value">{report.roi}%</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-label">活动总利润</div>
                <div className="report-metric-value">{formatCurrency(report.totalProfit)}</div>
              </div>
            </div>
            <div className="report-top-list">
              <h4>🏆 最畅销商品 Top 3</h4>
              {report.topProducts.map((p, idx) => (
                <div className="report-top-item" key={idx}>
                  <div>
                    <span className="report-top-rank">{idx + 1}</span>
                    <span className="report-top-name">{p.name}</span>
                  </div>
                  <div className="report-top-stats">
                    {p.units} 单 · {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowReport(false)}>
              关闭报告
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
