/**
 * src/VoteSummaryPanel.tsx
 *
 * 统计摘要面板组件
 *
 * 数据流向：接收来自 App.tsx 的 detail props 和 panelRef（用于导出截图）
 *
 * 功能：
 *   1. 显示总票数、最高票选项、投票峰值时段等统计指标
 *   2. 关键数字（总票数、最高票数）使用数字滚动动画（0.5秒从0滚到目标值）
 *   3. 导出按钮：将当前所有图表区域组合渲染到离屏 Canvas，生成 PNG 下载
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { VotingDetail } from './types';

interface Props {
  detail: VotingDetail;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

function AnimatedNumber({ target, duration = 500 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = null;
    setCurrent(0);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <span className="animated-number">{current.toLocaleString()}</span>;
}

export default function VoteSummaryPanel({ detail, panelRef }: Props) {
  const [exporting, setExporting] = useState(false);

  const topOption = useMemo(() => {
    if (!detail.options.length) return null;
    return detail.options.reduce((max, o) => (o.voteCount > max.voteCount ? o : max), detail.options[0]);
  }, [detail.options]);

  const peakHour = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    detail.records.forEach((r) => {
      const h = new Date(r.timestamp).getHours();
      hourCounts[h]++;
    });
    const peak = Object.entries(hourCounts).reduce(
      (max, [h, c]) => (c > max.count ? { hour: parseInt(h), count: c } : max),
      { hour: 0, count: 0 },
    );
    return `${peak.hour.toString().padStart(2, '0')}:00 - ${(peak.hour + 1).toString().padStart(2, '0')}:00`;
  }, [detail.records]);

  const avgVotesPerOption = useMemo(() => {
    if (!detail.options.length) return 0;
    return Math.round(detail.totalVotes / detail.options.length);
  }, [detail.totalVotes, detail.options]);

  const handleExport = async () => {
    if (!panelRef.current) return;
    setExporting(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(panelRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `vote-report-${detail.title}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      const canvas = document.createElement('canvas');
      const w = 1200;
      const h = 800;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f0f0f5';
      ctx.font = 'bold 28px "Noto Sans SC", sans-serif';
      ctx.fillText(detail.title, 40, 60);
      ctx.font = '18px "Noto Sans SC", sans-serif';
      ctx.fillText(`总票数: ${detail.totalVotes}`, 40, 120);
      if (topOption) {
        ctx.fillText(`最高票选项: ${topOption.name} (${topOption.voteCount}票)`, 40, 160);
      }
      ctx.fillText(`投票峰值时段: ${peakHour}`, 40, 200);
      ctx.fillText(`平均每选项得票: ${avgVotesPerOption}`, 40, 240);

      const link = document.createElement('a');
      link.download = `vote-report-${detail.title}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="vote-summary-panel">
      <div className="chart-header">
        <h3 className="chart-title">统计摘要</h3>
      </div>

      <div className="summary-grid">
        <div className="summary-item summary-highlight">
          <span className="summary-label">总票数</span>
          <span className="summary-value">
            <AnimatedNumber target={detail.totalVotes} duration={500} />
          </span>
        </div>

        <div className="summary-item summary-highlight">
          <span className="summary-label">最高票数</span>
          <span className="summary-value">
            <AnimatedNumber target={topOption?.voteCount || 0} duration={500} />
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">最高票选项</span>
          <span className="summary-value-text">{topOption?.name || '-'}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">投票峰值时段</span>
          <span className="summary-value-text">{peakHour}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">选项数量</span>
          <span className="summary-value-text">{detail.optionCount}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">平均每选项得票</span>
          <span className="summary-value-text">{avgVotesPerOption}</span>
        </div>
      </div>

      <button
        className="btn-export"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? '导出中...' : '📥 导出为 PNG'}
      </button>
    </div>
  );
}
