import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

interface PopupPosition {
  top: number;
  left: number;
}

const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 200;
const GAP = 12;

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ top: 0, left: 0 });
  const [opacity, setOpacity] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calcPosition = (): PopupPosition => {
    if (!cardRef.current) {
      return { top: 0, left: 0 };
    }
    const rect = cardRef.current.getBoundingClientRect();

    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;

    let top = 0;
    let left = 0;

    if (spaceRight >= POPUP_WIDTH + GAP) {
      left = rect.right + GAP;
      const topPos = rect.top + rect.height / 2 - POPUP_HEIGHT / 2;
      top = Math.max(10, Math.min(topPos, window.innerHeight - POPUP_HEIGHT - 10));
    } else if (spaceLeft >= POPUP_WIDTH + GAP) {
      left = rect.left - POPUP_WIDTH - GAP;
      const topPos = rect.top + rect.height / 2 - POPUP_HEIGHT / 2;
      top = Math.max(10, Math.min(topPos, window.innerHeight - POPUP_HEIGHT - 10));
    } else if (spaceBottom >= POPUP_HEIGHT + GAP) {
      top = rect.bottom + GAP;
      const leftPos = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
      left = Math.max(10, Math.min(leftPos, window.innerWidth - POPUP_WIDTH - 10));
    } else if (spaceTop >= POPUP_HEIGHT + GAP) {
      top = rect.top - POPUP_HEIGHT - GAP;
      const leftPos = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
      left = Math.max(10, Math.min(leftPos, window.innerWidth - POPUP_WIDTH - 10));
    } else {
      top = rect.bottom + GAP;
      left = Math.max(10, rect.left);
    }

    return { top, left };
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const pos = calcPosition();
    setPopupPosition(pos);
    setShowPopup(true);
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  };

  const handleMouseLeave = () => {
    setOpacity(0);
    timeoutRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 200);
  };

  const handleScreenshotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/project/${project.id}`);
  };

  const handleCardClick = () => {
    navigate(`/project/${project.id}`);
  };

  const previewScreenshots = project.screenshots.slice(0, 3);

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="project-card"
        style={{
          width: '280px',
          height: '420px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '200px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <img
            src={project.screenshots[0] || 'https://via.placeholder.com/280x200'}
            alt={project.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'rgba(233, 69, 96, 0.9)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {project.progress}%
          </div>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1a1a2e',
              marginBottom: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: '#a0a0b0',
              marginBottom: '12px',
            }}
          >
            {project.developer}
          </p>

          <p
            style={{
              fontSize: '13px',
              color: '#666',
              lineHeight: '1.5',
              flex: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {project.description}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '16px' }}>❤️</span>
              <span style={{ fontSize: '14px', color: '#e94560', fontWeight: 500 }}>
                {project.likes}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#1a1a2e', fontWeight: 500 }}>
              已筹 ¥{project.fundedAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setOpacity(1);
          }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popupPosition.top,
            left: popupPosition.left,
            width: POPUP_WIDTH,
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            opacity: opacity,
            transition: 'opacity 0.2s ease',
            zIndex: 9999,
            pointerEvents: 'auto',
          }}
        >
          <h4
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1a1a2e',
              margin: '0 0 12px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </h4>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {previewScreenshots.length > 0 ? (
              previewScreenshots.map((src, idx) => (
                <div
                  key={idx}
                  onClick={handleScreenshotClick}
                  style={{
                    flex: 1,
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={src}
                    alt={`${project.name} 截图 ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))
            ) : (
              <div
                style={{
                  flex: 1,
                  height: '80px',
                  borderRadius: '8px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '12px',
                }}
              >
                暂无截图
              </div>
            )}
          </div>

          <p
            style={{
              fontSize: '13px',
              color: '#666',
              lineHeight: '1.6',
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {project.description}
          </p>
        </div>
      )}

      <style>{`
        .project-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </>
  );
};

export default ProjectCard;
