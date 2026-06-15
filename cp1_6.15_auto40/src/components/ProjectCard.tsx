import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectStatus } from '../data/mockData';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onStatusChange: (projectId: string, status: ProjectStatus) => void;
}

const statusColors: Record<ProjectStatus, string> = {
  '待启动': '#808080',
  '进行中': '#3498db',
  '已延期': '#e67e22',
  '已完成': '#27ae60'
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onStatusChange }) => {
  const [flipPhase, setFlipPhase] = useState<'front' | 'flipping' | 'back'>('front');
  const [frontStatus, setFrontStatus] = useState(project.status);
  const [backStatus, setBackStatus] = useState(project.status);
  const prevStatusRef = useRef(project.status);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== project.status) {
      const newStatus = project.status;
      setFlipPhase('flipping');
      setTimeout(() => {
        if (flipPhase === 'front') {
          setBackStatus(newStatus);
        } else {
          setFrontStatus(newStatus);
        }
        setFlipPhase(flipPhase === 'front' ? 'back' : 'front');
        prevStatusRef.current = newStatus;
      }, 150);
    }
  }, [project.status, flipPhase]);

  const currentStatus = flipPhase === 'front' ? frontStatus : backStatus;

  const handleStatusClick = (e: React.MouseEvent, newStatus: ProjectStatus) => {
    e.stopPropagation();
    onStatusChange(project.id, newStatus);
    setMenuOpen(false);
  };

  const handleCardClick = () => {
    onClick();
    setMenuOpen(false);
  };

  return (
    <div style={styles.cardWrapper} onClick={handleCardClick}>
      <style>{`
        @keyframes flipFrontToBack {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes flipBackToFront {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        .flip-front {
          animation: flipFrontToBack 0.3s ease forwards;
        }
        .flip-back {
          animation: flipBackToFront 0.3s ease forwards;
        }
        .status-tag-hover:hover {
          filter: brightness(1.1);
        }
        .status-menu-item:hover {
          background-color: rgba(233, 69, 96, 0.15);
        }
      `}</style>

      <div style={styles.card}>
        <div style={styles.cardInner}>
          <div style={styles.cardHeader}>
            <div style={{ perspective: '500px', display: 'inline-block' }}>
              <div
                className={`status-tag-hover ${flipPhase === 'flipping' ? (prevStatusRef.current === frontStatus ? 'flip-front' : 'flip-back') : ''}`}
                style={{
                  ...styles.statusTag,
                  backgroundColor: statusColors[currentStatus],
                  transformStyle: 'preserve-3d'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                {currentStatus}
                <span style={styles.statusArrow}>▼</span>
              </div>
            </div>
            {menuOpen && (
              <div style={styles.statusMenu} onClick={(e) => e.stopPropagation()}>
                {(['待启动', '进行中', '已延期', '已完成'] as ProjectStatus[]).map(status => (
                  <div
                    key={status}
                    className="status-menu-item"
                    style={{
                      ...styles.statusMenuItem,
                      color: statusColors[status],
                      borderLeft: `3px solid ${statusColors[status]}`,
                      backgroundColor: status === currentStatus ? 'rgba(233, 69, 96, 0.1)' : 'transparent'
                    }}
                    onClick={(e) => handleStatusClick(e, status)}
                  >
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
          <h3 style={styles.projectName}>{project.name}</h3>
          <p style={styles.projectDesc}>{project.description}</p>
          <div style={styles.cardFooter}>
            <span style={styles.deadline}>
              📅 {project.deadline}
            </span>
            <span style={styles.createdAt}>
              创建于 {project.createdAt}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  cardWrapper: {
    perspective: '1000px',
    cursor: 'pointer'
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
    }
  },
  cardInner: {
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '16px',
    position: 'relative'
  },
  statusTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#ffffff',
    userSelect: 'none',
    backfaceVisibility: 'hidden',
    transition: 'background-color 0.3s ease, filter 0.3s ease'
  },
  statusArrow: {
    fontSize: '8px',
    opacity: 0.8
  },
  statusMenu: {
    position: 'absolute',
    top: '36px',
    left: 0,
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    padding: '6px',
    zIndex: 50,
    minWidth: '110px',
    animation: 'fadeIn 0.2s ease forwards'
  },
  statusMenuItem: {
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '2px'
  },
  projectName: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1.4
  },
  projectDesc: {
    margin: 0,
    fontSize: '14px',
    color: '#a0a0a0',
    lineHeight: 1.6,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #2a2a4a'
  },
  deadline: {
    fontSize: '12px',
    color: '#e94560',
    fontWeight: 500
  },
  createdAt: {
    fontSize: '12px',
    color: '#606080'
  }
};

export default ProjectCard;
