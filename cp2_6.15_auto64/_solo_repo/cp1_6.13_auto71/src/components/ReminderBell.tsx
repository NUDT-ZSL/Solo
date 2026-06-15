import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Reminder } from '../types';
import { getReminders, markReminderRead, markAllRemindersRead } from '../utils/api';
import { BellIcon } from './icons';

interface ReminderBellProps {
  onNotification?: (reminders: Reminder[]) => void;
}

const ReminderBell: React.FC<ReminderBellProps> = memo(function ReminderBell({ onNotification }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const drawerRef = useRef<HTMLDivElement>(null);

  const unreadCount = reminders.filter(r => !r.read).length;

  const fetchReminders = useCallback(async () => {
    try {
      const data = await getReminders();
      setReminders(data);

      const newUnread = data.filter(r => !r.read && !notifiedIds.has(r._id));
      if (newUnread.length > 0 && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          newUnread.forEach(reminder => {
            new Notification('🌱 GrowSync 提醒', {
              body: reminder.message,
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌱</text></svg>',
            });
          });
          setNotifiedIds(prev => {
            const next = new Set(prev);
            newUnread.forEach(r => next.add(r._id));
            return next;
          });
        }
        if (onNotification) {
          onNotification(newUnread);
        }
      }
    } catch (err) {
      console.error('获取提醒失败:', err);
    }
  }, [notifiedIds, onNotification]);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const handleMarkRead = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markReminderRead(id);
      setReminders(prev => prev.map(r => r._id === id ? { ...r, read: true } : r));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRemindersRead();
      setReminders(prev => prev.map(r => ({ ...r, read: true })));
    } catch (err) {
      console.error('标记全部已读失败:', err);
    }
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeDrawer();
    }
  }, [closeDrawer]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeDrawer]);

  return (
    <>
      <button
        onClick={toggleDrawer}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      >
        <BellIcon size={22} color="#ffffff" />

        {unreadCount > 0 && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1s infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 9,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            onClick={handleOverlayClick}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
            }}
          />

          <div
            ref={drawerRef}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 320,
              height: '100vh',
              background: '#ffffff',
              borderRadius: '12px 0 0 12px',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <div style={{
              padding: '20px 20px 16px 20px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                通知
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#22c55e',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  全部已读
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {reminders.length === 0 ? (
                <div style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: 14,
                }}>
                  暂无通知
                </div>
              ) : (
                reminders.map(reminder => (
                  <div
                    key={reminder._id}
                    onClick={(e) => handleMarkRead(reminder._id, e)}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid #f9fafb',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        marginTop: 4,
                        flexShrink: 0,
                        border: reminder.read ? '2px dashed #d1d5db' : '2px solid #22c55e',
                        background: reminder.read ? 'transparent' : '#22c55e',
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        color: reminder.read ? '#9ca3af' : '#1f2937',
                        fontWeight: reminder.read ? 400 : 500,
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}>
                        {reminder.message}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: '#d1d5db',
                      }}>
                        {formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true, locale: zhCN })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
});

export default ReminderBell;
