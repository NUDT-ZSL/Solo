import React, { useState, useEffect } from 'react';
import ProjectCard from '../components/ProjectCard';
import type { Project } from '../types';

const HomePage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '40px 40px 60px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1
          style={{
            fontSize: '42px',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(90deg, #e94560, #ff6b81)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          发现精彩独立游戏
        </h1>
        <p style={{ fontSize: '18px', color: '#a0a0b0' }}>
          支持独立开发者，让创意照进现实
        </p>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            color: '#a0a0b0',
            fontSize: '18px',
          }}
        >
          加载中...
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <style>{`
        .project-grid {
          display: grid;
          grid-template-columns: repeat(2, 280px);
          gap: 24px;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .project-grid {
            grid-template-columns: repeat(3, 280px);
          }
        }
        @media (min-width: 1024px) {
          .project-grid {
            grid-template-columns: repeat(4, 280px);
          }
        }
        @media (min-width: 1280px) {
          .project-grid {
            grid-template-columns: repeat(4, 280px);
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
