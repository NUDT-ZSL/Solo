import React, { useEffect, useRef } from 'react';
import { Contributor } from '../types';
import { drawRadarChart } from '../utils/radarChart';

interface UserDetailProps {
  contributor: Contributor | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetail: React.FC<UserDetailProps> = ({ contributor, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawChart = () => {
    if (isOpen && contributor && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width - 32, 320);
        const canvasSize = Math.max(size, 240);

        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRadarChart(ctx, contributor.skills, canvasSize, canvasSize);
      }
    }
  };

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, contributor]);

  if (!contributor) return null;

  const stats = [
    { label: '提交数', value: contributor.commits },
    { label: '代码行+/-', value: `+${contributor.linesAdded.toLocaleString()}/-${contributor.linesDeleted.toLocaleString()}` },
    { label: 'Issue数', value: contributor.issues },
    { label: 'PR数', value: contributor.pullRequests }
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          ...styles.overlay,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      />
      <div style={{
        ...styles.panel,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
      }}>
        <div style={styles.header}>
          <div style={styles.userInfo}>
            <img
              src={contributor.avatar}
              alt={contributor.username}
              style={styles.avatarLarge}
            />
            <div>
              <h2 style={styles.username}>{contributor.username}</h2>
              <p style={styles.subtitle}>贡献者详情</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>

        <div style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} style={styles.statCard}>
              <span style={styles.statLabel}>{stat.label}</span>
              <span style={styles.statValue}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>技能雷达图</h3>
          <div ref={containerRef} style={styles.radarContainer}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>贡献时间线</h3>
          <div style={styles.timelineContainer}>
            {contributor.timeline?.map((event) => (
              <div key={event.id} style={styles.timelineItem}>
                <div
                  style={{
                    ...styles.timelineDot,
                    backgroundColor: event.isActive ? '#6366f1' : '#cbd5e1'
                  }}
                />
                <div style={styles.timelineContent}>
                  <span style={styles.timelineDate}>{event.date}</span>
                  <span style={styles.timelineDesc}>{event.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 99,
    transition: 'opacity 0.3s ease'
  },
  panel: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
    minWidth: '400px',
    maxWidth: '500px',
    backgroundColor: '#ffffff',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    transition: 'transform 0.3s ease',
    overflowY: 'auto' as const,
    padding: '24px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px'
  } as React.CSSProperties,
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  } as React.CSSProperties,
  avatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '3px solid #e2e8f0'
  } as React.CSSProperties,
  username: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0
  } as React.CSSProperties,
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0'
  } as React.CSSProperties,
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  } as React.CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px'
  } as React.CSSProperties,
  statCard: {
    width: '100%',
    height: '100px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px',
    boxSizing: 'border-box'
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '6px'
  } as React.CSSProperties,
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#6366f1'
  } as React.CSSProperties,
  section: {
    marginBottom: '24px'
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0'
  } as React.CSSProperties,
  radarContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  } as React.CSSProperties,
  timelineContainer: {
    maxHeight: '240px',
    minHeight: '120px',
    overflowY: 'auto' as const,
    paddingRight: '8px',
    paddingBottom: '8px'
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '8px 0',
    position: 'relative' as const
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0
  } as React.CSSProperties,
  timelineContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px'
  },
  timelineDate: {
    fontSize: '12px',
    color: '#94a3b8'
  } as React.CSSProperties,
  timelineDesc: {
    fontSize: '14px',
    color: '#475569'
  } as React.CSSProperties
};

export default UserDetail;
