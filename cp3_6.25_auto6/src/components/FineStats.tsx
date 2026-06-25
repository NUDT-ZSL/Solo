import { useState } from 'react';
import { FineStats as FineStatsType } from '../types';

interface FineStatsProps {
  stats: FineStatsType | null;
  loading: boolean;
  error: string | null;
  onReset: () => void;
}

function FineStats({ stats, loading, error, onReset }: FineStatsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!stats) return null;

  const maxCount = Math.max(...stats.weeklyTrend.map(d => d.count), 1);

  const handleReset = () => {
    setShowConfirm(true);
  };

  const confirmReset = () => {
    onReset();
    setShowConfirm(false);
  };

  return (
    <div className="page">
      <div className="stats-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>统计看板</h1>
        <button className="reset-btn" onClick={handleReset} title="重置测试数据">
          ↻
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card books">
          <div className="stat-label">总藏书量</div>
          <div className="stat-value">{stats.totalBooks}</div>
        </div>
        <div className="stat-card borrowed">
          <div className="stat-label">当前借出</div>
          <div className="stat-value">{stats.currentlyBorrowed}</div>
        </div>
        <div className="stat-card monthly">
          <div className="stat-label">本月借阅</div>
          <div className="stat-value">{stats.monthlyBorrows}</div>
        </div>
        <div className="stat-card fines">
          <div className="stat-label">累计滞纳金</div>
          <div className="stat-value">¥{stats.totalFines.toFixed(2)}</div>
        </div>
      </div>

      <div className="chart-container">
        <h2 className="chart-title">近7天借阅趋势</h2>
        <div className="chart">
          {stats.weeklyTrend.map((item, index) => (
            <div key={index} className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{ height: `${(item.count / maxCount) * 250}px` }}
              >
                <div className="chart-tooltip">
                  {item.date}: {item.count} 次
                </div>
              </div>
              <div className="chart-label">{item.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay confirm-modal" onClick={() => setShowConfirm(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">确认重置</h2>
            <div className="modal-body">
              确定要重置所有测试数据吗？此操作将恢复初始书籍数据并清空所有借阅记录，且不可恢复。
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={confirmReset}>
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FineStats;
