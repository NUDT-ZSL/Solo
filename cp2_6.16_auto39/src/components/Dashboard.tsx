import { useState, useEffect, useCallback } from 'react';
import { StatsResponse, FitnessRecord, getRecordsByType } from '../api';
import type { ViewMode } from '../App';
import {
  DurationTrendChart,
  WeeklyTypeStackedChart,
  WeeklyDualChart,
  MonthlyStackedChart,
  MonthlyHeartRateChart,
  TypePieChart,
} from './Charts';

interface DashboardProps {
  loading: boolean;
  stats: StatsResponse | null;
  viewMode: ViewMode;
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  onCloseTypePanel: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Dashboard({
  loading,
  stats,
  viewMode,
  selectedType,
  onSelectType,
  onCloseTypePanel,
}: DashboardProps) {
  const [typeRecords, setTypeRecords] = useState<FitnessRecord[]>([]);
  const [typeRecordsLoading, setTypeRecordsLoading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(k => k + 1);
  }, [viewMode]);

  useEffect(() => {
    if (!selectedType) {
      setTypeRecords([]);
      return;
    }

    let cancelled = false;
    setTypeRecordsLoading(true);

    getRecordsByType(selectedType)
      .then(result => {
        if (!cancelled) {
          setTypeRecords(result.records);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTypeRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTypeRecordsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedType]);

  const handleBarClick = useCallback((type: string) => {
    onSelectType(type);
  }, [onSelectType]);

  if (loading || !stats) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏃</div>
            <div>{loading ? '加载数据中...' : '暂无数据，请添加训练记录'}</div>
          </div>
        </div>
      </div>
    );
  }

  const { weekly, monthly, exerciseTypes } = stats;

  return (
    <div className="dashboard">
      {viewMode === 'dashboard' && (
        <div key={`dash-${animationKey}`} style={{ animation: 'fadeIn 0.4s ease' }}>
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">本周总运动时长</div>
              <div>
                <span className="kpi-value">{weekly.totalDuration}</span>
                <span className="kpi-unit">分钟</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">本周日均心率</div>
              <div>
                <span className="kpi-value">{weekly.avgHeartRate}</span>
                <span className="kpi-unit">bpm</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">本周累计消耗</div>
              <div>
                <span className="kpi-value">{weekly.totalCalories.toLocaleString()}</span>
                <span className="kpi-unit">千卡</span>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title">📈 近7天运动时长趋势</div>
              <DurationTrendChart data={weekly.dailyTrend} />
            </div>
            <div className="chart-card">
              <div className="chart-title">🧩 本周运动类型时长分布（点击查看详情）</div>
              {weekly.typeDistribution.length > 0 ? (
                <WeeklyTypeStackedChart
                  data={weekly.typeDistribution}
                  onBarClick={handleBarClick}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-text">暂无运动数据</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'weekly' && (
        <div key={`week-${animationKey}`} className="report-container">
          <div className="report-summary">
            <div className="summary-item">
              <div className="summary-label">本周总时长</div>
              <div className="summary-value">{weekly.totalDuration}<span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '4px', color: '#a0a0c0' }}>分钟</span></div>
            </div>
            <div className="summary-item">
              <div className="summary-label">出勤天数</div>
              <div className="summary-value">{weekly.activeDays}<span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '4px', color: '#a0a0c0' }}>天</span></div>
            </div>
            <div className="summary-item">
              <div className="summary-label">最佳运动日</div>
              <div className="summary-value small" style={{ fontSize: '18px' }}>{weekly.bestDay ? formatDate(weekly.bestDay) : '—'}</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card full-width">
              <div className="chart-title">📊 本周每日运动时长 & 平均心率</div>
              <WeeklyDualChart data={weekly.dailyTrend} height={340} />
            </div>
            <div className="chart-card full-width">
              <div className="chart-title">🧩 本周运动类型分布（点击查看详情）</div>
              {weekly.typeDistribution.length > 0 ? (
                <WeeklyTypeStackedChart
                  data={weekly.typeDistribution}
                  onBarClick={handleBarClick}
                  height={260}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-text">暂无运动数据</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <div key={`month-${animationKey}`} className="report-container">
          <div className="charts-grid">
            <div className="chart-card full-width">
              <div className="chart-title">📊 近4周各运动类型时长分布（点击查看详情）</div>
              <MonthlyStackedChart
                data={monthly.stackedByWeek}
                exerciseTypes={exerciseTypes}
                onBarClick={handleBarClick}
                height={320}
              />
            </div>
            <div className="chart-card">
              <div className="chart-title">❤️ 月度平均心率趋势</div>
              <MonthlyHeartRateChart data={monthly.stackedByWeek} />
            </div>
            <div className="chart-card">
              <div className="chart-title">🎯 月度运动类型占比</div>
              {monthly.typeDistribution.length > 0 ? (
                <TypePieChart data={monthly.typeDistribution} height={280} />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-text">暂无月度数据</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className={`sidebar-overlay ${selectedType ? 'open' : ''}`}
        onClick={onCloseTypePanel}
      />
      <div className={`sidebar-panel ${selectedType ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3 className="sidebar-title">🏃 {selectedType || ''} · 近30天记录</h3>
          <button className="sidebar-close" onClick={onCloseTypePanel}>×</button>
        </div>

        {typeRecordsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b6b8b' }}>
            加载中...
          </div>
        ) : typeRecords.length > 0 ? (
          <>
            <div style={{ padding: '12px', backgroundColor: 'rgba(124,77,255,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a0a0c0' }}>
                <span>共 {typeRecords.length} 条记录</span>
                <span>总时长: {typeRecords.reduce((s, r) => s + r.duration, 0)} 分钟</span>
              </div>
            </div>
            <table className="records-table">
              <thead>
                <tr>
                  <th>日期时间</th>
                  <th>时长</th>
                  <th>强度</th>
                  <th>心率</th>
                </tr>
              </thead>
              <tbody>
                {typeRecords.map(record => (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.createdAt)}</td>
                    <td>{record.duration}分</td>
                    <td>{record.intensity}/10</td>
                    <td>{record.avgHeartRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">📭</div>
            <div className="empty-text">近30天暂无该运动记录</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
