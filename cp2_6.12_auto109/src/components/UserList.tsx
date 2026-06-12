import React from 'react';
import { Users } from 'lucide-react';
import type { User } from '../../shared/types.js';

interface UserListProps {
  users: User[];
  localUserId: string;
}

const UserList: React.FC<UserListProps> = ({ users, localUserId }) => {
  return (
    <div className="user-list-container">
      <div className="user-list">
        <div className="user-count">
          <Users size={16} />
          <span>{users.length} 人在线</span>
        </div>
        <div className="users">
          {users.map((user) => (
            <div
              key={user.id}
              className={`user-item ${user.id === localUserId ? 'local' : ''}`}
            >
              <span
                className="user-color"
                style={{ backgroundColor: user.color }}
              />
              <span className="user-name">
                {user.nickname}
                {user.id === localUserId && ' (你)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .user-list-container {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 50;
        }

        .user-list {
          background: rgba(18, 18, 18, 0.95);
          border-radius: 12px;
          padding: 12px 16px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          min-width: 160px;
        }

        .user-count {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .users {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .user-item.local {
          color: #bb86fc;
        }

        .user-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 6px currentColor;
        }

        .user-name {
          font-size: 13px;
          color: #bdbdbd;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-item.local .user-name {
          color: #bb86fc;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .user-list-container {
            top: 12px;
            right: 12px;
          }

          .user-list {
            padding: 8px 12px;
            min-width: 120px;
          }

          .user-count {
            font-size: 12px;
            margin-bottom: 6px;
            padding-bottom: 6px;
          }

          .user-name {
            font-size: 12px;
            max-width: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserList;
