import { useEffect, useState } from 'react';
import { Fish } from './FishSimulation';

interface InfoCardProps {
  fish: Fish | null;
  onClose: () => void;
}

export default function InfoCard({ fish, onClose }: InfoCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (fish) {
      setIsAnimatingOut(false);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [fish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fish) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fish, onClose]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!fish && !isVisible) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        pointerEvents: isAnimatingOut ? 'none' : 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          width: '320px',
          padding: '24px',
          background: 'rgba(30, 58, 95, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          opacity: isVisible && !isAnimatingOut ? 1 : 0,
          transform: isVisible && !isAnimatingOut 
            ? 'translateY(0) scale(1)' 
            : 'translateY(-10px) scale(0.95)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: fish?.color || '#fff',
                boxShadow: `0 0 12px ${fish?.color || '#fff'}`
              }}
            />
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}>
              {fish?.name}
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '4px'
          }}>
            食性
          </div>
          <div style={{
            fontSize: '16px',
            color: '#ffffff',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            {fish?.diet}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px'
          }}>
            趣闻
          </div>
          <p style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.85)'
          }}>
            {fish?.funFact}
          </p>
        </div>

        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.4)',
          fontStyle: 'italic'
        }}>
          点击卡片外区域或按 ESC 关闭
        </div>
      </div>
    </div>
  );
}
