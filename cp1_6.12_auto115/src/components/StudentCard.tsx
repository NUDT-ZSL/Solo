import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { StudentStatus } from '../types';

interface StudentCardProps {
  id: string;
  name: string;
  currentQuestion: number;
  totalQuestions: number;
  accuracy: number;
  status: StudentStatus;
  onClick: () => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
  isEditing: boolean;
}

function getAccuracyGradient(accuracy: number): string {
  if (accuracy >= 90) {
    const t = (accuracy - 90) / 10;
    const r1 = 144, g1 = 238, b1 = 144;
    const r2 = 0, g2 = 180, b2 = 0;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  } else if (accuracy >= 60) {
    const t = (accuracy - 60) / 30;
    const r1 = 255, g1 = 165, b1 = 0;
    const r2 = 255, g2 = 255, b2 = 224;
    const r = Math.round(r2 + (r1 - r2) * (1 - t));
    const g = Math.round(g2 + (g1 - g2) * (1 - t));
    const b = Math.round(b2 + (b1 - b2) * (1 - t));
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  } else {
    const t = accuracy / 60;
    const r1 = 139, g1 = 0, b1 = 0;
    const r2 = 255, g2 = 182, b2 = 193;
    const r = Math.round(r2 + (r1 - r2) * (1 - t));
    const g = Math.round(g2 + (g1 - g2) * (1 - t));
    const b = Math.round(b2 + (b1 - b2) * (1 - t));
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  }
}

const StatusIcon: React.FC<{ status: StudentStatus }> = React.memo(({ status }) => {
  if (status === 'normal') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="status-icon status-normal"
        style={{ transition: 'all 0.3s ease-in-out' }}
      >
        <circle cx="10" cy="10" r="9" fill="#27AE60" />
        <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'stuck') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="status-icon status-stuck"
        style={{ transition: 'all 0.3s ease-in-out' }}
      >
        <style>{`
          @keyframes hourglass-swing {
            0%, 100% { transform: rotate(-15deg); }
            50% { transform: rotate(15deg); }
          }
          .hourglass-swing {
            animation: hourglass-swing 1.2s ease-in-out infinite;
            transform-origin: 10px 10px;
          }
        `}</style>
        <g className="hourglass-swing">
          <circle cx="10" cy="10" r="9" fill="#F39C12" />
          <path d="M7 6h6l-3 4 3 4H7l3-4z" fill="#fff" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="status-icon status-timeout"
      style={{ transition: 'all 0.3s ease-in-out' }}
    >
      <style>{`
        @keyframes pulse-exclamation {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pulse-exclamation {
          animation: pulse-exclamation 0.6s ease-in-out infinite;
        }
      `}</style>
      <g className="pulse-exclamation">
        <circle cx="10" cy="10" r="9" fill="#E74C3C" />
        <text x="10" y="14.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">!</text>
      </g>
    </svg>
  );
});
StatusIcon.displayName = 'StatusIcon';

const StudentCard: React.FC<StudentCardProps> = React.memo(({
  id,
  name,
  currentQuestion,
  totalQuestions,
  accuracy,
  status,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  isEditing,
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0;
  const bgColor = getAccuracyGradient(accuracy);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      setIsPressed(false);
    }, 1000);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(id);
  }, [id, isEditing, onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDrop(id);
  }, [id, onDrop]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const borderColor = isEditing ? '#E74C3C' : '#00D4FF';
  const borderStyle = isEditing ? 'dashed' : 'solid';
  const borderWidth = isEditing ? '2px' : '1px';

  return (
    <div
      className="student-card"
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        width: '120px',
        height: '160px',
        borderRadius: '16px',
        padding: '12px',
        background: bgColor,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `${borderWidth} ${borderStyle} ${borderColor}`,
        cursor: isEditing ? 'grab' : 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border 0.3s ease-in-out, background 0.3s ease-in-out',
        boxShadow: isDragging
          ? '0 12px 32px rgba(0, 212, 255, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        transform: isDragging ? 'scale(1.05)' : undefined,
        opacity: isDragging ? 0.7 : 1,
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0, 212, 255, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
      }}
    >
      <div className="student-card-status" style={{ position: 'absolute', top: '8px', right: '8px' }}>
        <StatusIcon status={status} />
      </div>

      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#E0E0E0',
        textAlign: 'center',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '90px',
      }}>
        {name}
      </div>

      <div style={{
        fontSize: '11px',
        color: '#00D4FF',
        fontWeight: 500,
      }}>
        第 {currentQuestion}/{totalQuestions} 题
      </div>

      <div style={{
        width: '100%',
        height: '4px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: '2px',
          background: '#00D4FF',
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        color: accuracy >= 90 ? '#27AE60' : accuracy >= 60 ? '#F39C12' : '#E74C3C',
        transition: 'color 0.3s ease-in-out',
      }}>
        {accuracy}%
      </div>

      <div style={{
        fontSize: '10px',
        color: 'rgba(224,224,224,0.6)',
      }}>
        正确率
      </div>
    </div>
  );
});
StudentCard.displayName = 'StudentCard';

export default StudentCard;
