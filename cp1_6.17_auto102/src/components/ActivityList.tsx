import ActivityCard from './ActivityCard';
import type { Activity } from '../../shared/types';

interface Props {
  activities: Activity[];
  registrationCounts?: Record<string, number>;
  loading?: boolean;
}

const ActivityList = ({ activities, registrationCounts = {}, loading }: Props) => {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20, height: 160, opacity: 0.6, background: 'linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%)', backgroundSize: '200% 100%', animation: 'skeleton 1.5s infinite' }} />
        ))}
        <style>{`@keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center', color: '#9E9E9E' }}>
        暂无活动，快去创建第一个读书会吧！
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {activities.map((a) => (
        <ActivityCard
          key={a.id}
          activity={a}
          registrationCount={registrationCounts[a.id] || 0}
        />
      ))}
    </div>
  );
};

export default ActivityList;
