import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamResult } from '../types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#38a169';
  if (score >= 70) return '#3182ce';
  if (score >= 60) return '#d69e2e';
  return '#e53e3e';
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/results?limit=10');
        const data: ExamResult[] = await response.json();
        setResults(data);
        setLoading(false);
      } catch (error) {
        console.error('获取历史记录失败:', error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>正在加载...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/')}
          style={{ marginBottom: '24px' }}
        >
          ← 返回首页
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>
          历史成绩记录
        </h1>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          最近 {results.length} 次考试记录
        </p>
      </div>

      {results.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ fontSize: '16px', color: '#718096' }}>
            暂无考试记录，快去参加考试吧！
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map((result) => (
            <div
              key={result.id}
              className="card"
              style={{
                width: '100%',
                maxWidth: '320px',
                height: '80px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
              onClick={() => navigate(`/result/${result.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#2d3748', marginBottom: '4px' }}>
                  {result.subject}
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>
                    {new Date(result.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: getScoreColor(result.score) }}>
                    {Math.round(result.score)}分
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>
                    用时 {formatTime(result.timeUsed)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
