import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useArtist, useSongs, useTourCities } from '../hooks/useData';
import SongCard from '../components/SongCard';
import TourMap from '../components/TourMap';
import FavoriteButton from '../components/FavoriteButton';
import { optimizeRoute } from '../utils/routeOptimizer';
import dayjs from 'dayjs';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const { artist, loading: artistLoading } = useArtist(id);
  const { songs, loading: songsLoading, addSong } = useSongs(id);
  const { cities, loading: citiesLoading } = useTourCities(id);
  const [showAddSong, setShowAddSong] = useState(false);
  const [form, setForm] = useState({ title: '', lyrics: '', genre: '' });

  if (artistLoading) return <div className="container"><div className="loading"><div className="spinner" /></div></div>;
  if (!artist) return <div className="container"><div className="empty-state">音乐人不存在</div></div>;

  const optimized = optimizeRoute(cities);

  const handleAddSong = () => {
    if (!form.title.trim() || !form.lyrics.trim()) return;
    const genre = form.genre.split(/[,，\s]+/).filter(Boolean);
    addSong({ title: form.title, lyrics: form.lyrics, genre });
    setForm({ title: '', lyrics: '', genre: '' });
    setShowAddSong(false);
  };

  return (
    <div className="container">
      <div className="artist-detail-header">
        <img src={artist.avatar} alt={artist.name} className="artist-detail-avatar" />
        <div className="artist-detail-info" style={{ flex: 1 }}>
          <h1>{artist.name}</h1>
          <p>{artist.bio}</p>
          <div className="artist-genres" style={{ justifyContent: 'flex-start' }}>
            {artist.genre.map((g, i) => (
              <span key={i} className="genre-tag">{g}</span>
            ))}
          </div>
        </div>
        <FavoriteButton artist={artist} />
      </div>

      <div className="section-title">
        <span>🎵 音乐作品</span>
        <button className="btn btn-primary" onClick={() => setShowAddSong(true)}>
          + 上传歌曲
        </button>
      </div>
      {songsLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : songs.length === 0 ? (
        <div className="empty-state">暂无作品</div>
      ) : (
        <div className="song-grid" style={{ marginBottom: '40px' }}>
          {songs.map(s => <SongCard key={s.id} song={s} />)}
        </div>
      )}

      <div className="section-title">
        <span>🗺️ 巡演安排</span>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {cities.length} 个城市 · 右键标记可移除
        </span>
      </div>
      {citiesLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : cities.length === 0 ? (
        <div className="empty-state">暂无巡演安排</div>
      ) : (
        <>
          <TourMap cities={cities} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '16px'
          }}>
            {optimized.map((c, i) => (
              <div key={c.id} style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--accent-primary)', color: 'white',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '600'
                  }}>{i + 1}</span>
                  <strong>{c.name}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {dayjs(c.date).format('YYYY-MM-DD')} · 热度 {c.popularity}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddSong && (
        <div className="modal-overlay" onClick={() => setShowAddSong(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">上传新歌曲</div>
            <div className="form-group">
              <label className="form-label">歌曲标题</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="输入歌曲名称"
              />
            </div>
            <div className="form-group">
              <label className="form-label">歌词</label>
              <textarea
                className="form-textarea"
                value={form.lyrics}
                onChange={e => setForm({ ...form, lyrics: e.target.value })}
                placeholder="输入歌词内容"
              />
            </div>
            <div className="form-group">
              <label className="form-label">风格标签（逗号分隔）</label>
              <input
                className="form-input"
                value={form.genre}
                onChange={e => setForm({ ...form, genre: e.target.value })}
                placeholder="例如：摇滚, 民谣"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddSong(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAddSong}>确认上传</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
