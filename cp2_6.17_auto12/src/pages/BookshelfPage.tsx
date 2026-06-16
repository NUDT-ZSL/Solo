import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import dayjs from 'dayjs';

type Tab = 'reserved' | 'borrowed' | 'history';

function getCountdown(expireAt: string): string {
  const diff = dayjs(expireAt).diff(dayjs(), 'second');
  if (diff <= 0) return '已过期';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分钟`;
}

export function BookshelfPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('reserved');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const timer = setInterval(() => forceUpdate((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, [user, navigate]);

  if (!user) return null;

  const activeReservations = user.reservations.filter(
    (r) => dayjs(r.expireAt) > dayjs()
  );
  const expiredReservations = user.reservations.filter(
    (r) => dayjs(r.expireAt) <= dayjs()
  );

  const styles = `
    .bookshelf-page {
      padding: 92px 32px 48px;
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      gap: 24px;
    }
    .bookshelf-left {
      width: 30%;
      flex-shrink: 0;
    }
    .bookshelf-right {
      width: 70%;
      flex: 1;
    }
    .profile-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      text-align: center;
      position: sticky;
      top: 92px;
    }
    .profile-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #8b5cf6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      margin: 0 auto 16px;
    }
    .profile-nickname {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .profile-email {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 20px;
    }
    .profile-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 20px 0;
    }
    .profile-stats-title {
      font-size: 13px;
      color: #6b7280;
      text-align: left;
      margin-bottom: 12px;
    }
    .profile-stats {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .profile-stat {
      flex: 1;
      text-align: center;
      padding: 12px 4px;
      background: #faf5ff;
      border-radius: 8px;
    }
    .profile-stat-num {
      font-size: 20px;
      font-weight: 700;
      color: #8b5cf6;
    }
    .profile-stat-label {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }
    .profile-registered {
      margin-top: 16px;
      font-size: 12px;
      color: #9ca3af;
    }
    .tabs-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .tabs-header {
      display: flex;
      border-bottom: 1px solid #e5e7eb;
    }
    .tabs-item {
      flex: 1;
      padding: 16px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      border-bottom: 3px solid transparent;
    }
    .tabs-item.active {
      color: #8b5cf6;
      border-bottom-color: #8b5cf6;
      background: #faf5ff;
    }
    .tabs-content {
      padding: 20px;
      min-height: 400px;
    }
    .book-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-radius: 10px;
      background: #fafafa;
      margin-bottom: 12px;
      transition: background 0.2s ease;
    }
    .book-list-item:hover {
      background: #f5f3ff;
    }
    .book-list-info {
      flex: 1;
    }
    .book-list-title {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .book-list-author {
      font-size: 13px;
      color: #6b7280;
    }
    .book-list-meta {
      text-align: right;
      margin-left: 16px;
    }
    .book-list-status {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .book-list-status.reserved { color: #f59e0b; }
    .book-list-status.borrowed { color: #3b82f6; }
    .book-list-status.expired { color: #9ca3af; }
    .book-list-date {
      font-size: 12px;
      color: #9ca3af;
    }
    .book-list-empty {
      text-align: center;
      padding: 48px 24px;
      color: #9ca3af;
      font-size: 14px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .action-btn-warning {
      background: #fef3c7;
      color: #b45309;
    }
    .action-btn-warning:hover { background: #fde68a; }
    .action-btn-primary {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .action-btn-primary:hover { background: #bfdbfe; }
    @media (max-width: 768px) {
      .bookshelf-page {
        padding: 92px 16px 32px;
        flex-direction: column;
      }
      .bookshelf-left,
      .bookshelf-right {
        width: 100%;
      }
      .profile-card {
        position: static;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="bookshelf-page page-fade-in">
        <div className="bookshelf-left">
          <div className="profile-card">
            <div className="profile-avatar">{user.nickname.charAt(0)}</div>
            <div className="profile-nickname">{user.nickname}</div>
            <div className="profile-email">{user.email}</div>
            <div className="profile-divider" />
            <div className="profile-stats-title">借阅统计</div>
            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-num">{user.borrowStats.reserved}</div>
                <div className="profile-stat-label">预约中</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{user.borrowStats.borrowed}</div>
                <div className="profile-stat-label">已借阅</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{user.borrowStats.total}</div>
                <div className="profile-stat-label">累计</div>
              </div>
            </div>
            <div className="profile-registered">
              注册于 {dayjs(user.registeredAt).format('YYYY-MM-DD')}
            </div>
          </div>
        </div>

        <div className="bookshelf-right">
          <div className="tabs-card">
            <div className="tabs-header">
              <div
                className={`tabs-item ${tab === 'reserved' ? 'active' : ''}`}
                onClick={() => setTab('reserved')}
              >
                已预约（{activeReservations.length}）
              </div>
              <div
                className={`tabs-item ${tab === 'borrowed' ? 'active' : ''}`}
                onClick={() => setTab('borrowed')}
              >
                借阅中（{user.borrowed.length}）
              </div>
              <div
                className={`tabs-item ${tab === 'history' ? 'active' : ''}`}
                onClick={() => setTab('history')}
              >
                历史记录（{expiredReservations.length}）
              </div>
            </div>
            <div className="tabs-content">
              {tab === 'reserved' && (
                <>
                  {activeReservations.length === 0 ? (
                    <div className="book-list-empty">暂无预约中的图书</div>
                  ) : (
                    activeReservations.map((r) => (
                      <div className="book-list-item" key={r.id}>
                        <div className="book-list-info">
                          <div className="book-list-title">{r.bookTitle}</div>
                          <div className="book-list-author">{r.bookAuthor}</div>
                        </div>
                        <div className="book-list-meta">
                          <div className="book-list-status reserved">
                            ⏰ {getCountdown(r.expireAt)}
                          </div>
                          <div className="book-list-date">
                            {dayjs(r.createdAt).format('MM-DD HH:mm')} 预约
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
              {tab === 'borrowed' && (
                <>
                  {user.borrowed.length === 0 ? (
                    <div className="book-list-empty">暂无借阅中的图书</div>
                  ) : (
                    user.borrowed.map((b) => (
                      <div className="book-list-item" key={b.id}>
                        <div className="book-list-info">
                          <div className="book-list-title">{b.bookTitle}</div>
                          <div className="book-list-author">{b.bookAuthor}</div>
                        </div>
                        <div className="book-list-meta">
                          <div className="book-list-status borrowed">
                            应还 {dayjs(b.dueDate).format('MM-DD')}
                          </div>
                          <div className="book-list-date">
                            借阅 {dayjs(b.borrowDate).format('MM-DD')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
              {tab === 'history' && (
                <>
                  {expiredReservations.length === 0 ? (
                    <div className="book-list-empty">暂无历史记录</div>
                  ) : (
                    expiredReservations.map((r) => (
                      <div className="book-list-item" key={r.id}>
                        <div className="book-list-info">
                          <div className="book-list-title">{r.bookTitle}</div>
                          <div className="book-list-author">{r.bookAuthor}</div>
                        </div>
                        <div className="book-list-meta">
                          <div className="book-list-status expired">已过期</div>
                          <div className="book-list-date">
                            {dayjs(r.createdAt).format('YYYY-MM-DD')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
