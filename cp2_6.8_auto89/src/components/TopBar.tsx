import type { User } from '../Types';
import UserAvatar from './UserAvatar';

interface Props {
  roomCode: string;
  users: User[];
  selfUserId: string;
  onExit: () => void;
  onToggleHistory: () => void;
}

export default function TopBar({ roomCode, users, selfUserId, onExit, onToggleHistory }: Props) {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button className="menu-toggle" onClick={onToggleHistory} type="button" aria-label="历史">
          ☰
        </button>
        <div className="room-code">
          <span className="room-code-label">房间码：</span>
          {roomCode}
        </div>
      </div>
      <div className="top-bar-right">
        <div className="online-users">
          {users.map((u) => (
            <UserAvatar key={u.id} user={u} isSelf={u.id === selfUserId} />
          ))}
        </div>
        <button className="btn-secondary" onClick={onExit} type="button">
          退出
        </button>
      </div>
    </div>
  );
}
