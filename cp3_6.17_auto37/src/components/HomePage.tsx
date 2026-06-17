import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects');
        const data: Subject[] = await response.json();
        setSubjects(data);
        setLoading(false);
      } catch (error) {
        console.error('获取科目列表失败:', error);
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const startExam = (subjectId: string) => {
    navigate(`/exam/${subjectId}`);
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>正在加载...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '48px', paddingTop: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' }}>
          职业资格在线模拟考试系统
        </h1>
        <p style={{ fontSize: '16px', color: '#718096' }}>
          选择科目，开始您的模拟考试之旅
        </p>
      </div>

      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/history')}
          style={{ marginRight: '12px' }}
        >
          历史成绩
        </button>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin')}
        >
          管理后台
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        {subjects.map(subject => (
          <div
            key={subject.id}
            className="card"
            style={{
              padding: '24px',
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
            onClick={() => startExam(subject.id)}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3182ce 0%, #00b5d8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: '16px',
            }}>
              {subject.name.charAt(0)}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>
              {subject.name}
            </h3>
            <p style={{ fontSize: '14px', color: '#718096', marginBottom: '16px', lineHeight: 1.6 }}>
              {subject.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#a0aec0' }}>
              <span>{subject.questionCount} 道题目</span>
              <span>{subject.duration} 分钟</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={(e) => {
                e.stopPropagation();
                startExam(subject.id);
              }}
            >
              开始考试
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
