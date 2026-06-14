import React from 'react';
import { Skill, User } from '../types';
import './SkillCard.css';

interface SkillCardProps {
  skill: Skill;
  user: User;
  onClick?: () => void;
}

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? '#f59e0b' : '#475569'}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const SkillCard: React.FC<SkillCardProps> = ({ skill, user, onClick }) => {
  return (
    <div className="skill-card" onClick={onClick}>
      <div className="skill-card-avatar">
        <img src={user.avatar} alt={user.nickname} />
      </div>
      <div className="skill-card-name">{user.nickname}</div>
      <div className="skill-card-skill-name">{skill.name}</div>
      <div className="skill-card-tags">
        <span className="skill-tag">{skill.level}</span>
      </div>
      <div className="skill-card-rating">
        <StarRating rating={skill.avgRating} />
        <span className="rating-text">{skill.avgRating} ({skill.reviewCount}条评价)</span>
      </div>
      <div className="skill-card-desc">{skill.description}</div>
    </div>
  );
};

export default SkillCard;
