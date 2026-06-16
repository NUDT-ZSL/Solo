import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useApi } from '../hooks/useApi';
import type { Message } from '../types';

interface NotificationCenterProps {
  userId: string;
}

const messageIcons: Record<string, { icon: string; color: string }> = {
  match_success: { icon: '✓', color: '#10b981' },
  match_possible: { icon: '!', color: '#f59e0b' },
  system: { icon: 'i', color: '#6366f1' },
};

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();
  const { get, put, loading } = useApi<Message[]>();
  const { put: putRead } = useApi<{ success: boolean }>();

  const loadMessages = useCallback(async () => {
    const params = new URLSearchParams({ userId });
    const result = await get(`/api/messages?${params.toString()}`);
    if (result) {
      setMessages(result as unknown as Message[]);
    }
  }, [get, userId]);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId, loadMessages]);

  const handleMarkAsRead = useCallback(async (messageId: string) => {
    await putRead(`/api/messages/${messageId}/read`);
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, read: true } : m))
    );
  }, [putRead]);

  const handleMarkAllAsRead = useCallback(async () => {
    await put('/api/messages/read-all', { userId });
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, [put, userId]);

  const handleMessageClick = useCallback((message: Message) => {
    handleMarkAsRead(message.id);
    if (message.itemId) {
      navigate(`/item/${message.itemId}`);
    }
  }, [handleMarkAsRead, navigate]);

  const unreadCount = messages.filter(m => !m.read).length;

  const groupedMessages: Record<string, Message[]> = {};
  messages.forEach(message => {
    const date = dayjs(message.createdAt).format('YYYY-MM-DD');
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  const formatDate = (dateStr: string) => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return dayjs(dateStr).format('MM月DD日');
  };

  return (
    <div className="notification-container">
      <div className="notification-header">
        <div className="header-left">
          <h2 className="header-title">🔔 通知中心</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} 条未读</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            全部已读
          </button>
        )}
      </div>

      <div className="notification-content">
        <div className="notification-content-inner">
          {loading && messages.length === 0 ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>加载中...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">暂无通知消息</p>
              <p className="empty-subtext">系统会在匹配到物品时通知您</p>
            </div>
          ) : (
            <div className="timeline">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="timeline-group">
                  <div className="timeline-date">
                    <span className="date-text">{formatDate(date)}</span>
                    <div className="date-line" />
                  </div>
                  
                  <div className="timeline-items">
                    {dateMessages.map((message, index) => {
                      const iconInfo = messageIcons[message.type] || messageIcons.system;
                      const isLast = index === dateMessages.length - 1;
                      const dotClass = message.type === 'match_success' ? 'success' 
                        : message.type === 'match_possible' ? 'possible' 
                        : 'system';
                      
                      return (
                        <div
                          key={message.id}
                          className={`timeline-item ${message.read ? 'read' : 'unread'}`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="timeline-connector">
                            <div className={`timeline-dot ${dotClass}`}>
                              {iconInfo.icon}
                            </div>
                            {!isLast && <div className="timeline-line" />}
                          </div>
                          
                          <div className="timeline-content">
                            <div className="message-header">
                              <h4 className="message-title">{message.title}</h4>
                              {!message.read && <span className="new-dot" />}
                            </div>
                            <p className="message-content-text">{message.content}</p>
                            <span className="message-time">
                              {dayjs(message.createdAt).format('HH:mm')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .notification-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f9fafb;
        }
        
        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .header-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .unread-badge {
          padding: 2px 10px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .mark-all-btn {
          padding: 6px 14px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.2);
          color: #ffffff;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .mark-all-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .notification-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .notification-content-inner {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .notification-content-inner > * {
          grid-column: span 12;
        }
        
        @media (min-width: 768px) {
          .notification-content {
            padding: 24px;
          }
        }
        
        @media (min-width: 1024px) {
          .notification-content {
            padding: 32px;
          }
          
          .notification-content-inner > * {
            grid-column: 2 / span 10;
          }
        }
        
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
          color: #6366f1;
        }
        
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e0e7ff;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #9ca3af;
        }
        
        .empty-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        
        .empty-text {
          font-size: 15px;
          font-weight: 500;
          margin: 0 0 4px 0;
          color: #6b7280;
        }
        
        .empty-subtext {
          font-size: 13px;
          margin: 0;
        }
        
        .timeline {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .timeline-group {
          margin-bottom: 24px;
        }
        
        .timeline-date {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .date-text {
          font-size: 13px;
          font-weight: 600;
          color: #6366f1;
          background: #e0e7ff;
          padding: 4px 12px;
          border-radius: 12px;
          white-space: nowrap;
        }
        
        .date-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        
        .timeline-items {
          position: relative;
        }
        
        .timeline-item {
          display: flex;
          gap: 16px;
          cursor: pointer;
          transition: background 0.2s ease;
          border-radius: 12px;
        }
        
        .timeline-item:hover {
          background: #ffffff;
        }
        
        .timeline-item.unread .message-title {
          color: #1f2937;
        }
        
        .timeline-item.read .message-title,
        .timeline-item.read .message-content-text {
          color: #9ca3af;
        }
        
        .timeline-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 32px;
          flex-shrink: 0;
        }
        
        .timeline-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
          border: 3px solid #ffffff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .timeline-item:hover .timeline-dot {
          transform: scale(1.1);
        }
        
        .timeline-dot.success {
          background: #10b981;
          box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4);
        }
        
        .timeline-dot.possible {
          background: #f59e0b;
          box-shadow: 0 2px 12px rgba(245, 158, 11, 0.4);
        }
        
        .timeline-dot.system {
          background: #6366f1;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.4);
        }
        
        .timeline-line {
          width: 2px;
          flex: 1;
          background: #e5e7eb;
          margin: 4px 0;
          min-height: 20px;
        }
        
        .timeline-content {
          flex: 1;
          padding: 8px 16px 16px 0;
        }
        
        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .message-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .new-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          flex-shrink: 0;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .message-content-text {
          margin: 0 0 6px 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .message-time {
          font-size: 11px;
          color: #9ca3af;
        }
        
        @media (max-width: 768px) {
          .notification-content {
            padding: 12px;
          }
          
          .timeline-connector {
            width: 28px;
          }
          
          .timeline-dot {
            width: 28px;
            height: 28px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
