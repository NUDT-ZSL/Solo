import React, { useState } from 'react';
import { HiddenMenu, User } from '../types';
import { addFavorite, getFavorites } from '../logic/unlockLogic';
import { createPost } from '../api';
import './HiddenMenuModal.css';

interface HiddenMenuModalProps {
  menu: HiddenMenu | null;
  user: User;
  onClose: () => void;
  onShared: () => void;
  showToast: (msg: string) => void;
}

const HiddenMenuModal: React.FC<HiddenMenuModalProps> = ({ menu, user, onClose, onShared, showToast }) => {
  const [closing, setClosing] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [sharing, setSharing] = useState(false);

  React.useEffect(() => {
    if (menu) {
      setClosing(false);
      const favs = getFavorites(user.id);
      setFavorited(favs.some((f) => f.id === menu.id));
    }
  }, [menu, user.id]);

  if (!menu) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleFavorite = () => {
    if (favorited) {
      showToast('已经收藏过了');
      return;
    }
    const ok = addFavorite(user.id, menu);
    if (ok) {
      setFavorited(true);
      showToast('收藏成功！');
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await createPost(menu);
      showToast('已分享到动态墙！');
      onShared();
    } catch {
      showToast('分享失败');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="hm-overlay" onClick={handleClose}>
      <div
        className={`hm-card ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hm-header">
          <span className="hm-badge">✨ 解锁隐藏菜单</span>
          <button className="hm-close" onClick={handleClose}>✕</button>
        </div>
        <div className="hm-image">
          <svg viewBox="0 0 160 160" width="140" height="140">
            <defs>
              <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8D6E63" />
                <stop offset="100%" stopColor="#5D4037" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="70" fill="none" stroke="#FFF8E1" strokeWidth="2" opacity="0.3" />
            <path
              d="M45 60h70c0 30-15 48-35 48S45 90 45 60z"
              fill="url(#cupGrad)"
              stroke="#FFF8E1"
              strokeWidth="2.5"
            />
            <ellipse cx="80" cy="60" rx="35" ry="7" fill="#3E2723" />
            <path
              d="M115 64c8 2 14 12 14 24s-6 22-14 24"
              fill="none"
              stroke="#FFF8E1"
              strokeWidth="2.5"
            />
            <ellipse cx="80" cy="60" rx="26" ry="5" fill="#FF8A65" />
            <path d="M68 38c3-8 10-8 13 0M80 34c3-8 10-8 13 0M72 28c2-6 8-6 10 0"
              stroke="#FFE0B2" strokeWidth="2" fill="none" opacity="0.9" />
          </svg>
        </div>
        <h2 className="hm-name">{menu.name}</h2>
        <p className="hm-story">{menu.story}</p>
        <div className="hm-actions">
          <button
            className={`hm-btn fav ${favorited ? 'done' : ''}`}
            onClick={handleFavorite}
          >
            {favorited ? '♥ 已收藏' : '♡ 收藏'}
          </button>
          <button
            className="hm-btn share"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? '分享中...' : '分享到墙'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HiddenMenuModal;
