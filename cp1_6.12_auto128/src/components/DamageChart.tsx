import React, { useEffect, useRef } from 'react';
import { DamagePoint, DamageResult } from '../shared/RuneTypes';

interface DamageChartProps {
  damageResult: DamageResult | null;
  comparisonResults?: { name: string; result: DamageResult }[];
}

export const DamageChart: React.FC<DamageChartProps> = ({ damageResult, comparisonResults = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridRows = 5;
    const gridCols = 10;
    for (let i = 0; i <= gridRows; i++) {
      const y = padding.top + (chartH / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
    }
    for (let i = 0; i <= gridCols; i++) {
      const x = padding.left + (chartW / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
    }

    const allCurves: { points: DamagePoint[]; color: string; name: string }[] = [];

    if (damageResult) {
      allCurves.push({
        points: damageResult.damageCurve,
        color: damageResult.elementAdvantageColor || '#00d4ff',
        name: '当前组合',
      });
    }

    comparisonResults.forEach((c) => {
      allCurves.push({
        points: c.result.damageCurve,
        color: c.result.elementAdvantageColor || '#ff6ec7',
        name: c.name,
      });
    });

    let maxDamage = 100;
    allCurves.forEach((c) => {
      c.points.forEach((p) => {
        if (p.cumulativeDamage > maxDamage) maxDamage = p.cumulativeDamage;
      });
    });
    maxDamage = Math.ceil(maxDamage / 100) * 100;

    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.font = '11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridRows; i++) {
      const val = Math.round((maxDamage / gridRows) * (gridRows - i));
      const y = padding.top + (chartH / gridRows) * i;
      ctx.fillText(val.toString(), padding.left - 8, y + 4);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i <= gridCols; i++) {
      const val = i;
      const x = padding.left + (chartW / gridCols) * i;
      ctx.fillText(`${val}s`, x, padding.top + chartH + 20);
    }

    ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
    ctx.font = 'bold 12px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('累计伤害', W / 2, 18);

    ctx.textAlign = 'center';
    ctx.fillText('时间 (秒)', W / 2, H - 8);

    ctx.save();
    ctx.translate(18, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('伤害值', 0, 0);
    ctx.restore();

    const mapX = (time: number) => padding.left + (time / 10) * chartW;
    const mapY = (damage: number) => padding.top + chartH - (damage / maxDamage) * chartH;

    allCurves.forEach((curve, curveIndex) => {
      const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + chartW, 0);
      gradient.addColorStop(0, curve.color + 'ff');
      gradient.addColorStop(0.5, curve.color + 'aa');
      gradient.addColorStop(1, curve.color + 'ff');

      ctx.beginPath();
      ctx.strokeStyle = curve.color + '33';
      ctx.lineWidth = 6;
      curve.points.forEach((p, idx) => {
        const x = mapX(p.time);
        const y = mapY(p.cumulativeDamage);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      curve.points.forEach((p, idx) => {
        const x = mapX(p.time);
        const y = mapY(p.cumulativeDamage);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      curve.points.forEach((p) => {
        if (p.isBurst) {
          const x = mapX(p.time);
          const y = mapY(p.cumulativeDamage);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = curve.color;
          ctx.shadowColor = curve.color;
          ctx.shadowBlur = 10;
          ctx.fillRect(-5, -5, 10, 10);
          ctx.restore();
        }
      });
    });

    if (allCurves.length > 0) {
      const legendX = padding.left + 8;
      let legendY = padding.top + 8;
      allCurves.forEach((c) => {
        ctx.fillStyle = c.color;
        ctx.fillRect(legendX, legendY, 14, 3);
        ctx.fillStyle = 'rgba(224, 224, 224, 0.9)';
        ctx.font = '11px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.name, legendX + 20, legendY + 4);
        legendY += 16;
      });
    }
  }, [damageResult, comparisonResults]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const event = new Event('resize');
      window.dispatchEvent(event);
    };

    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="panel">
      <h2 className="panel-title">伤害输出曲线 (0-10秒)</h2>
      <div ref={containerRef} className="chart-container">
        <canvas ref={canvasRef} />
      </div>
      {damageResult && damageResult.triggeredRules.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 8 }}>
            触发的组合规则:
          </div>
          <div className="rules-list">
            {damageResult.triggeredRules.map((rule) => (
              <div key={rule.id} className="rule-item">
                <div className="rule-item-name">{rule.name}</div>
                <div className="rule-item-desc">{rule.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageChart;
