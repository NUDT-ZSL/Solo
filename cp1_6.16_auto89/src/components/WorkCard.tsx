import React from 'react';
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

  return (
    <div
      ref={ref}>
      {isLoaded && (
        <div
          className="work-card"
          style={{
            animationDelay: `${index * 0.08}s`
          }}
          onClick={() => navigate(`/work/${work.id}`)}
        >
          <div className="work-card-image">
            <img
              src={work.thumbnail}
              alt={work.title}
              loading="lazy"
            />
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
      )}
    </div>
  );
};

export default WorkCard;
