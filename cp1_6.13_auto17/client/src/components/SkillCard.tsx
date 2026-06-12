import React from 'react';
import { Skill } from '@/types';
import { formatRelativeTime, getAvatarColor } from '@/utils';

interface SkillCardProps {
  skill: Skill;
  onClick: (skill: Skill) => void;
  style?: React.CSSProperties;
}

export default function SkillCard({ skill, onClick, style }: SkillCardProps) {
  const avatarColor = getAvatarColor(skill.userNickname);
  const initial = skill.userNickname.charAt(0);

  return (
    <div
      className="card-hover bg-white cursor-pointer"
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        ...style,
      }}
      onClick={() => onClick(skill)}
    >
      <div style={{ padding: '16px' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex-shrink-0 flex items-center justify-center text-white font-semibold"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: avatarColor,
              fontSize: '18px',
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-gray-800 truncate"
              style={{ fontSize: '16px', margin: 0 }}
            >
              {skill.name}
            </h3>
            <p className="text-gray-500" style={{ fontSize: '13px', margin: 0 }}>
              {skill.userNickname} · {formatRelativeTime(skill.createdAt)}
            </p>
          </div>
        </div>

        <p
          className="text-gray-600 mb-3"
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {skill.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((tag, i) => (
            <span key={i} className="skill-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
