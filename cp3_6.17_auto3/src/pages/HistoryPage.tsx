import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamRecord } from '../types';
import { formatDate, formatTime, getScoreColor } from '../utils/helpers';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data: ExamRecord[]) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          📝 模考通
        </div>
        <div className="nav-links">
          <span className="nav-link" onClick={() => navigate('/')}>
            首页
          </span>
          <span className="nav-link" onClick={() => navigate('/admin')}>
            管理后台
          </span>
        </div>
      </nav>

      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0 16px', height: 38, fontSize: 14 }}
            onClick={() => navigate('/')}
          >
            ← 返回首页
          </button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2d3748', margin: '0 0 8px' }}>
          历史成绩
        </h2>
        <p style={{ fontSize: 14, color: '#718096', margin: '0 0 28px' }}>
          最近 {records.length} 次考试记录，点击卡片查看详细分析
        </p>

        {loading ? (
          <div style={{ padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : records.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#a0aec0',
              fontSize: 16,
            }}
          >
            暂无考试记录，去参加一次考试吧！
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 320px)',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            {records.map((record) => {
              const scoreColor = getScoreColor(record.score);
              return (
                <div
                  key={record.id}
                  className="history-card"
                  onClick={() => navigate(`/result/${record.id}`)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>
                      {record.subjectName}
                    </span>
                    <span style={{ fontSize: 12, color: '#a0aec0' }}>
                      {formatDate(record.createdAt)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: scoreColor,
                        lineHeight: 1,
                      }}
                    >
                      {record.score}
                      <span style={{ fontSize: 12, fontWeight: 500 }}>分</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#a0aec0' }}>
                      {formatTime(record.timeTaken)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
