import { useNavigate } from 'react-router-dom';
import { Skill, TimeSlot } from '../services/api';

interface Props {
  skill: Skill;
  onClick?: () => void;
}

export default function SkillCard({ skill, onClick }: Props) {
  const navigate = useNavigate();
  const freeCount = skill.availableSlots.filter((s: TimeSlot) => !s.booked).length;
  const totalSlots = skill.availableSlots.length;
  const visibleDots = Math.min(5, Math.max(1, totalSlots ? Math.ceil((freeCount / totalSlots) * 5) : 0));

  const handleClick = () => {
    onClick?.();
    navigate(`/skill/${skill._id}`);
  };

  return (
    <div className="skill-card" onClick={handleClick}>
      <div className="card-header">
        <img className="avatar" src={skill.userAvatar} alt={skill.userName} />
        <div className="card-user">
          <h3 className="card-title">{skill.title}</h3>
          <div className="card-user-name">@{skill.userName}</div>
        </div>
      </div>
      <p className="card-desc">{skill.description}</p>
      <div className="card-meta">
        <div className="slot-dots" title={`${freeCount} 个空闲时段`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`slot-dot ${i < visibleDots ? 'free' : ''}`} />
          ))}
        </div>
        <span className="slot-count">{freeCount} 个空闲时段</span>
      </div>
    </div>
  );
}
