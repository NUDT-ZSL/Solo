import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Subject } from '../types';
import './HomePage.css';

const HomePage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/subjects');
        const data = await response.json();
        setSubjects(data);
      } catch (error) {
        console.error('获取科目列表失败', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const subjectIcons: Record<string, string> = {
    'java-basic': '☕',
    'project-management': '📊',
    'network-security': '🔒',
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">职业资格模拟考试</span>
          </h1>
          <nav className="nav-links">
            <Link to="/history" className="nav-link">历史记录</Link>
            <Link to="/admin" className="nav-link">管理后台</Link>
          </nav>
        </div>
      </header>

      <main className="home-main">
        <div className="hero-section">
          <h2 className="hero-title">选择考试科目</h2>
          <p className="hero-subtitle">选择你要练习的科目，开始模拟考试吧</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : (
          <div className="subject-grid">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => navigate(`/exam/${subject.id}`)}
              >
                <div className="subject-icon">
                  {subjectIcons[subject.id] || '📝'}
                </div>
                <h3 className="subject-name">{subject.name}</h3>
                <p className="subject-desc">{subject.description}</p>
                <div className="subject-info">
                  <span className="info-item">
                    <span className="info-icon">📋</span>
                    {subject.questionCount} 题
                  </span>
                  <span className="info-item">
                    <span className="info-icon">⏱️</span>
                    {subject.duration} 分钟
                  </span>
                </div>
                <button className="start-btn">
                  开始考试
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="home-footer">
        <p>© 2024 职业资格模拟考试系统 | 助力高效备考</p>
      </footer>
    </div>
  );
};

export default HomePage;
