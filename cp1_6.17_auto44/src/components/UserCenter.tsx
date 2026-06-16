import React, { useState, useEffect, useRef } from 'react';
import { dataStore } from '../data/dataStore';

type TabType = 'matched' | 'matching';

interface UserCenterProps {
  onBack: () => void;
  onSelectRoute: (routeId: string) => void;
}

const UserCenter: React.FC<UserCenterProps> = ({ onBack, onSelectRoute }) => {
  const userId = dataStore.getCurrentUserId();
  const [, forceUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('matched');
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabsRef.current[activeTab === 'matched' ? 0 : 1];
      if (activeEl) {
        const parent = activeEl.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const elRect = activeEl.getBoundingClientRect();
          setIndicatorStyle({
            left: elRect.left - parentRect.left,
            width: elRect.width,
          });
        }
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  useEffect(() => {
    return dataStore.subscribe(() => forceUpdate((v) => v + 1));
  }, []);

  const userApps = dataStore.getUserApplications(userId);
  const matchedApps = userApps.filter((a) => a.status === 'matched');
  const matchingApps = userApps.filter((a) => a.status === 'matching');

  const displayApps = activeTab === 'matched' ? matchedApps : matchingApps;
  const displayEmptyText = activeTab === 'matched' ? '暂无已匹配的路线' : '暂无正在匹配的路线';

  return (
    <div className="user-center">
      <button className="back-btn" onClick={onBack}>
        ← 返回
      </button>
      <h1 className="page-title">个人中心</h1>

      <div className="tabs-container">
        <div className="tabs-wrapper">
          <button
            ref={(el) => { tabsRef.current[0] = el; }}
            className={`tab-btn ${activeTab === 'matched' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            ✅ 已匹配
            <span className="tab-count">{matchedApps.length}</span>
          </button>
          <button
            ref={(el) => { tabsRef.current[1] = el; }}
            className={`tab-btn ${activeTab === 'matching' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('matching')}
          >
            ⏳ 匹配中
            <span className="tab-count">{matchingApps.length}</span>
          </button>
          <div
            className="tab-indicator"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </div>
      </div>

      <section className="user-section">
        {displayApps.length === 0 ? (
          <div className="empty-state">{displayEmptyText}</div>
        ) : (
          <div className="card-grid">
            {displayApps.map((app) => {
              const route = dataStore.getRouteById(app.routeId);
              if (activeTab === 'matched') {
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
              } else {
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
              }
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UserCenter;
