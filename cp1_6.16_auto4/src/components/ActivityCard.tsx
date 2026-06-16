import React from 'react';
import type { MatchedActivity } from '../types';
import { SKILL_COLORS } from '../types';

interface ActivityCardProps {
  activity: MatchedActivity;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  return (
    <div className={`activity-card ${activity.isRecommended ? 'recommended' : ''}`}>
      <div className="activity-name">{activity.name}</div>
      <div className="activity-date">📅 {activity.date}</div>
      <div className="activity-skills">
        {activity.requiredSkills.map((skill) => (
          <span
            key={skill}
            className="skill-chip"
            style={{ backgroundColor: SKILL_COLORS[skill] }}
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="activity-participants">
        👥 报名人数：{activity.currentParticipants} / {activity.maxParticipants}
      </div>
      {activity.isRecommended && (
        <div className="activity-match-score">
          ✨ 技能匹配度 {Math.round(activity.matchScore * 100)}%
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
