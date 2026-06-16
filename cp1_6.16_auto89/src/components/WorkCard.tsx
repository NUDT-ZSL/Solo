import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Work } from '../types';
import StarRating from './StarRating';
import { useLazyLoad } from '../hooks/useLazyLoad';

interface WorkCardProps {
  work: Work;
  index: number;
}

const categoryLabels: Record<string, string> = {
  ceramic: '陶瓷',
  wood: '木工',
  embroidery: '刺绣',
  metal: '金属',
};

const WorkCard: React.FC<WorkCardProps> = ({ work, index }) => {
  const navigate = useNavigate();
  const { ref, isLoaded } = useLazyLoad();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => setShow(true), index * 80);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, index]);

  return (
    <div
      ref={ref}
      className={`work-card ${show ? 'fade-in' : ''}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
      onClick={() => navigate(`/work/${work.id}`)}
    >
      <div className="work-card-image">
        {!imageLoaded && <div className="image-placeholder" />}
        {isLoaded && (
          <img
            src={work.thumbnail}
            alt={work.title}
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
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
