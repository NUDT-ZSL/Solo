import { useState, useEffect, useRef } from 'react';

interface ReportViewProps {
  refreshKey: number;
}

interface ReportData {
  stats: {
    completed: number;
    in_progress: number;
    not_started: number;
    total: number;
  };
  categoryProgress: {
    category: string;
    progress: number;
  }[];
  recentCompleted: {
    nodeId: string;
    name: string;
    category: string;
    status: string;
    completedAt: string;
  }[];
}

const CATEGORY_ICONS: Record<string, string> = {
  '编程': '💻',
  '数学': '📐',
  '设计': '🎨',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#4caf50',
  in_progress: '#ff9800',
  not_started: '#757575',
};

export default function ReportView({ refreshKey }: ReportViewProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchReport();
  }, [refreshKey]);

  async function fetchReport() {
    try {
      const res = await fetch('/api/report');
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  }

  useEffect(() => {
    if (report) {
      drawPieChart();
      drawBarChart();
    }
  }, [report]);

  function drawPieChart() {
    const canvas = pieCanvasRef.current;
    if (!canvas || !report) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    const { completed, in_progress, not_started } = report.stats;
    const total = completed + in_progress + not_started;
    if (total === 0) return;

    const segments = [
      { value: completed, color: STATUS_COLORS.completed, label: '已完成' },
      { value: in_progress, color: STATUS_COLORS.in_progress, label: '进行中' },
      { value: not_started, color: STATUS_COLORS.not_started, label: '未开始' },
    ];

    let startAngle = -Math.PI / 2;

    for (const segment of segments) {
      const sliceAngle = (segment.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#1e1e1e';
      ctx.lineWidth = 3;
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.stroke();

      startAngle = endAngle;
    }

    ctx.beginPath();
    ctx.fillStyle = '#1e1e1e';
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${completionRate.toFixed(0)}%`, centerX, centerY - 8);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('完成率', centerX, centerY + 16);
  }

  function drawBarChart() {
    const canvas = barCanvasRef.current;
    if (!canvas || !report) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 20, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const categories = report.categoryProgress;
    if (categories.length === 0) return;

    const barWidth = 30;
    const barGap = 15;
    const totalBarsWidth = categories.length * barWidth + (categories.length - 1) * barGap;
    const startX = padding.left + (chartWidth - totalBarsWidth) / 2;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${100 - i * 20}%`, padding.left - 8, y);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    categories.forEach((item, index) => {
      const x = startX + index * (barWidth + barGap);
      const barHeight = (item.progress / 100) * chartHeight;
      const y = height - padding.bottom - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
      gradient.addColorStop(0, '#64b5f6');
      gradient.addColorStop(1, '#1565c0');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.progress.toFixed(0)}%`, x + barWidth / 2, y - 10);

      ctx.fillStyle = '#aaa';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.category, x + barWidth / 2, height - padding.bottom + 20);
    });

    ctx.fillStyle = '#888';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('类别', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.fillText('进度 (%)', 0, 0);
    ctx.restore();
  }

  if (!report) {
    return (
      <div>
        <h1 className="page-title">学习报告</h1>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const completionRate = report.stats.total > 0
    ? (report.stats.completed / report.stats.total) * 100
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <h1 className="page-title">学习报告</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stats-card">
          <div className="stats-number">{report.stats.total}</div>
          <div className="stats-label">总知识点</div>
        </div>
        <div className="stats-card">
          <div className="stats-number" style={{ color: '#4caf50' }}>{report.stats.completed}</div>
          <div className="stats-label">已完成</div>
        </div>
        <div className="stats-card">
          <div className="stats-number" style={{ color: '#ff9800' }}>{report.stats.in_progress}</div>
          <div className="stats-label">进行中</div>
        </div>
        <div className="stats-card">
          <div className="stats-number" style={{ color: '#757575' }}>{report.stats.not_started}</div>
          <div className="stats-label">未开始</div>
        </div>
      </div>

      <div className="report-container">
        <div className="report-left">
          <div className="chart-container">
            <h3 className="chart-title">学习状态分布</h3>
            <div style={{ position: 'relative', height: '280px' }}>
              <canvas
                ref={pieCanvasRef}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              {Object.entries({
                completed: { color: STATUS_COLORS.completed, label: '已完成', count: report.stats.completed },
                in_progress: { color: STATUS_COLORS.in_progress, label: '进行中', count: report.stats.in_progress },
                not_started: { color: STATUS_COLORS.not_started, label: '未开始', count: report.stats.not_started },
              }).map(([key, data]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: data.color,
                  }}></div>
                  <span style={{ fontSize: '13px', color: '#aaa' }}>
                    {data.label} ({data.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-container">
            <h3 className="chart-title">分类进度</h3>
            <div style={{ height: '300px' }}>
              <canvas
                ref={barCanvasRef}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="report-right">
          <div className="chart-container">
            <h3 className="chart-title">最近完成</h3>
            {report.recentCompleted.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.recentCompleted.map((item) => (
                  <div key={item.nodeId} className="recent-card">
                    <div
                      className="recent-card-icon"
                      style={{ backgroundColor: `${STATUS_COLORS.completed}20`, color: STATUS_COLORS.completed }}
                    >
                      {CATEGORY_ICONS[item.category] || '📚'}
                    </div>
                    <div className="recent-card-info">
                      <div className="recent-card-title">{item.name}</div>
                      <div className="recent-card-date">{formatDate(item.completedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📚</div>
                <p>还没有完成任何知识点</p>
              </div>
            )}
          </div>

          <div className="chart-container">
            <h3 className="chart-title">总体完成率</h3>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                fontSize: '64px',
                fontWeight: '700',
                color: '#64b5f6',
                marginBottom: '8px',
              }}>
                {completionRate.toFixed(1)}%
              </div>
              <div style={{ color: '#888', fontSize: '14px' }}>
                已完成 {report.stats.completed} / {report.stats.total} 个知识点
              </div>
              <div style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#333',
                borderRadius: '6px',
                marginTop: '20px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${completionRate}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2196f3, #1565c0)',
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
