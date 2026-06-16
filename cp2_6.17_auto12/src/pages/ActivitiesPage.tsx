import { useActivityData } from '../hooks/useActivityData';
import { ActivityCard } from '../components/ActivityCard';
import { useUser } from '../context/UserContext';

export function ActivitiesPage() {
  const { activities, loading, error, register } = useActivityData();
  const { user } = useUser();

  const handleRegister = async (activityId: string) => {
    if (!user) return;
    const result = await register(activityId, user.id);
    if (!result.success) {
      alert(result.message);
    }
  };

  const styles = `
    .activities-page {
      padding: 92px 32px 48px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .activities-header {
      margin-bottom: 32px;
    }
    .activities-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .activities-header p {
      font-size: 14px;
      color: #6b7280;
    }
    .activities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 320px);
      gap: 24px;
      justify-content: start;
    }
    .activities-loading,
    .activities-error,
    .activities-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px;
      color: #6b7280;
      font-size: 14px;
    }
    @media (max-width: 768px) {
      .activities-page {
        padding: 92px 16px 32px;
      }
      .activities-grid {
        grid-template-columns: 1fr;
        justify-items: center;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="activities-page page-fade-in">
        <div className="activities-header">
          <h1>读书会活动</h1>
          <p>加入我们的线下读书会，与志同道合的书友交流分享</p>
        </div>
        <div className="activities-grid">
          {loading && <div className="activities-loading">加载中...</div>}
          {error && <div className="activities-error">{error}</div>}
          {!loading && !error && activities.length === 0 && (
            <div className="activities-empty">暂无活动</div>
          )}
          {activities.map((activity, i) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onRegister={handleRegister}
              delay={i * 80}
            />
          ))}
        </div>
      </div>
    </>
  );
}
