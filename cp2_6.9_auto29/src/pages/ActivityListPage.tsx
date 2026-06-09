import React, { useEffect, useState } from 'react';
import type { Activity } from '../types';
import { fetchActivities } from '../utils';
import ActivityCard from '../components/ActivityCard';

interface Props {
  onSelectActivity: (id: string) => void;
}

const ActivityListPage: React.FC<Props> = ({ onSelectActivity }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchActivities();
        setActivities(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">社区活动看板</h1>
        <p className="page-subtitle">浏览社区活动，投票参与你感兴趣的时间</p>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : activities.length === 0 ? (
        <div className="empty-state">暂无活动，点击右上角发起第一个活动吧！</div>
      ) : (
        <div className="activity-grid">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => onSelectActivity(activity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityListPage;
