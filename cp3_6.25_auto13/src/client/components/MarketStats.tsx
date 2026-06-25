import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Market, Category } from '../types';

interface CategoryDataItem {
  name: string;
  value: number;
}

interface MarketStatsProps {
  market: Market;
}

const COLORS = ['#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0', '#42a5f5', '#26c6da'];

const MarketStats = ({ market }: MarketStatsProps) => {
  const totalStalls = market.totalStalls;
  const bookedStalls = market.stalls.filter(s => s.booked).length;
  const estimatedRevenue = bookedStalls * 100;

  const categoryData: CategoryDataItem[] = market.stalls
    .filter(s => s.booked && s.category)
    .reduce((acc: CategoryDataItem[], stall) => {
      const cat = stall.category as Category;
      const existing = acc.find(item => item.name === cat);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: cat, value: 1 });
      }
      return acc;
    }, []);

  if (categoryData.length === 0) {
    categoryData.push({ name: '暂无数据', value: 1 });
  }

  const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
    rating: rating + '星',
    count: market.feedbacks.filter(f => f.rating === rating).length,
  }));

  return (
    <div className="market-stats fade-in">
      <h2>{market.name} - 活动统计</h2>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="label">总摊位数</div>
          <div className="value">{totalStalls}</div>
        </div>
        <div className="stat-card">
          <div className="label">实际入驻数</div>
          <div className="value">{bookedStalls}</div>
        </div>
        <div className="stat-card">
          <div className="label">交易估算总额</div>
          <div className="value">¥{estimatedRevenue}</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-wrapper">
          <h4>摊位类别分布</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => name + ' ' + Math.round(percent * 100) + '%'}
              >
                {categoryData.map((_, index) => (
                  <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrapper">
          <h4>评分分布</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ratingCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="rating" tick={{ fill: '#6a1b9a', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6a1b9a', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="count" name="评价数量" fill="#ec407a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;