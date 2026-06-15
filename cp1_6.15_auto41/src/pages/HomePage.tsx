import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface WorkListItem {
  id: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  tags: string[];
  votes: number;
}

const HomePage: React.FC = () => {
  const [works, setWorks] = useState<WorkListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/works')
      .then((res) => res.json())
      .then((data) => {
        setWorks(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
      '<rect width="640" height="360" fill="#16213e"/>' +
      '<text x="320" y="180" text-anchor="middle" fill="#555" font-size="24" font-family="sans-serif">暂无图片</text>' +
      '</svg>'
    );
  };

  return (
    <div className={loaded ? 'page-fade-in' : ''} style={{ minHeight: '100vh' }}>
      <style>{`
        .home-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 15%;
        }
        .home-title {
          text-align: center;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 40px;
          color: #e0e0e0;
        }
        .works-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .work-card {
          background: #16213e;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.3);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .work-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(233,69,96,0.2), inset 0 1px 4px rgba(0,0,0,0.3);
        }
        .card-image-wrapper {
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #0f3460;
        }
        .card-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .card-body {
          padding: 16px;
        }
        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e0e0e0;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-author {
          font-size: 0.9rem;
          color: #a0a0a0;
        }
        .card-votes {
          font-size: 0.9rem;
          color: #e94560;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .home-container {
            padding: 20px 5%;
          }
          .works-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .home-title {
            font-size: 1.5rem;
          }
          .card-title {
            font-size: 1.2rem;
          }
        }
      `}</style>
      <div className="home-container">
        <h1 className="home-title">线上作品展示平台</h1>
        <div className="works-grid">
          {works.map((work) => (
            <div
              key={work.id}
              className="work-card"
              onClick={() => navigate(`/work/${work.id}`)}
            >
              <div className="card-image-wrapper">
                <img
                  src={work.imageUrl}
                  alt={work.title}
                  onError={handleImageError}
                  loading="eager"
                />
              </div>
              <div className="card-body">
                <div className="card-title">{work.title}</div>
                <div className="card-meta">
                  <span className="card-author">{work.author}</span>
                  <span className="card-votes">👍 {work.votes} 票</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
