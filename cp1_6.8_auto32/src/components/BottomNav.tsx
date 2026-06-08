import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, User } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isWall = location.pathname === '/';
  const isMine = location.pathname === '/mine';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-lg">
        <div
          className="mx-4 mb-4 rounded-2xl flex items-center justify-around py-2.5"
          style={{
            background: 'rgba(15, 15, 46, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <button
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all ${
              isWall ? 'bg-white/5' : ''
            }`}
          >
            <Clock
              size={20}
              className={isWall ? 'text-cyan-400' : 'text-white/30'}
            />
            <span
              className={`text-xs ${
                isWall ? 'text-cyan-400' : 'text-white/30'
              }`}
            >
              时痕墙
            </span>
          </button>
          <button
            onClick={() => navigate('/mine')}
            className={`flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all ${
              isMine ? 'bg-white/5' : ''
            }`}
          >
            <User
              size={20}
              className={isMine ? 'text-cyan-400' : 'text-white/30'}
            />
            <span
              className={`text-xs ${
                isMine ? 'text-cyan-400' : 'text-white/30'
              }`}
            >
              我的胶囊
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
