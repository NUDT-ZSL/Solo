import React, { useEffect, useRef, useState } from 'react';
import { Activity, getActivities, subscribeActivities } from '../client/activity';

export const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const renderActivity = (a: Activity) => {
  switch (a.type) {
    case 'complete_book':
      return <>完成了《<strong>{a.bookTitle}</strong>》的阅读 🎉</>;
    case 'add_book':
      return <>将《<strong>{a.bookTitle}</strong>》加入俱乐部书库</>;
    case 'vote_book':
      return <>为《<strong>{a.bookTitle}</strong>》投了一票 🗳️</>;
    case 'announcement':
      return <><span style={{color:'#d97706'}}>📢 公告：</span>{a.content}</>;
    case 'new_vote':
      return <><span style={{color:'#d97706'}}>📋</span> {a.content}</>;
    default:
      return null;
  }
};

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [flash, setFlash] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getActivities().then(setActivities);
    const unsub = subscribeActivities((newAct) => {
      setActivities((prev) => [newAct, ...prev].slice(0, 20));
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    });
    return unsub;
  }, []);

  return (
    <aside className={`activity-feed ${flash ? 'flash' : ''}`}>
      <h3 className="feed-title">✨ 俱乐部动态</h3>
      <div className="feed-list" ref={listRef}>
        {activities.map((a) => (
          <div key={a._id} className="feed-item">
            <img
              src={a.avatar}
              alt={a.username}
              className="feed-avatar"
              style={{ width: '12px', height: '12px', borderRadius: '50%' }}
            />
            <div className="feed-content">
              <div className="feed-text">
                <strong>{a.username}</strong>{' '}
                {renderActivity(a)}
              </div>
              <div className="feed-time">{formatTime(a.createdAt)}</div>
            </div>
          </div>
        ))}
        {activities.length === 0 && <div className="feed-empty">暂无动态</div>}
      </div>
    </aside>
  );
};

export default ActivityFeed;
