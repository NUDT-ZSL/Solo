import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Meeting } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    fetch('/api/meetings')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('API请求失败');
      })
      .then(data => {
        if (Array.isArray(data)) {
          setMeetings(data.slice(0, 5));
        }
      })
      .catch(err => {
        console.error('加载会议列表失败:', err);
        setMeetings([]);
      });
  }, [location.pathname]);

  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) => {
    return `nav-item ${isActive ? 'active' : ''}`;
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-icon">📋</span>
          <span className="logo-text">MeetingFlow</span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink 
            to="/" 
            className={getNavLinkClassName}
            onClick={onToggle}
          >
            <span className="nav-icon">🏠</span>
            <span>会议列表</span>
          </NavLink>
          <NavLink 
            to="/dashboard" 
            className={getNavLinkClassName}
            onClick={onToggle}
          >
            <span className="nav-icon">📊</span>
            <span>仪表盘</span>
          </NavLink>
        </nav>

        <div className="sidebar-section">
          <h3 className="section-title">最近会议</h3>
          <div className="recent-meetings">
            {meetings.map(meeting => (
              <NavLink
                key={meeting.id}
                to={`/meeting/${meeting.id}`}
                className={({ isActive }) => `recent-meeting-item ${isActive ? 'active' : ''}`}
                onClick={onToggle}
              >
                <div className="meeting-dot" />
                <div className="meeting-info">
                  <span className="meeting-name">{meeting.title}</span>
                  <span className="meeting-date">
                    {new Date(meeting.dateTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
