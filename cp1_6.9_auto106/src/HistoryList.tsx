import { useRef, useEffect, useCallback } from 'react';
import { CardParams, SavedCard } from './types';
import { hexToRgb } from './utils';
import './HistoryList.css';

interface HistoryListProps {
  history: SavedCard[];
  onSelect: (card: CardParams) => void;
  onRefresh: () => void;
}

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 100;

function HistoryList({ history, onSelect, onRefresh }: HistoryListProps) {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement | null>>(new Map());

  const drawThumbnail = useCallback((canvas: HTMLCanvasElement, params: CardParams) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const { baseColor, gradientAngle, glowRadius, glowOpacity, borderRadius, backdropBlur } = params;
    const rgb = hexToRgb(baseColor);
    const rgbaColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : `rgba(102, 126, 234, 0.3)`;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    const angleRad = (gradientAngle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(angleRad) * w;
    const y1 = h / 2 - Math.sin(angleRad) * h;
    const x2 = w / 2 + Math.cos(angleRad) * w;
    const y2 = h / 2 + Math.sin(angleRad) * h;
    const cardGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    cardGrad.addColorStop(0, baseColor + 'cc');
    cardGrad.addColorStop(1, rgbaColor);

    const glowGrad = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) / 2 + glowRadius * 0.5
    );
    glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.15 * glowOpacity})`);
    glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    const padding = 15;
    const cardX = padding;
    const cardY = padding;
    const cardW = w - padding * 2;
    const cardH = h - padding * 2;
    const r = Math.min(borderRadius * 0.6, Math.min(cardW, cardH) / 2);

    ctx.beginPath();
    ctx.moveTo(cardX + r, cardY);
    ctx.lineTo(cardX + cardW - r, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
    ctx.lineTo(cardX + cardW, cardY + cardH - r);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
    ctx.lineTo(cardX + r, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
    ctx.lineTo(cardX, cardY + r);
    ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
    ctx.closePath();
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const shineGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    shineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = shineGrad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨', w / 2, h / 2 - 8);
    ctx.font = '8px system-ui, sans-serif';
    ctx.fillText('光晕卡片', w / 2, h / 2 + 6);
  }, []);

  useEffect(() => {
    history.forEach((card) => {
      const canvas = canvasRefs.current.get(card.id);
      if (canvas) {
        drawThumbnail(canvas, card);
      }
    });
  }, [history, drawThumbnail]);

  const setCanvasRef = (id: string) => (canvas: HTMLCanvasElement | null) => {
    canvasRefs.current.set(id, canvas);
  };

  return (
    <section className="history-section">
      <div className="history-header">
        <h3 className="history-title">
          <span>📜</span> 历史卡片
          <span className="history-count">{history.length}/50</span>
        </h3>
        <button className="refresh-btn" onClick={onRefresh}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          刷新
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">🗂️</div>
          <p>暂无历史记录，快去创建你的第一张卡片吧！</p>
        </div>
      ) : (
        <div className="history-grid">
          {history.slice(0, 50).map((card) => (
            <div
              key={card.id}
              className="history-item"
              onClick={() => onSelect(card)}
              title="点击恢复此卡片样式"
            >
              <canvas
                ref={setCanvasRef(card.id)}
                width={THUMB_WIDTH}
                height={THUMB_HEIGHT}
                className="history-canvas"
              />
              <div className="history-item-overlay">
                <span className="item-time">
                  {new Date(card.createdAt).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default HistoryList;
