import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
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
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
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
  );
};

export default ProjectCard;
