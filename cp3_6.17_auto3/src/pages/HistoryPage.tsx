import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { ExamRecord } from '../types';
import './HistoryPage.css';

const HistoryPage = () => {
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch('/api/records');
        const data = await response.json();
        setRecords(data);
      } catch (error) {
        console.error('获取历史记录失败', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <div className="header-inner">
          <Link to="/" className="back-link">
            <span>←</span> 返回首页
          </Link>
          <h1 className="history-title">考试历史记录</h1>
          <span className="header-spacer"></span>
        </div>
      </header>

      <main className="history-main">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无考试记录</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              开始第一次考试
            </button>
          </div>
        ) : (
          <div className="records-list">
            <p className="records-count">共 {records.length} 条记录（展示最近10次）</p>
            <div className="records-grid">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="record-card"
                  onClick={() => navigate(`/result/${record.id}`)}
                >
                  <div className="record-left">
                    <div className="record-date">
                      {dayjs(record.date).format('YYYY-MM-DD')}
                    </div>
                    <div className="record-time">
                      {dayjs(record.date).format('HH:mm')}
                    </div>
                    <div className="record-subject">{record.subjectName}</div>
                  </div>
                  <div className="record-right">
                    <div className={`record-score ${getScoreColor(record.score)}`}>
                      {record.score}<span className="score-unit">分</span>
                    </div>
                    <div className="record-stats">
                      <span className="stat">
                        {record.correctCount}/{record.totalQuestions}题
                      </span>
                      <span className="stat">{formatDuration(record.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
