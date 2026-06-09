import React, { useEffect, useRef } from 'react';
import { Inspiration } from '../types';
import { drawShape } from './utils/drawingUtils';

interface SynthesizeModalProps {
  inspirations: Inspiration[];
  onClose: () => void;
}

const SynthesizeModal: React.FC<SynthesizeModalProps> = ({ inspirations, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const top3 = [...inspirations]
    .sort((a, b) => b.upVotes - b.downVotes - (a.upVotes - a.downVotes))
    .slice(0, 3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(15, 52, 96, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const targetW = canvas.width;
    const targetH = canvas.height;
    const padding = 60;
    const availW = targetW - padding * 2;
    const availH = targetH - padding * 2;

    const sortedBottomToTop = [...top3].reverse();

    sortedBottomToTop.forEach((inspiration, idx) => {
      const shape = inspiration.shape;

      const maxShapeW = availW * (0.4 + idx * 0.15);
      const maxShapeH = availH * (0.4 + idx * 0.15);

      const scaleX = maxShapeW / Math.max(shape.width, 1);
      const scaleY = maxShapeH / Math.max(shape.height, 1);
      const scale = Math.min(scaleX, scaleY, 1.5);

      const positions = [
        { x: targetW * 0.35, y: targetH * 0.55 },
        { x: targetW * 0.6, y: targetH * 0.4 },
        { x: targetW * 0.5, y: targetH * 0.5 }
      ];
      const pos = positions[2 - idx] || { x: targetW / 2, y: targetH / 2 };

      ctx.save();
      ctx.globalAlpha = shape.opacity;
      ctx.fillStyle = shape.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      const cx = pos.x;
      const cy = pos.y;
      const w = shape.width * scale;
      const h = shape.height * scale;

      ctx.translate(cx, cy);
      ctx.rotate(((shape.rotation + (idx - 1) * 10) * Math.PI) / 180);

      switch (shape.type) {
        case 'rectangle':
          ctx.beginPath();
          ctx.rect(-w / 2, -h / 2, w, h);
          ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, (shape.radius || Math.min(w, h) / 2) * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(-w / 2, h / 2);
          ctx.lineTo(w / 2, h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'star':
          drawStar(ctx, 0, 0, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    });
  }, [top3]);

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `creative-masterpiece-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#16213e',
          borderRadius: '16px',
          border: '1px solid #0f3460',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #0f3460',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2 style={{ fontSize: '22px', color: '#e0e0e0', margin: 0 }}>🎨 集体创作大作</h2>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              由投票最高的 Top 3 灵感合成
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: '1px solid #0f3460',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: '24px',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e'
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{
              maxWidth: '100%',
              border: '2px solid #0f3460',
              borderRadius: '12px',
              boxShadow: '0 0 40px rgba(15, 52, 96, 0.3)'
            }}
          />
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #0f3460',
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            {top3.map((inspiration, idx) => {
              const netVotes = inspiration.upVotes - inspiration.downVotes;
              return (
                <div
                  key={inspiration.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '8px',
                    border: '1px solid #0f3460'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>#{idx + 1}</span>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: inspiration.shape.color,
                      borderRadius: '4px',
                      opacity: inspiration.shape.opacity,
                      border: '1px solid #fff'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: netVotes >= 0 ? '#4ECDC4' : '#e94560' }}>
                    {netVotes >= 0 ? '+' : ''}
                    {netVotes}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 28px',
              backgroundColor: '#0f3460',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💾 保存为 PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default SynthesizeModal;
