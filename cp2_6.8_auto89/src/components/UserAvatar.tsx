import type { User } from '../Types';

interface Props {
  user: User;
  isSelf?: boolean;
}

export default function UserAvatar({ user, isSelf }: Props) {
  const initial = user.nickname.charAt(0).toUpperCase();
  return (
    <div className="user-avatar" style={{ background: user.color }}>
      {initial}
      <span className="tooltip">
        {user.nickname}
        {isSelf ? '（我）' : ''}
      </span>
    </div>
  );
}
