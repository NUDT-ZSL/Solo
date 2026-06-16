import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { VolunteerReport as VolunteerReportType, Skill } from '../types';
import { SKILL_COLORS } from '../types';

interface VolunteerReportProps {
  report: VolunteerReportType | null;
  loading: boolean;
  onSearch: (name: string) => void;
}

const SkeletonLoader: React.FC = () => (
  <>
    <div className="report-stats">
      {[0, 1].map((i) => (
        <div key={i} className="report-stat-item">
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 28 }} />
        </div>
      ))}
    </div>
    <div className="charts-container">
      <div className="chart-wrapper">
        <div className="skeleton skeleton-title" />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
      <div className="chart-wrapper">
        <div className="skeleton skeleton-title" />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    </div>
  </>
);

const VolunteerReport: React.FC<VolunteerReportProps> = ({ report, loading, onSearch }) => {
  const [searchName, setSearchName] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchName.trim()) {
      onSearch(searchName.trim());
    }
  };

  const pieData = useMemo(() => {
    if (!report) return [];
    return report.skillDistribution.map((item) => ({
      ...item,
      fill: SKILL_COLORS[item.name as Skill] || '#999',
    }));
  }, [report]);

  const lineData = useMemo(() => {
    if (!report) return [];
    return report.monthlyTrend;
  }, [report]);

  return (
    <div className="report-section">
      <div className="section-title">📊 个人服务报告</div>
      <form className="report-input-row" onSubmit={handleSearch}>
        <input
          type="text"
          className="form-input"
          placeholder="输入志愿者姓名查询报告"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <button type="submit" className="submit-btn" style={{ width: 'auto', marginTop: 0, padding: '10px 24px' }}>
          查询
        </button>
      </form>

      {loading ? (
        <SkeletonLoader />
      ) : report ? (
        <div className="report-content" key={`report-${report.volunteerName}-${report.totalHours}`}>
          <div className="report-stats">
            <div className="report-stat-item">
              <div className="report-stat-label">总服务时长</div>
              <div className="report-stat-value">{report.totalHours} 小时</div>
            </div>
            <div className="report-stat-item">
              <div className="report-stat-label">参与活动数</div>
              <div className="report-stat-value">{report.activityCount} 个</div>
            </div>
          </div>

          <div className="charts-container">
            <div className="chart-wrapper">
              <div className="chart-title">技能分布</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}小时`, '时长']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 60 }}>暂无技能数据</div>
              )}
            </div>

            <div className="chart-wrapper">
              <div className="chart-title">月度服务趋势</div>
              {lineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value}小时`, '服务时长']} />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#2E86C1"
                      strokeWidth={3}
                      dot={{ fill: '#2E86C1', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="服务时长"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 60 }}>暂无月度数据</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">输入志愿者姓名查看其服务报告</div>
      )}
    </div>
  );
};

export default VolunteerReport;
