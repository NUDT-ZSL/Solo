import React from 'react';
import type { Activity } from '../types';
import { formatDeadline, isExpired } from '../utils';
import VoteChart from './VoteChart';

interface Props {
  activity: Activity;
  onClick: () => void;
}

const ActivityCard: React.FC<Props> = ({ activity, onClick }) => {
  const expired = isExpired(activity.deadline);

  return (
    <div className="activity-card" onClick={onClick}>
      <div className="card-header">
        <h3 className="card-title">{activity.name}</h3>
        <div className="card-meta">
          <span>发起人：{activity.creator}</span>
          <span>📍 {activity.location}</span>
        </div>
        <span className={`card-deadline ${expired ? 'expired' : ''}`}>
          {expired ? '已截止' : `投票截止：${formatDeadline(activity.deadline)}`}
        </span>
      </div>
      <div className="vote-chart">
        <VoteChart options={activity.timeOptions} />
      </div>
    </div>
  );
};

export default ActivityCard;
