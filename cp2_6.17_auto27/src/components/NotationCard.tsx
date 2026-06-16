import React, { useEffect, useRef, useState } from 'react';
import { Notation } from '../types';

interface NotationCardProps {
  notation: Notation;
  onClick: (notation: Notation) => void;
  onDragStart: (e: React.DragEvent, notation: Notation) => void;
  isSelected?: boolean;
}

const NotationCard: React.FC<NotationCardProps> = ({ notation, onClick, onDragStart, isSelected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#2c2a26';
    ctx.font = 'bold 28px "Ma Shan Zheng", "ZCOOL XiaoWei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isComplex = notation.upperChar.length > 1 || notation.lowerChar.length > 1;

    if (notation.position === '泛音') {
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 38, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Ma Shan Zheng", serif';
      ctx.fillText('泛', width / 2, height / 2 - 38);
      ctx.fillStyle = '#2c2a26';
    } else if (notation.position === '按音') {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(width / 2 - 22, height / 2 - 50, 44, 4);
      ctx.fillStyle = '#2c2a26';
    }

    const fingerMap: Record<string, string> = {
      '左大指': '大',
      '左食指': '食',
      '左中指': '中',
      '左名指': '名',
      '右大指': '托',
      '右食指': '挑',
      '右中指': '勾',
      '右名指': '打',
      '右食中': '撮'
    };

    const fingerChar = fingerMap[notation.finger] || '';
    if (fingerChar) {
      ctx.font = isComplex ? '16px "Ma Shan Zheng", serif' : '18px "Ma Shan Zheng", serif';
      ctx.fillStyle = '#5c4033';
      ctx.fillText(fingerChar, width / 2, height / 2 - 18);
      ctx.fillStyle = '#2c2a26';
    }

    ctx.font = isComplex ? 'bold 22px "Ma Shan Zheng", serif' : 'bold 28px "Ma Shan Zheng", serif';
    ctx.fillText(notation.upperChar, width / 2, height / 2 + 8);

    ctx.beginPath();
    ctx.moveTo(width / 2 - 35, height / 2 + 24);
    ctx.lineTo(width / 2 + 35, height / 2 + 24);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = isComplex ? '18px "Ma Shan Zheng", serif' : 'bold 22px "Ma Shan Zheng", serif';
    ctx.fillStyle = '#2c2a26';
    ctx.fillText(notation.lowerChar, width / 2, height / 2 + 42);

  }, [notation, isHovered]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, notation)}
      onClick={() => onClick(notation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '180px',
        height: '220px',
        borderRadius: '10px',
        backgroundColor: isSelected ? '#fff8e7' : '#f5f0e8',
        border: `1px solid ${isSelected ? '#e67e22' : '#d4c5a9'}`,
        boxShadow: isHovered
          ? '0 6px 20px rgba(0,0,0,0.18)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s ease-out',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        userSelect: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '140px',
          height: '140px',
          marginBottom: '8px'
        }}
      />
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#2c2a26',
          textAlign: 'center',
          lineHeight: 1.4,
          marginBottom: '4px',
          fontFamily: '"ZCOOL XiaoWei", serif'
        }}
      >
        {notation.name}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#8b5a2b',
          textAlign: 'center',
          fontFamily: '"ZCOOL XiaoWei", serif',
          backgroundColor: 'rgba(139, 90, 43, 0.08)',
          padding: '2px 8px',
          borderRadius: '10px'
        }}
      >
        {notation.huiPosition}
      </div>
    </div>
  );
};

export default NotationCard;
