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
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(project.status);
  const prevStatusRef = useRef(project.status);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== project.status) {
      setIsFlipping(true);
      setTimeout(() => {
        setDisplayStatus(project.status);
        prevStatusRef.current = project.status;
        setIsFlipping(false);
      }, 150);
    }
  }, [project.status]);

  const handleStatusClick = (e: React.MouseEvent, newStatus: ProjectStatus) => {
    e.stopPropagation();
    onStatusChange(project.id, newStatus);
    setMenuOpen(false);
  };

  return (
    <div
      style={{
        ...styles.card,
        opacity: isFlipping ? 0.5 : 1
      }}
      onClick={() => {
        onClick();
        setMenuOpen(false);
      }}
    >
      <div style={styles.cardInner}>
        <div style={styles.cardHeader}>
          <div
            style={{
              ...styles.statusTag,
              backgroundColor: statusColors[displayStatus],
              transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            {displayStatus}
            <span style={styles.statusArrow}>▼</span>
          </div>
          {menuOpen && (
            <div style={styles.statusMenu} onClick={(e) => e.stopPropagation()}>
              {(['待启动', '进行中', '已延期', '已完成'] as ProjectStatus[]).map(status => (
                <div
                  key={status}
                  style={{
                    ...styles.statusMenuItem,
                    color: statusColors[status]
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
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible'
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
    transition: 'transform 0.3s ease, background-color 0.3s ease',
    userSelect: 'none'
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    padding: '4px',
    zIndex: 10,
    minWidth: '100px'
  },
  statusMenuItem: {
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
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
