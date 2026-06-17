import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamResult } from '../types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

const getGradientColor = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, score: number) => {
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.2);
  if (score >= 90) {
    gradient.addColorStop(0, '#68d391');
    gradient.addColorStop(1, '#2f855a');
  } else if (score >= 70) {
    gradient.addColorStop(0, '#63b3ed');
    gradient.addColorStop(1, '#2b6cb0');
  } else if (score >= 60) {
    gradient.addColorStop(0, '#f6e05e');
    gradient.addColorStop(1, '#b7791f');
  } else {
    gradient.addColorStop(0, '#fc8181');
    gradient.addColorStop(1, '#c53030');
  }
  return gradient;
};

const drawRingChart = (canvas: HTMLCanvasElement, score: number, animated: boolean) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const size = 200;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 75;
  const lineWidth = 12;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  const displayScore = animated ? score : 0;
  const endAngle = -Math.PI / 2 + (displayScore / 100) * Math.PI * 2;
  const gradient = getGradientColor(ctx, centerX, centerY, radius, score);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = '#2d3748';
  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(displayScore)}`, centerX, centerY - 8);

  ctx.fillStyle = '#718096';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('分', centerX, centerY + 22);
};

const KNOWLEDGE_POINTS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

const drawRadarChart = (canvas: HTMLCanvasElement, scores: Record<string, number>) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const size = 280;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 100;
  const levels = 5;
  const angleStep = (Math.PI * 2) / KNOWLEDGE_POINTS.length;

  ctx.clearRect(0, 0, size, size);

  for (let i = levels; i >= 1; i--) {
    const r = (radius / levels) * i;
    ctx.beginPath();
    for (let j = 0; j < KNOWLEDGE_POINTS.length; j++) {
      const angle = j * angleStep - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(49, 130, 206, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (i === levels) {
      ctx.fillStyle = 'rgba(49, 130, 206, 0.05)';
      ctx.fill();
    }
  }

  for (let j = 0; j < KNOWLEDGE_POINTS.length; j++) {
    const angle = j * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(49, 130, 206, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  for (let j = 0; j < KNOWLEDGE_POINTS.length; j++) {
    const angle = j * angleStep - Math.PI / 2;
    const score = scores[KNOWLEDGE_POINTS[j]] || 0;
    const r = (radius * score) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (j === 0) {
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

  for (let j = 0; j < KNOWLEDGE_POINTS.length; j++) {
    const angle = j * angleStep - Math.PI / 2;
    const score = scores[KNOWLEDGE_POINTS[j]] || 0;
    const r = (radius * score) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3182ce';
    ctx.fill();
  }

  for (let j = 0; j < KNOWLEDGE_POINTS.length; j++) {
    const angle = j * angleStep - Math.PI / 2;
    const labelRadius = radius + 25;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    ctx.fillStyle = '#2d3748';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(KNOWLEDGE_POINTS[j], x, y);
  }
};

export default function ResultDashboard() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const ringCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/results/${resultId}`);
        const data: ExamResult = await response.json();
        setResult(data);
        setLoading(false);

        const duration = 1500;
        const startTime = performance.now();
        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutProgress = 1 - Math.pow(1 - progress, 3);
          setAnimatedScore(data.score * easeOutProgress);
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      } catch (error) {
        console.error('获取结果失败:', error);
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  useEffect(() => {
    if (result && ringCanvasRef.current) {
      drawRingChart(ringCanvasRef.current, animatedScore, true);
    }
  }, [result, animatedScore]);

  useEffect(() => {
    if (result && radarCanvasRef.current) {
      drawRadarChart(radarCanvasRef.current, result.knowledgeScores);
    }
  }, [result]);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>正在加载结果...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>未找到考试结果</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>
          考试结果
        </h1>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          {result.subject} · {new Date(result.createdAt).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="result-grid">
        <div>
          <div className="card" style={{ padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
            <canvas ref={ringCanvasRef} style={{ display: 'block', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#38a169' }}>{result.correctCount}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>答对</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#e53e3e' }}>{result.totalQuestions - result.correctCount}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>答错</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#3182ce' }}>{formatTime(result.timeUsed)}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>用时</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748', marginBottom: '16px', textAlign: 'center' }}>
              知识点能力分析
            </h3>
            <canvas ref={radarCanvasRef} style={{ display: 'block', margin: '0 auto' }} />
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748', marginBottom: '16px' }}>
              复习建议
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {result.suggestions.map((suggestion, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '8px',
                }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ fontSize: '14px', color: '#4a5568', lineHeight: 1.6 }}>
                    {suggestion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748', marginBottom: '16px' }}>
              错题列表 ({result.wrongAnswers.length} 题)
            </h3>
            {result.wrongAnswers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
                太棒了！没有错题 🎉
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.wrongAnswers.map((item, index) => (
                  <div key={index} style={{
                    backgroundColor: '#fff5f5',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #fed7d7',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#2d3748', marginBottom: '12px', lineHeight: 1.6 }}>
                      <span style={{ color: '#e53e3e', marginRight: '8px' }}>第{index + 1}题</span>
                      {item.question.text}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: '#718096' }}>你的答案：</span>
                      <span style={{ color: '#e53e3e' }}>
                        {String.fromCharCode(65 + item.selected)}. {item.question.options[item.selected]}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: '#718096' }}>正确答案：</span>
                      <span style={{ color: '#38a169', fontWeight: 500 }}>
                        {String.fromCharCode(65 + item.question.correctAnswer)}. {item.question.options[item.question.correctAnswer]}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', backgroundColor: 'white', padding: '10px', borderRadius: '6px', marginTop: '8px' }}>
                      <span style={{ color: '#3182ce', fontWeight: 500 }}>解析：</span>
                      {item.question.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          返回首页
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/history')}>
          查看历史记录
        </button>
      </div>
    </div>
  );
}
