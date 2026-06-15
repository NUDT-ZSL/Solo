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
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontStatus, setFrontStatus] = useState(project.status);
  const [backStatus, setBackStatus] = useState(project.status);
  const prevStatusRef = useRef(project.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== project.status && !isAnimating) {
      setIsAnimating(true);
      const newStatus = project.status;

      if (!isFlipped) {
        setBackStatus(newStatus);
      } else {
        setFrontStatus(newStatus);
      }

      setIsFlipped(!isFlipped);

      setTimeout(() => {
        prevStatusRef.current = newStatus;
        setIsAnimating(false);
      }, 300);
    }
  }, [project.status]);

  const currentVisibleStatus = isFlipped ? backStatus : frontStatus;

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
        .flip-container {
          perspective: 1000px;
          width: 100%;
        }
        .flip-inner {
          position: relative;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flip-flipped {
          transform: rotateY(180deg);
        }
        .flip-front,
        .flip-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-back {
          transform: rotateY(180deg);
        }
        .status-tag-wrapper {
          position: relative;
          width: 84px;
          height: 28px;
          perspective: 200px;
        }
        .status-tag-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .status-tag-front,
        .status-tag-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #ffffff;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .status-tag-back {
          transform: rotateY(180deg);
        }
        .status-tag-flipped {
          transform: rotateY(180deg);
        }
        .status-menu-item:hover {
          background-color: rgba(233, 69, 96, 0.15);
        }
        .project-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.4);
        }
      `}</style>

      <div className="project-card-hover" style={styles.card}>
        <div style={styles.cardInner}>
          <div style={styles.cardHeader}>
            <div
              className="status-tag-wrapper"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <div className={`status-tag-inner ${isFlipped ? 'status-tag-flipped' : ''}`}>
                <div
                  className="status-tag-front"
                  style={{ backgroundColor: statusColors[frontStatus] }}
                >
                  {frontStatus}
                  <span style={styles.statusArrow}>▼</span>
                </div>
                <div
                  className="status-tag-back"
                  style={{ backgroundColor: statusColors[backStatus] }}
                >
                  {backStatus}
                  <span style={styles.statusArrow}>▼</span>
                </div>
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
                      backgroundColor: status === currentVisibleStatus ? 'rgba(233, 69, 96, 0.1)' : 'transparent'
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
    cursor: 'pointer',
    width: '100%'
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    position: 'relative',
    overflow: 'visible'
  },
  cardInner: {
    padding: '24px',
    height: '100%',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '16px',
    position: 'relative'
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
