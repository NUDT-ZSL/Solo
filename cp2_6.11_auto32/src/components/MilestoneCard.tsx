import { useState, useRef, useEffect, useCallback } from 'react';
import type { Milestone } from '../types';

interface MilestoneCardProps {
  milestone: Milestone;
  onCelebrate: (id: string) => Promise<{ success: boolean; newProgress: number; message?: string } | null>;
  onUpdate: (id: string, data: { title?: string; description?: string }) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

const THEME_COLORS = [
  { r: 233, g: 69, b: 96 },
  { r: 15, g: 52, b: 96 },
  { r: 22, g: 33, b: 62 },
];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 233, g: 69, b: 96 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const getRandomColor = () => {
  const baseColor = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
  const hueShift = (Math.random() - 0.5) * 60;
  
  const r = Math.max(0, Math.min(255, Math.round(baseColor.r + hueShift + (Math.random() - 0.5) * 40)));
  const g = Math.max(0, Math.min(255, Math.round(baseColor.g + hueShift + (Math.random() - 0.5) * 40)));
  const b = Math.max(0, Math.min(255, Math.round(baseColor.b + hueShift + (Math.random() - 0.5) * 40)));
  
  return rgbToHex(r, g, b);
};

const MilestoneCard = ({ milestone, onCelebrate, onUpdate }: MilestoneCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(milestone.progress);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDescription, setEditDescription] = useState(milestone.description);
  const [editError, setEditError] = useState('');
  const [celebrateError, setCelebrateError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    animateNumber(milestone.progress);
  }, [milestone.progress]);

  const animateNumber = useCallback((targetProgress: number) => {
    const startProgress = displayProgress;
    const difference = targetProgress - startProgress;
    const duration = 800;
    const startTime = performance.now();

    const updateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startProgress + difference * easeOutQuart);
      setDisplayProgress(current);

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    };

    requestAnimationFrame(updateNumber);
  }, [displayProgress]);

  const createParticles = useCallback((centerX: number, centerY: number) => {
    const particleCount = Math.floor(Math.random() * 101) + 200;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      const color = getRandomColor();
      
      newParticles.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 6 + 2,
        life: 1,
        maxLife: 3000,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
      });
    }

    particlesRef.current = newParticles;
    setParticles(newParticles);
  }, []);

  const animateParticles = useCallback((startTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = performance.now();
    const elapsed = currentTime - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.map((particle) => {
      const newLife = Math.max(0, 1 - elapsed / particle.maxLife);
      const newX = particle.x + particle.vx;
      const newY = particle.y + particle.vy + (1 - newLife) * 0.5;
      const newVx = particle.vx * 0.98;
      const newVy = particle.vy * 0.98 + 0.1;
      const newRotation = particle.rotation + particle.rotationSpeed;

      ctx.save();
      ctx.translate(newX, newY);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.globalAlpha = newLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();

      return {
        ...particle,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        life: newLife,
        rotation: newRotation,
      };
    }).filter((particle) => particle.life > 0);

    setParticles([...particlesRef.current]);

    if (elapsed < 3000 && particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(() => animateParticles(startTime));
    } else {
      setIsCelebrating(false);
      particlesRef.current = [];
      setParticles([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleCelebrate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isCelebrating || milestone.progress >= 100) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isNewDay = milestone.lastCelebrationDate !== today;
    const currentCount = isNewDay ? 0 : milestone.celebrationCount;
    
    if (currentCount >= 5) {
      setCelebrateError('今日庆祝次数已达上限');
      setTimeout(() => setCelebrateError(''), 2000);
      return;
    }

    setIsCelebrating(true);
    setCelebrateError('');

    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const cardRect = cardRef.current?.getBoundingClientRect();
    
    if (cardRect) {
      const centerX = rect.left - cardRect.left + rect.width / 2;
      const centerY = rect.top - cardRect.top + rect.height / 2;
      createParticles(centerX, centerY);
      animationRef.current = requestAnimationFrame(() => animateParticles(performance.now()));
    }

    const result = await onCelebrate(milestone.id);
    
    if (result && !result.success && result.message) {
      setCelebrateError(result.message);
      setTimeout(() => setCelebrateError(''), 2000);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(milestone.title);
    setEditDescription(milestone.description);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editTitle.trim()) {
      setEditError('标题不能为空');
      return;
    }
    if (editTitle.length > 50) {
      setEditError('标题不能超过50个字符');
      return;
    }
    if (editDescription.length > 200) {
      setEditError('描述不能超过200个字符');
      return;
    }

    onUpdate(milestone.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setShowEditModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(milestone.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = getDaysRemaining();
  const progressPercent = displayProgress;

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      style={{
        ...styles.card,
        cursor: 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        width={800}
        height={400}
      />

      <div style={styles.cardHeader}>
        <div style={styles.cardTitleRow}>
          <h3 style={styles.cardTitle}>{milestone.title}</h3>
          <div style={styles.cardActions}>
            <button
              onClick={handleEdit}
              style={styles.editButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              编辑
            </button>
          </div>
        </div>
        <p style={styles.cardDescription}>
          {milestone.description.length > 80 
            ? milestone.description.substring(0, 80) + '...' 
            : milestone.description}
        </p>
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>进度</span>
          <span style={styles.progressValue}>
            {progressPercent}%
          </span>
        </div>
        <div style={styles.progressBarContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      <div style={styles.cardFooter}>
        <div style={styles.deadlineSection}>
          <span style={styles.deadlineLabel}>截止日期</span>
          <span style={{
            ...styles.deadlineValue,
            color: daysRemaining <= 3 ? '#e94560' : '#e2e8f0',
          }}>
            {formatDate(milestone.deadline)}
            <span style={styles.daysRemaining}>
              {daysRemaining > 0 ? ` (还剩${daysRemaining}天)` : daysRemaining === 0 ? ' (今天)' : ' (已过期)'}
            </span>
          </span>
        </div>

        <div style={styles.celebrateSection}>
          {celebrateError && (
            <span style={styles.celebrateError}>{celebrateError}</span>
          )}
          <button
            onClick={handleCelebrate}
            disabled={isCelebrating || milestone.progress >= 100}
            style={{
              ...styles.celebrateButton,
              opacity: isCelebrating || milestone.progress >= 100 ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isCelebrating && milestone.progress < 100) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#c0392b';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#e94560';
            }}
          >
            🎉 燃放庆祝
          </button>
        </div>
      </div>

      <div
        style={{
          ...styles.expandableContent,
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 300ms ease-out, opacity 300ms ease-out',
        }}
      >
        <div ref={contentRef} style={styles.expandedContentInner}>
          <div style={styles.detailSection}>
            <h4 style={styles.detailTitle}>完整描述</h4>
            <p style={styles.detailText}>{milestone.description}</p>
          </div>

          <div style={styles.detailSection}>
            <h4 style={styles.detailTitle}>创建时间</h4>
            <p style={styles.detailText}>{formatDateTime(milestone.createdAt)}</p>
          </div>

          {milestone.celebrations.length > 0 && (
            <div style={styles.detailSection}>
              <h4 style={styles.detailTitle}>庆祝历史</h4>
              <div style={styles.celebrationList}>
                {milestone.celebrations.map((record, index) => (
                  <div key={record.id} style={styles.celebrationItem}>
                    <span style={styles.celebrationIcon}>🎉</span>
                    <span style={styles.celebrationTime}>
                      {formatDateTime(record.timestamp)}
                    </span>
                    <span style={styles.celebrationProgress}>
                      +{record.progressIncrease}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.detailSection}>
            <h4 style={styles.detailTitle}>今日庆祝次数</h4>
            <p style={styles.detailText}>
              {new Date().toISOString().split('T')[0] === milestone.lastCelebrationDate 
                ? milestone.celebrationCount 
                : 0} / 5
            </p>
          </div>
        </div>
      </div>

      <div style={styles.expandIndicator}>
        <span style={{
          ...styles.expandIcon,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 300ms ease-out',
        }}>
          ▼
        </span>
      </div>

      {showEditModal && (
        <div 
          style={styles.modalOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setShowEditModal(false);
          }}
        >
          <div 
            style={styles.editModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.modalTitle}>编辑里程碑</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: editError ? '#e94560' : '#0f3460',
                  }}
                  maxLength={50}
                />
                <span style={styles.charCount}>{editTitle.length}/50</span>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    ...styles.textarea,
                    borderColor: editError ? '#e94560' : '#0f3460',
                  }}
                  maxLength={200}
                />
                <span style={styles.charCount}>{editDescription.length}/200</span>
              </div>
              {editError && <span style={styles.errorText}>{editError}</span>}
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(false);
                  }}
                  style={styles.cancelButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a3a5a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e2a45';
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#c0392b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#e94560';
                  }}
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    position: 'relative' as const,
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 0 8px rgba(233, 69, 96, 0.3)',
    border: '1px solid rgba(233, 69, 96, 0.2)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  },
  canvas: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    zIndex: 10,
    borderRadius: '16px',
  },
  cardHeader: {
    marginBottom: '20px',
  },
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#ffffff',
    margin: 0,
    flex: 1,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '500' as const,
    color: '#e94560',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#a0aec0',
    margin: 0,
    lineHeight: 1.5,
  },
  progressSection: {
    marginBottom: '20px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '13px',
    color: '#a0aec0',
    fontWeight: '500' as const,
  },
  progressValue: {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#e94560',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  progressBarContainer: {
    height: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #0f3460, #e94560)',
    borderRadius: '6px',
    transition: 'width 0.8s ease-out',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  deadlineLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  deadlineValue: {
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  daysRemaining: {
    fontSize: '12px',
    opacity: 0.8,
  },
  celebrateSection: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  celebrateButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#ffffff',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(233, 69, 96, 0.3)',
  },
  celebrateError: {
    fontSize: '11px',
    color: '#e94560',
    position: 'absolute' as const,
    bottom: '100%',
    right: 0,
    whiteSpace: 'nowrap' as const,
    marginBottom: '4px',
  },
  expandableContent: {
    marginTop: '0',
  },
  expandedContentInner: {
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: '16px',
  },
  detailSection: {
    marginBottom: '16px',
  },
  detailTitle: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#a0aec0',
    marginBottom: '6px',
  },
  detailText: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: 1.6,
    margin: 0,
  },
  celebrationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  celebrationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderRadius: '8px',
  },
  celebrationIcon: {
    fontSize: '16px',
  },
  celebrationTime: {
    flex: 1,
    fontSize: '13px',
    color: '#a0aec0',
  },
  celebrationProgress: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#e94560',
  },
  expandIndicator: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#64748b',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
    backdropFilter: 'blur(4px)',
  },
  editModal: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '28px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 0 30px rgba(233, 69, 96, 0.2)',
    border: '1px solid rgba(233, 69, 96, 0.3)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#ffffff',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '16px',
    position: 'relative' as const,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#e2e8f0',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#0f172a',
    border: '2px solid #0f3460',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#0f172a',
    border: '2px solid #0f3460',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '70px',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  charCount: {
    position: 'absolute' as const,
    right: '10px',
    bottom: '-16px',
    fontSize: '10px',
    color: '#64748b',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#e94560',
    marginTop: '4px',
    marginBottom: '12px',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '9px 20px',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#e2e8f0',
    backgroundColor: '#1e2a45',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  submitButton: {
    padding: '9px 20px',
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#ffffff',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default MilestoneCard;
