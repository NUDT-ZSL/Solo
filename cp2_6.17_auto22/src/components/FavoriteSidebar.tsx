import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useData';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';

export default function FavoriteSidebar() {
  const { favorites, loading } = useFavorites();
  const { sidebarOpen } = useStore();
  const navigate = useNavigate();

  if (loading) return null;

  return (
    <aside className={'tour-sidebar' + (sidebarOpen ? '' : ' collapsed')} style={{ top: '0', marginTop: 0 }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        ❤️ 我的收藏
      </h3>
      {favorites.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px 0', fontSize: '13px' }}>
          还没有收藏音乐人
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {favorites.map(f => (
            <div
              key={f.id} className="favorite-item"
              onClick={() => navigate(`/artist/${f.artistId}`)}
            >
              <img src={f.artist.avatar} alt={f.artist.name} className="favorite-avatar" />
              <div className="favorite-info">
                <div className="favorite-name">{f.artist.name}</div>
                <div className="favorite-date">收藏于 {dayjs(f.createdAt).format('MM-DD HH:mm')}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
