import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Question } from '../types';
import './ResultDashboard.css';

interface ResultDashboardProps {
  recordId: string;
}

interface ExamRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: number;
  answers: number[];
  date: string;
  dimensionScores: Record<string, number>;
  wrongQuestions: Question[];
}

const DIMENSIONS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

const ResultDashboard = ({ recordId }: ResultDashboardProps) => {
  const [record, setRecord] = useState<ExamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await fetch(`/api/records/${recordId}`);
        const data = await response.json();
        setRecord(data);
      } catch (error) {
        console.error('获取记录失败', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  useEffect(() => {
    if (!record) return;

    const duration = 1500;
    const startTime = performance.now();
    const startScore = 0;
    const endScore = record.score;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(startScore + (endScore - startScore) * easeOut);
      setDisplayScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [record]);

  useEffect(() => {
    if (!record || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 80;
    const lineWidth = 16;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const scorePercent = displayScore / 100;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + scorePercent * Math.PI * 2;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    if (displayScore >= 60) {
      gradient.addColorStop(0, '#e53e3e');
      gradient.addColorStop(0.5, '#d69e2e');
      gradient.addColorStop(1, '#38a169');
    } else {
      gradient.addColorStop(0, '#e53e3e');
      gradient.addColorStop(1, '#fc8181');
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [displayScore, record]);

  useEffect(() => {
    if (!record || !radarRef.current) return;

    const canvas = radarRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = 110;
    const levels = 5;
    const angleStep = (Math.PI * 2) / DIMENSIONS.length;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    for (let level = levels; level >= 1; level--) {
      const radius = (maxRadius / levels) * level;
      ctx.beginPath();
      for (let i = 0; i <= DIMENSIONS.length; i++) {
        const angle = startAngle + i * angleStep;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = level % 2 === 0 ? 'rgba(49, 130, 206, 0.03)' : 'transparent';
      ctx.fill();
    }

    for (let i = 0; i < DIMENSIONS.length; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(49, 130, 206, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const labelX = centerX + Math.cos(angle) * (maxRadius + 25);
      const labelY = centerY + Math.sin(angle) * (maxRadius + 25);
      ctx.fillStyle = '#4a5568';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(DIMENSIONS[i], labelX, labelY);
    }

    const scores = DIMENSIONS.map(d => record.dimensionScores[d] || 0);

    ctx.beginPath();
    for (let i = 0; i < DIMENSIONS.length; i++) {
      const angle = startAngle + i * angleStep;
      const score = scores[i] / 100;
      const radius = maxRadius * score;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(49, 130, 206, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3182ce';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < DIMENSIONS.length; i++) {
      const angle = startAngle + i * angleStep;
      const score = scores[i] / 100;
      const radius = maxRadius * score;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3182ce';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [record]);

  const generateSuggestions = (dimensionScores: Record<string, number>): string[] => {
    const entries = Object.entries(dimensionScores).sort((a, b) => a[1] - b[1]);
    const weakest = entries.filter(([_, score]) => score < 100);
    const suggestions: string[] = [];

    if (weakest.length > 0) {
      suggestions.push(`建议加强${weakest[0][0]}类题目的练习，目前得分仅为${weakest[0][1]}分`);
    }

    const midScore = entries.find(([_, score]) => score < 80 && score >= 60);
    if (midScore) {
      suggestions.push(`${midScore[0]}方面还有提升空间，建议多做相关专项训练`);
    }

    const strong = entries[entries.length - 1];
    if (strong[1] >= 80) {
      suggestions.push(`${strong[0]}方面掌握较好，继续保持，可以挑战更高难度题目`);
    }

    if (suggestions.length < 3) {
      suggestions.push('建议定期进行模拟考试，保持答题速度和准确率');
    }

    return suggestions.slice(0, 3);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  if (loading) {
    return (
      <div className="result-container">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="result-container">
        <div className="error-text">未找到考试记录</div>
      </div>
    );
  }

  const suggestions = generateSuggestions(record.dimensionScores);

  return (
    <div className="result-container">
      <div className="result-header">
        <h1 className="result-title">考试结果</h1>
        <p className="result-subtitle">
          {record.subjectName} · {dayjs(record.date).format('YYYY年MM月DD日 HH:mm')}
        </p>
      </div>

      <div className="result-content">
        <div className="result-left">
          <div className="score-card card">
            <h3 className="card-title">考试得分</h3>
            <div className="score-ring">
              <canvas ref={canvasRef}></canvas>
              <div className="score-text">
                <span className="score-number">{displayScore}</span>
                <span className="score-unit">分</span>
              </div>
            </div>
            <div className="score-stats">
              <div className="stat-item">
              <span className="stat-value">{record.correctCount}</span>
              <span className="stat-label">答对题数</span>
            </div>
              <div className="stat-item">
              <span className="stat-value">{record.totalQuestions - record.correctCount}</span>
              <span className="stat-label">答错题数</span>
            </div>
              <div className="stat-item">
              <span className="stat-value">{formatDuration(record.duration)}</span>
              <span className="stat-label">用时</span>
            </div>
            </div>
          </div>

          <div className="radar-card card">
            <h3 className="card-title">知识点分析</h3>
            <div className="radar-chart">
              <canvas ref={radarRef}></canvas>
            </div>
            <div className="suggestions">
              <h4 className="suggestions-title">复习建议</h4>
              <ul className="suggestions-list">
                {suggestions.map((s, i) => (
                  <li key={i} className="suggestion-item">
                    <span className="suggestion-icon">💡</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="result-right">
          <div className="wrong-card card">
            <h3 className="card-title">
              错题列表
              <span className="wrong-count">{record.wrongQuestions.length}题</span>
            </h3>
            {record.wrongQuestions.length === 0 ? (
              <div className="no-wrong">
                <p>🎉 恭喜你全部答对了！</p>
              </div>
            ) : (
              <div className="wrong-list">
                {record.wrongQuestions.map((q, index) => (
                  <div key={q.id} className="wrong-item">
                    <div className="wrong-header">
                      <span className="wrong-num">错题 {index + 1}</span>
                      <span className="wrong-dimension">{q.dimension}</span>
                    </div>
                    <div className="wrong-text">{q.text}</div>
                    <div className="wrong-options">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`wrong-option ${
                            optIdx === q.correctAnswer ? 'correct' : ''
                          } ${
                            record.answers[record.totalQuestions - record.wrongQuestions.length + index] === optIdx ? 'selected' : ''
                          }`}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + optIdx)}</span>
                          <span className="option-content">{opt}</span>
                          {optIdx === q.correctAnswer && <span className="correct-tag">正确</span>}
                        </div>
                      ))}
                    </div>
                    <div className="wrong-explanation">
                      <span className="explanation-label">解析：</span>
                      {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="result-actions">
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          返回首页
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>
          查看历史记录
        </button>
      </div>
    </div>
  );
};

export default ResultDashboard;
