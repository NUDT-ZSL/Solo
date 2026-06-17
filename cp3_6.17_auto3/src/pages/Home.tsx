import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data: Subject[]) => {
        setSubjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelectSubject = useCallback(
    (subject: Subject) => {
      setSelectingId(subject.id);
      setTimeout(() => {
        navigate(`/exam/${subject.id}`);
      }, 550);
    },
    [navigate]
  );

  return (
    <div className="fade-in">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          📝 模考通
        </div>
        <div className="nav-links">
          <span className="nav-link" onClick={() => navigate('/history')}>
            历史成绩
          </span>
          <span className="nav-link" onClick={() => navigate('/admin')}>
            管理后台
          </span>
        </div>
      </nav>

      <div className="page-container">
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#2d3748',
              margin: '0 0 12px',
            }}
          >
            职业资格在线模拟考试
          </h1>
          <p style={{ fontSize: 16, color: '#718096', margin: 0 }}>
            选择科目开始限时模拟考试，系统自动评分并生成错题分析报告
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div
            className="subject-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={`subject-card ${selectingId === subject.id ? 'selecting' : ''}`}
                onClick={() => handleSelectSubject(subject)}
              >
                <div className="subject-card-icon">{subject.icon}</div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#2d3748',
                    margin: '0 0 8px',
                    position: 'relative',
                  }}
                >
                  {subject.name}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: '#718096',
                    lineHeight: 1.6,
                    margin: '0 0 16px',
                    position: 'relative',
                  }}
                >
                  {subject.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 14,
                    borderTop: '1px solid #edf2f7',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: '#a0aec0',
                      fontWeight: 500,
                    }}
                  >
                    {subject.questionCount} 道题 · 60 分钟
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    开始考试 →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            marginTop: 40,
          }}
        >
          <button
            className="btn btn-outline"
            style={{ padding: '0 24px' }}
            onClick={() => navigate('/history')}
          >
            📊 查看历史成绩
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '0 24px' }}
            onClick={() => navigate('/admin')}
          >
            ⚙️ 管理后台
          </button>
        </div>
      </div>
    </div>
  );
}
