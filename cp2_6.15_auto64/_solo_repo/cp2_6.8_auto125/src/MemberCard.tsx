import React from 'react';
import SkillRadar from './SkillRadar';

interface Skill {
  skill: string;
  score: number;
}

interface Member {
  id: string;
  name: string;
  position: string;
  totalScore: number;
  skills: Skill[];
}

interface MemberCardProps {
  member: Member;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: isDragging ? '0 12px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    transform: isDragging ? 'translateY(-5px) scale(1.02)' : 'translateY(0)',
    opacity: isDragging ? 0.9 : 1,
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#2D3748',
            lineHeight: 1.4,
          }}
        >
          {member.name}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#718096',
            marginTop: '4px',
            lineHeight: 1.4,
          }}
        >
          {member.position}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SkillRadar data={member.skills} size={120} />
      </div>

      <div
        style={{
          textAlign: 'center',
          width: '100%',
          fontSize: '16px',
          fontWeight: 700,
          color: '#2D3748',
        }}
      >
        技能总分：{member.totalScore}
      </div>
    </div>
  );
};

export default MemberCard;
