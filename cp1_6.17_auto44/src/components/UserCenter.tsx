import React, { useState, useEffect } from 'react';
import { dataStore } from '../data/dataStore';

interface UserCenterProps {
  onBack: () => void;
  onSelectRoute: (routeId: string) => void;
}

const UserCenter: React.FC<UserCenterProps> = ({ onBack, onSelectRoute }) => {
  const userId = dataStore.getCurrentUserId();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return dataStore.subscribe(() => forceUpdate((v) => v + 1));
  }, []);

  const userApps = dataStore.getUserApplications(userId);
  const matchedApps = userApps.filter((a) => a.status === 'matched');
  const matchingApps = userApps.filter((a) => a.status === 'matching');

  return (
    <div className="user-center">
      <button className="back-btn" onClick={onBack}>
        ← 返回
      </button>
      <h1 className="page-title">个人中心</h1>

      <section className="user-section">
        <h2 className="section-block-title">
          ✅ 已匹配 <span className="section-block-count">({matchedApps.length})</span>
        </h2>
        {matchedApps.length === 0 ? (
          <div className="empty-state">暂无已匹配的路线</div>
        ) : (
          <div className="card-grid">
            {matchedApps.map((app) => {
              const route = dataStore.getRouteById(app.routeId);
              const group = dataStore.getMatchedGroup(app.routeId);
              const tasks = group ? dataStore.assignTaskByPreference(group) : {};
              if (!route || !group) return null;
              return (
                <div key={app.routeId} className="matched-card" onClick={() => onSelectRoute(app.routeId)}>
                  <div className="matched-header">
                    <h3>
                      {route.city} · {route.days} 日游
                    </h3>
                    <span className="matched-tag">已成团</span>
                  </div>
                  <div className="member-avatars">
                    {group.members.map((m) => (
                      <div key={m.userId} className="member-avatar" title={m.nickname}>
                        {m.avatar}
                      </div>
                    ))}
                  </div>
                  <div className="task-list">
                    {group.members.map((m) => (
                      <div key={m.userId} className="task-row">
                        <span className="task-avatar">{m.avatar}</span>
                        <span className="task-name">{m.nickname}</span>
                        <span className="task-spots">负责: {(tasks[m.userId] || []).slice(0, 2).join('、')}{(tasks[m.userId] || []).length > 2 ? '...' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="section-divider" />

      <section className="user-section">
        <h2 className="section-block-title">
          ⏳ 匹配中 <span className="section-block-count">({matchingApps.length})</span>
        </h2>
        {matchingApps.length === 0 ? (
          <div className="empty-state">暂无正在匹配的路线</div>
        ) : (
          <div className="card-grid">
            {matchingApps.map((app) => {
              const route = dataStore.getRouteById(app.routeId);
              const info = dataStore.checkMatchingStatus(app.routeId);
              if (!route) return null;
              return (
                <div key={app.routeId} className="matching-card" onClick={() => onSelectRoute(app.routeId)}>
                  <div className="matching-header">
                    <h3>
                      {route.city} · {route.days} 日游
                    </h3>
                  </div>
                  <div className="matching-progress">
                    <div className="progress-count">
                      <span className="count-current count-animate">{info.count}</span>
                      <span className="count-sep">/</span>
                      <span className="count-total">5</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(info.count / 5) * 100}%` }} />
                    </div>
                    <div className="matching-hint">还需 {Math.max(0, 3 - info.count)} 人即可成团</div>
                  </div>
                  <div className="matching-preference">
                    偏好: {dataStore.getPreferenceLabel(app.preference)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UserCenter;
