import { User } from 'lucide-react';
import { getAvatarColor, getInitials } from '@/utils/helpers';

interface AvatarProps {
  name: string;
  avatar?: string;
  size?: number;
  className?: string;
}

const Avatar = ({ name, avatar, size = 40, className = '' }: AvatarProps) => {
  const bgColor = getAvatarColor(name);
  const initials = getInitials(name);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.4,
      }}
    >
      {name ? initials : <User className="w-5 h-5" />}
    </div>
  );
};

export default Avatar;
