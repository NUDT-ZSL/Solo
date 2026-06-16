import React, { useEffect, useRef, useState } from 'react';
import { Notation } from '../types';

interface FingeringDemoProps {
  notation: Notation | null;
  onClose: () => void;
}

const FingeringDemo: React.FC<FingeringDemoProps> = ({ notation, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (notation) {
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [notation]);

  useEffect(() => {
    if (!notation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 340;
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let frame = 0;
    const fpsInterval = 1000 / 30;
    let lastTime = 0;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      if (elapsed >= fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);
        frame++;
        drawFrame(frame);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const drawFrame = (f: number) => {
      ctx.clearRect(0, 0, width, height);

      const stringsY = [50, 75, 100, 125, 150, 175, 200];
      const stringLabels = ['一', '二', '三', '四', '五', '六', '七'];

      stringsY.forEach((y, idx) => {
        const thickness = 4 - idx * 0.35;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 30, y);
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = Math.max(thickness, 1);
        ctx.stroke();

        ctx.fillStyle = '#a0896b';
        ctx.font = '12px "Ma Shan Zheng", serif';
        ctx.textAlign = 'right';
        ctx.fillText(stringLabels[idx], 38, y + 4);
      });

      const huiMarkers = [
        { x: 85, label: '十三' }, { x: 125, label: '十' }, { x: 155, label: '九' },
        { x: 190, label: '八' }, { x: 220, label: '七' }, { x: 255, label: '六' },
        { x: 290, label: '五' }
      ];

      huiMarkers.forEach((m) => {
        ctx.beginPath();
        ctx.arc(m.x, 125, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#d4a373';
        ctx.fill();
        ctx.fillStyle = '#8b5a2b';
        ctx.font = '9px "ZCOOL XiaoWei", serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, m.x, 218);
      });

      const progress = (f % 90) / 90;
      const pluckPhase = progress < 0.35 ? progress / 0.35 : 1;
      const pressPhase = progress < 0.3 ? progress / 0.3 : 1;
      const releasePhase = progress > 0.7 ? (progress - 0.7) / 0.3 : 0;

      const stringIdx = Math.min(
        6,
        Math.max(0, 7 - Number(String(notation.string).charAt(0)))
      );
      const stringY = stringsY[stringIdx];
      const fingerX = notation.position === '散音' ? 45 : 210;

      const pluckX = 70 - (pluckPhase * 12) + (releasePhase * 8);
      const pluckY = stringY - 8 + Math.sin(pluckPhase * Math.PI) * 12;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(pluckX + 10, pluckY + 2, 16, 10, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(44, 42, 38, 0.15)';
      ctx.fill();
      ctx.fillStyle = 'rgba(44, 42, 38, 0.75)';
      ctx.fill();
      ctx.strokeStyle = '#2c2a26';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      const fingertipX = pluckX;
      const fingertipY = pluckY;
      ctx.moveTo(fingertipX, fingertipY);
      ctx.quadraticCurveTo(pluckX + 5, pluckY - 14, pluckX + 18, pluckY - 8);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(44, 42, 38, 0.85)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(fingertipX, fingertipY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = progress < 0.32 && progress > 0.08 ? '#e74c3c' : 'rgba(231, 76, 60, 0.4)';
      ctx.fill();
      ctx.restore();

      if (notation.position !== '散音') {
        const pressY = stringY + 6 - (pressPhase * 9) + (releasePhase * 9);
        const actualFingerX = fingerX - (releasePhase * 5);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(actualFingerX, pressY + 8, 14, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(44, 42, 38, 0.12)';
        ctx.fill();
        ctx.fillStyle = 'rgba(44, 42, 38, 0.75)';
        ctx.fill();
        ctx.strokeStyle = '#2c2a26';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(actualFingerX, pressY);
        ctx.quadraticCurveTo(actualFingerX - 3, pressY - 18, actualFingerX - 14, pressY - 14);
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(44, 42, 38, 0.85)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(actualFingerX, pressY - 1, 5, 0, Math.PI * 2);
        ctx.fillStyle = pressPhase > 0.3 && releasePhase < 0.5 ? '#e74c3c' : 'rgba(231, 76, 60, 0.45)';
        ctx.fill();

        if (pressPhase > 0.4 && releasePhase < 0.6) {
          ctx.beginPath();
          ctx.arc(actualFingerX, pressY - 1, 10, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(231, 76, 60, 0.12)';
          ctx.fill();
        }
        ctx.restore();
      }

      if (progress > 0.1 && progress < 0.55) {
        const waveAlpha = 1 - ((progress - 0.1) / 0.45);
        const spread = (progress - 0.1) / 0.45 * 60;
        ctx.beginPath();
        ctx.ellipse(90, stringY, 10 + spread * 0.6, 3 + spread * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139, 90, 43, ${waveAlpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [notation]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!notation) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '400px',
          height: '320px',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          transform: isClosing
            ? 'scaleX(0)'
            : isVisible
            ? 'scale(1)'
            : 'scale(0.8)',
          opacity: isClosing ? 0 : isVisible ? 1 : 0,
          transformOrigin: 'center',
          transition: isClosing
            ? 'transform 0.2s ease, opacity 0.2s ease'
            : 'transform 0.3s ease, opacity 0.3s ease'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '20px',
                fontFamily: '"Ma Shan Zheng", serif',
                color: '#2c2a26'
              }}
            >
              {notation.name}
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12px',
                color: '#8b5a2b',
                fontFamily: '"ZCOOL XiaoWei", serif'
              }}
            >
              {notation.position} · {notation.finger} · {notation.huiPosition}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f5f0e8',
              color: '#8b5a2b',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e8ddcb';
              e.currentTarget.style.filter = 'hue-rotate(-10deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f0e8';
              e.currentTarget.style.filter = 'hue-rotate(0)';
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#faf5ef',
            borderRadius: '10px',
            border: '1px solid #e6dcd0',
            overflow: 'hidden'
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          {['散音', '按音', '泛音'].map((t) => (
            <span
              key={t}
              style={{
                padding: '3px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontFamily: '"ZCOOL XiaoWei", serif',
                backgroundColor:
                  notation.position === t
                    ? t === '散音'
                      ? '#f5f0e8'
                      : t === '按音'
                      ? '#efe0cc'
                      : '#e6ccb2'
                    : '#f5f0e8',
                color: notation.position === t ? '#8b5a2b' : '#a0896b',
                border:
                  notation.position === t
                    ? '1px solid #d4a373'
                    : '1px solid #e6dcd0',
                fontWeight: notation.position === t ? 600 : 400
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FingeringDemo;
