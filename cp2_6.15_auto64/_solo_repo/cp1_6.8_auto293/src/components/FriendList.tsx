import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InvitedFriend } from '@/utils/api';

interface FriendListProps {
  friends: InvitedFriend[];
  capsuleId: string;
  onInvite: (email: string) => void;
}

export default function FriendList({ friends, onInvite }: FriendListProps) {
  const [email, setEmail] = useState('');

  const handleInvite = () => {
    if (!email.trim()) return;
    onInvite(email.trim());
    setEmail('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInvite();
  };

  return (
    <div className="space-y-3">
      <h4 className="font-serif-heading text-base text-vintage-ink">邀请好友</h4>

      {friends.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-2 rounded-full bg-vintage-cream px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vintage-brown/20 text-xs font-medium text-vintage-ink">
                {friend.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-vintage-ink">{friend.name}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  friend.status === 'accepted'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700',
                )}
              >
                {friend.status === 'accepted' ? '已接受' : '待确认'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vintage-brown/50" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入好友邮箱"
            className="w-full rounded-lg border border-vintage-brown/20 bg-vintage-cream/50 py-2 pl-10 pr-3 text-sm text-vintage-ink placeholder:text-vintage-brown/40 focus:border-vintage-brown focus:outline-none"
          />
        </div>
        <button
          onClick={handleInvite}
          className="flex items-center gap-1 rounded-lg bg-vintage-brown px-4 py-2 text-sm text-vintage-cream transition-opacity hover:opacity-90"
        >
          <Send className="h-4 w-4" />
          邀请
        </button>
      </div>
    </div>
  );
}
