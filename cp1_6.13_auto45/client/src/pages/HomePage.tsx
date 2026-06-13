import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumCard from '../components/AlbumCard';
import { Podcast, podcastApi } from '../utils/api';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPodcasts();
  }, []);

  const loadPodcasts = async () => {
    try {
      setLoading(true);
      const data = await podcastApi.getAll();
      setPodcasts(data);
    } catch (err) {
      console.error('Failed to load podcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>PodcastVault</h1>
        </div>
        <nav className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/')}>首页</button>
          <button className="nav-btn" onClick={() => navigate('/tags')}>标签搜索</button>
          <button className="nav-btn upload-btn" onClick={() => navigate('/upload')}>上传</button>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <h2>最近上传</h2>
          <p>探索你收藏的播客节目</p>
        </section>

        <div className="cards-scroll-container">
          {loading ? (
            <div className="loading-cards">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          ) : (
            <div className="cards-wrapper">
              {podcasts.map(podcast => (
                <AlbumCard key={podcast._id} podcast={podcast} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
