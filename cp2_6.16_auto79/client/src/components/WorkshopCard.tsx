import { useState, useRef, useEffect } from 'react';
import type { Workshop } from '../types';

interface WorkshopCardProps {
  workshop: Workshop;
  userId: string | null;
  onUpdate: () => void;
}

export default function WorkshopCard({ workshop, userId, onUpdate }: WorkshopCardProps) {
  const [localWorkshop, setLocalWorkshop] = useState<Workshop>(workshop);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalWorkshop(workshop);
  }, [workshop]);

  const participantsCount = localWorkshop.participants.length;
  const maxParticipants = localWorkshop.maxParticipants;
  const percentage = Math.round((participantsCount / maxParticipants) * 100);
  const isRegistered = userId ? localWorkshop.participants.includes(userId) : false;
  const isFull = participantsCount >= maxParticipants;

  const materialsText = Array.isArray(localWorkshop.materials)
    ? localWorkshop.materials.join('、')
    : localWorkshop.materials;
  const materialsSummary = materialsText.length > 50
    ? materialsText.substring(0, 50) + '...'
    : materialsText;

  const handleTooltipShow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const tooltipWidth = 100;
    const tooltipHeight = 28;
    
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltipHeight - 8;
    
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) {
      left = window.innerWidth - tooltipWidth - 8;
    }
    if (top < 8) {
      top = rect.bottom + 8;
    }
    
    setTooltipPosition({ top, left });
    setShowTooltip(true);
  };

  const handleTooltipHide = () => {
    setShowTooltip(false);
  };

  const handleRegister = async () => {
    if (!userId || isLoading) return;

    const prevWorkshop = { ...localWorkshop };
    const newParticipants = [...localWorkshop.participants, userId];
    setLocalWorkshop({ ...localWorkshop, participants: newParticipants });
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/workshops/${localWorkshop.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '报名失败');
      }

      onUpdate();
    } catch (error) {
      setLocalWorkshop(prevWorkshop);
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!userId || isLoading) return;

    const prevWorkshop = { ...localWorkshop };
    const newParticipants = localWorkshop.participants.filter(id => id !== userId);
    setLocalWorkshop({ ...localWorkshop, participants: newParticipants });
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/workshops/${localWorkshop.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '取消报名失败');
      }

      onUpdate();
    } catch (error) {
      setLocalWorkshop(prevWorkshop);
      console.error('Cancel error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          width: '320px',
          height: '220px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#1f2937',
              margin: '0 0 8px 0',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {localWorkshop.title}
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 4px 0',
            }}
          >
            📅 {localWorkshop.date}
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 4px 0',
            }}
          >
            📍 {localWorkshop.location}
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 12px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            🧰 {materialsSummary}
          </p>

          <div style={{ marginBottom: '12px' }}>
            <div
              ref={progressRef}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: '#e5e7db',
                overflow: 'hidden',
                position: 'relative',
              }}
              onMouseEnter={handleTooltipShow}
              onMouseLeave={handleTooltipHide}
            >
              <div
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                textAlign: 'right',
              }}
            >
              {participantsCount}/{maxParticipants}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {isRegistered ? (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              style={{
                width: '120px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
                opacity: isLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              {isLoading ? '处理中...' : '取消报名'}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={isLoading || isFull || !userId}
              style={{
                width: '120px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: isFull ? '#9ca3af' : '#22c55e',
                color: '#ffffff',
                border: 'none',
                cursor: isLoading || isFull || !userId ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
                opacity: isLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading && !isFull && userId) {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isFull ? '#9ca3af' : '#22c55e';
              }}
            >
              {isLoading ? '处理中...' : isFull ? '已满员' : '立即报名'}
            </button>
          )}
        </div>
      </div>

      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {percentage}% 已报名
        </div>
      )}
    </>
  );
}
