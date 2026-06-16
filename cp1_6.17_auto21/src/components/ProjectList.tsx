import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  lastEditTime: number;
  thumbnail: string | null;
}

interface ProjectListProps {
  userName: string;
}

const ProjectList: React.FC<ProjectListProps> = ({ userName }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load projects:', err);
        setLoading(false);
      });
  }, []);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`;
    } else {
      const date = new Date(timestamp);
      return date.toLocaleDateString('zh-CN');
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/board/${projectId}`);
  };

  return (
    <div className="project-list-container">
      <header className="project-header">
        <div className="header-content">
          <h1 className="app-title">🎨 协作白板</h1>
          <p className="app-subtitle">实时协作，创意无限</p>
        </div>
        <div className="user-info">
          <span className="user-name">{userName}</span>
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="project-main">
        <div className="section-header">
          <h2>我的白板</h2>
          <span className="project-count">{projects.length} 个项目</span>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="project-grid">
            {projects.map(project => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="card-thumbnail">
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.title} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <div className="placeholder-shapes">
                        <div className="shape-circle" />
                        <div className="shape-rect" />
                        <div className="shape-line" />
                        <div className="shape-note" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-info">
                  <h3 className="card-title">{project.title}</h3>
                  <p className="card-time">最后编辑：{formatTime(project.lastEditTime)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .project-list-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #E0F7FA 0%, #FFFFFF 100%);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 40px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(79, 195, 247, 0.2);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .app-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #212121;
          letter-spacing: -0.5px;
        }

        .app-subtitle {
          margin: 0;
          font-size: 14px;
          color: #757575;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-name {
          font-size: 14px;
          color: #424242;
          font-weight: 500;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4FC3F7, #29B6F6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(79, 195, 247, 0.4);
        }

        .project-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #212121;
        }

        .project-count {
          font-size: 14px;
          color: #9E9E9E;
        }

        .loading {
          text-align: center;
          padding: 60px;
          color: #9E9E9E;
          font-size: 16px;
        }

        .project-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .project-card {
          width: 240px;
          height: 180px;
          background: linear-gradient(135deg, #E0F7FA 0%, #FFFFFF 100%);
          border-radius: 8px;
          box-shadow: 2px 2px 8px rgba(178, 235, 242, 0.6);
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 4px 8px 16px rgba(79, 195, 247, 0.3);
        }

        .card-thumbnail {
          height: 130px;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-thumbnail img {
          width: 200px;
          height: 150px;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 200px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          border-radius: 4px;
          border: 1px dashed #e0e0e0;
        }

        .placeholder-shapes {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .shape-circle {
          position: absolute;
          top: 20px;
          left: 30px;
          width: 30px;
          height: 30px;
          border: 2px solid #4FC3F7;
          border-radius: 50%;
        }

        .shape-rect {
          position: absolute;
          top: 25px;
          right: 40px;
          width: 40px;
          height: 25px;
          border: 2px solid #E74C3C;
          border-radius: 2px;
        }

        .shape-line {
          position: absolute;
          bottom: 35px;
          left: 25px;
          width: 50px;
          height: 2px;
          background: #212121;
          transform: rotate(-20deg);
        }

        .shape-note {
          position: absolute;
          bottom: 20px;
          right: 30px;
          width: 35px;
          height: 30px;
          background: #FFF9C4;
          border: 1.5px solid #FDD835;
          border-radius: 2px;
        }

        .card-info {
          flex: 1;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .card-title {
          margin: 0 0 6px 0;
          font-size: 15px;
          font-weight: 600;
          color: #212121;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-time {
          margin: 0;
          font-size: 12px;
          color: #9E9E9E;
        }

        @media (max-width: 1100px) {
          .project-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 850px) {
          .project-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .project-header {
            padding: 16px 20px;
          }

          .app-title {
            font-size: 22px;
          }

          .project-main {
            padding: 24px 20px;
          }

          .project-grid {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .project-card {
            width: 100%;
            max-width: 320px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectList;
