import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Work } from '../types';
import StarRating from './StarRating';
import { useLazyLoad } from '../hooks/useLazyLoad';

interface WorkCardProps {
  work: Work;
  delay?: number;
}

const categoryLabels: Record<string, string> = {
  ceramic: '陶瓷',
  wood: '木工',
  embroidery: '刺绣',
  metal: '金属',
};

const WorkCard: React.FC<WorkCardProps> = ({ work, delay = 0 }) => {
  const navigate = useNavigate();
  const { ref, isLoaded } = useLazyLoad();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => setShow(true), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, delay]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div
      ref={ref}
      className={`work-card ${show ? 'card-visible' : ''}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
      onClick={() => navigate(`/work/${work.id}`)}
    >
      <div className="work-card-image">
        {!imageLoaded && <div className="image-placeholder" />}
        {isLoaded && !imageError && (
          <img
            src={work.thumbnail}
            alt={work.title}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        )}
        {imageError && (
          <div className="image-error">
            <span>图片加载失败</span>
          </div>
        )}
        <span className="work-card-category">
          {categoryLabels[work.category]}
        </span>
      </div>
      <div className="work-card-content">
        <h3 className="work-card-title">{work.title}</h3>
        <div className="work-card-author">
          <img src={work.authorAvatar} alt={work.author} />
          <span>{work.author}</span>
        </div>
        <div className="work-card-rating">
          <StarRating rating={work.averageRating} />
          <span className="rating-score">{work.averageRating}</span>
        </div>
      </div>
    </div>
  );
};

export default WorkCard;
