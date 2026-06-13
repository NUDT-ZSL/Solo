import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Podcast } from '../utils/api';
import './AlbumCard.css';

interface AlbumCardProps {
  podcast: Podcast;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ podcast }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300 + Math.random() * 500);

    return () => clearTimeout(timer);
  }, []);

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const waveform = podcast.waveform || [];
    
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(1, '#fbbf24');

    const barWidth = width / waveform.length;
    const centerY = height / 2;

    waveform.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = peak * height * 0.8;
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, centerY - barHeight / 2, barWidth * 0.7, barHeight, 2);
      ctx.fill();
    });
  }, [podcast.waveform]);

  useEffect(() => {
    if (!isLoading) {
      drawWaveform();
    }
  }, [isLoading, drawWaveform]);

  useEffect(() => {
    const handleResize = () => {
      if (!isLoading) {
        drawWaveform();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoading, drawWaveform]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClick = () => {
    navigate(`/podcast/${podcast._id}`);
  };

  return (
    <div className="album-card" onClick={handleClick}>
      <div className="album-card-waveform">
        {isLoading ? (
          <div className="waveform-placeholder">
            <div className="pulse-line"></div>
            <div className="pulse-line" style={{ animationDelay: '0.1s' }}></div>
            <div className="pulse-line" style={{ animationDelay: '0.2s' }}></div>
            <div className="pulse-line" style={{ animationDelay: '0.3s' }}></div>
            <div className="pulse-line" style={{ animationDelay: '0.4s' }}></div>
          </div>
        ) : (
          <canvas ref={canvasRef} className="waveform-canvas"></canvas>
        )}
      </div>
      
      <div className="album-card-content">
        <div className="album-cover">
          <div className="cover-placeholder">
            <svg className="cover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        
        <h3 className="album-title">{podcast.title}</h3>
        
        <div className="album-tags">
          {podcast.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
          {podcast.tags.length > 3 && (
            <span className="tag">+{podcast.tags.length - 3}</span>
          )}
        </div>
        
        <p className="album-date">{formatDate(podcast.createdAt)}</p>
      </div>
    </div>
  );
};

export default AlbumCard;
