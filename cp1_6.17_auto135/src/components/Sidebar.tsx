import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
      .then(res => res.json())
      .then(data => setMeetings(data.slice(0, 5)));
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-icon">📋</span>
          <span className="logo-text">MeetingFlow</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
            onClick={onToggle}
          >
            <span className="nav-icon">🏠</span>
            <span>会议列表</span>
          </Link>
          <Link 
            to="/dashboard" 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={onToggle}
          >
            <span className="nav-icon">📊</span>
            <span>仪表盘</span>
          </Link>
        </nav>

        <div className="sidebar-section">
          <h3 className="section-title">最近会议</h3>
          <div className="recent-meetings">
            {meetings.map(meeting => (
              <Link
                key={meeting.id}
                to={`/meeting/${meeting.id}`}
                className="recent-meeting-item"
                onClick={onToggle}
              >
                <div className="meeting-dot" />
                <div className="meeting-info">
                  <span className="meeting-name">{meeting.title}</span>
                  <span className="meeting-date">
                    {new Date(meeting.dateTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
