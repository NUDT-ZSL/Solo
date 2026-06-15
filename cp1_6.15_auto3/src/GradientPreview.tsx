import React, { useEffect, useState } from 'react';

interface GradientPreviewProps {
  gradientCss: string;
  isAnimating?: boolean;
}

const GradientPreview: React.FC<GradientPreviewProps> = ({ gradientCss, isAnimating = false }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={styles.previewContainer}>
      <div
        style={{
          ...styles.previewBox,
          background: gradientCss,
          height: isMobile ? '300px' : '450px',
          transform: isAnimating ? 'scale(0.96)' : 'scale(1)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease'
        }}
      >
        <div style={styles.previewOverlay}>
          <div style={styles.previewLabel}>预览区域</div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  previewContainer: {
    width: '100%'
  },
  previewBox: {
    width: '100%',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    border: '1px solid #3E3E3E'
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: '16px',
    pointerEvents: 'none'
  },
  previewLabel: {
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#fff',
    fontWeight: 500
  }
};

export default GradientPreview;
