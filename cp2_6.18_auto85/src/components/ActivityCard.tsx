import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, RegistrationStatus } from '../types';
import './ActivityCard.css';

interface ActivityCardProps {
  activity: Activity;
}

function getRegistrationStatus(activity: Activity): RegistrationStatus {
  const registeredCount = activity.registrations.reduce(
    (sum, r) => sum + r.children.length,
    0
  );
  const ratio = registeredCount / activity.maxParticipants;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.8) return 'filling';
  return 'available';
}

function getStatusText(status: RegistrationStatus): string {
  switch (status) {
    case 'available':
      return '可报名';
    case 'filling':
      return '即将满员';
    case 'full':
      return '已满';
  }
}

function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = getRegistrationStatus(activity);
  const statusText = getStatusText(status);
  const registeredCount = activity.registrations.reduce(
    (sum, r) => sum + r.children.length,
    0
  );

  const visibleTags = activity.ageGroups.slice(0, 3);
  const hiddenCount = activity.ageGroups.length - 3;
  const hasHiddenTags = hiddenCount > 0;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <Link to={`/activity/${activity.id}`} className="activity-card-link">
      <div className="activity-card">
        <div className="activity-card-cover">
          <img
            src={activity.coverImage}
            alt={activity.name}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=parent%20child%20activity%20playful%20warm%20colors&image_size=square`;
            }}
          />
        </div>
        <div className="activity-card-content">
          <h3 className="activity-card-title">{activity.name}</h3>
          <div className={`activity-card-tags ${expanded ? 'expanded' : ''}`}>
            {visibleTags.map((age) => (
              <span key={age} className="age-tag">
                {age}
              </span>
            ))}
            {!expanded && hasHiddenTags && (
              <button
                type="button"
                className="age-tag more-tag"
                onClick={handleExpandClick}
              >
                +{hiddenCount}
              </button>
            )}
            {expanded && activity.ageGroups.slice(3).map((age) => (
              <span key={age} className="age-tag tag-enter">
                {age}
              </span>
            ))}
            {expanded && hasHiddenTags && (
              <button
                type="button"
                className="age-tag more-tag"
                onClick={handleExpandClick}
              >
                收起
              </button>
            )}
          </div>
        </div>
        <div className="activity-card-footer">
          <span className="activity-card-date">
            {formatDateTime(activity.dateTime)}
          </span>
          <span className={`activity-status status-${status}`}>
            {statusText} ({registeredCount}/{activity.maxParticipants})
          </span>
        </div>
      </div>
    </Link>
  );
}
