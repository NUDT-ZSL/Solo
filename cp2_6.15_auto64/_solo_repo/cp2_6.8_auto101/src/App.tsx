import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, Music2 } from 'lucide-react';
import type { Playlist, Song } from './types';
import PlaylistCard from './PlaylistCard';
import SongList from './SongList';
import MusicPlayer from './MusicPlayer';

type View =
  | { type: 'home' }
  | { type: 'detail'; playlistId: string };

const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [view, setView] = useState<View>({ type: 'home' });
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playingSong, setPlayingSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data: Playlist[]) => setPlaylists(data))
      .catch(() => {});
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
        }),
      });
      if (res.ok) {
        const playlist: Playlist = await res.json();
        setPlaylists((prev) => [...prev, playlist]);
        setNewTitle('');
        setNewDesc('');
        showToast('播放列表创建成功');
      }
    } catch {
      showToast('创建失败');
    }
  };

  const handleCopyShare = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#${playlist.shareCode}`;
    const text = `${playlist.shareCode} ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制');
    } catch {
      showToast('复制失败');
    }
  };

  const handleOpenPlaylistClick = async (playlist: Playlist) => {
    setView({ type: 'detail', playlistId: playlist.id });
    setCurrentPlaylist(playlist);
  };

  const handleGoHome = () => {
    setView({ type: 'home' });
    setCurrentPlaylist(null);
  };

  const handleAddSong = async (song: Song) => {
    if (!currentPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${currentPlaylist.id}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song }),
      });
      if (res.ok) {
        const updated: Playlist = await res.json();
        setCurrentPlaylist(updated);
        setPlaylists((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      }
    } catch {
      showToast('添加歌曲失败');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!currentPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${currentPlaylist.id}/songs/${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated: Playlist = await res.json();
        setCurrentPlaylist(updated);
        setPlaylists((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p));
        if (playingSong?.id === songId) {
          setPlayingSong(null);
          setIsPlaying(false);
        }
      }
    } catch {
      showToast('删除歌曲失败');
    }
  };

  const handleReorder = async (songIds: string[]) => {
    if (!currentPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${currentPlaylist.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songIds }),
      });
      if (res.ok) {
        const updated: Playlist = await res.json();
        setCurrentPlaylist(updated);
        setPlaylists((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      }
    } catch {
      showToast('排序失败');
    }
  };

  const handleSongClick = (song: Song) => {
    if (playingSong?.id === song.id) {
      setIsPlaying((prev) => !prev);
    } else {
      setPlayingSong(song);
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSongEnd = useCallback(() => {
    if (!currentPlaylist || !playingSong) return;
    const idx = currentPlaylist.songs.findIndex((s) => s.id === playingSong.id);
    if (idx >= 0 && idx < currentPlaylist.songs.length - 1) {
      setPlayingSong(currentPlaylist.songs[idx + 1]);
      setIsPlaying(true);
    } else if (currentPlaylist.songs.length > 0) {
      setPlayingSong(currentPlaylist.songs[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [currentPlaylist, playingSong]);

  const handlePlayNext = () => {
    if (!currentPlaylist || !playingSong) return;
    const idx = currentPlaylist.songs.findIndex((s) => s.id === playingSong.id);
    if (idx >= 0 && idx < currentPlaylist.songs.length - 1) {
      setPlayingSong(currentPlaylist.songs[idx + 1]);
      setIsPlaying(true);
    }
  };

  const handlePlayPrev = () => {
    if (!currentPlaylist || !playingSong) return;
    const idx = currentPlaylist.songs.findIndex((s) => s.id === playingSong.id);
    if (idx > 0) {
      setPlayingSong(currentPlaylist.songs[idx - 1]);
      setIsPlaying(true);
    }
  };

  return (
    <div className="app">
      {view.type === 'home' ? (
        <div className="home">
          <div className="home-header">
            <h1>🎵 SonicViz</h1>
            <p>创建个性化音乐播放列表，体验实时频谱可视化</p>
          </div>
          <div className="home-content">
            <div className="create-panel">
              <h2>创建新播放列表</h2>
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="我的歌单名称"
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="这个歌单的介绍..."
                  rows={4}
                  maxLength={200}
                />
              </div>
              <button className="btn-primary" onClick={handleCreatePlaylist}>
                创建播放列表
              </button>
            </div>

            <div className="playlists-section">
              <h2>我的播放列表</h2>
              <div className="playlists-grid">
                {playlists.length === 0 ? (
                  <div className="empty-state">
                  <div className="empty-state-icon">🎶</div>
                    <p>还没有播放列表，创建你的第一个歌单吧</p>
                  </div>
                ) : (
                  playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onClick={() => handleOpenPlaylistClick(playlist)}
                      onCopyShare={(e) => handleCopyShare(e, playlist)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        currentPlaylist && (
          <div className="detail-page">
          <div className="detail-header">
            <button className="btn-back" onClick={handleGoHome}>
              <ArrowLeft size={16} />
              返回
            </button>
            <h1 className="detail-title">{currentPlaylist.title}</h1>
            <p className="detail-desc">
              {currentPlaylist.description || '暂无描述'}
            </p>
            <div className="detail-meta">
              <span className="song-count-badge">
                <Music2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {currentPlaylist.songs.length} 首歌曲
              </span>
              <button
                className="btn-copy"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/#${currentPlaylist.shareCode}`;
                  navigator.clipboard
                    .writeText(`${currentPlaylist.shareCode} ${shareUrl}`)
                    .then(() => showToast('已复制'))
                    .catch(() => showToast('复制失败'));
                }}
              >
                <Check size={14} />
                {currentPlaylist.shareCode}
              </button>
            </div>
          </div>

          <SongList
            songs={currentPlaylist.songs}
            playingSongId={playingSong?.id || null}
            onSongClick={handleSongClick}
            onDeleteSong={handleDeleteSong}
            onReorder={handleReorder}
            onAddSong={handleAddSong}
          />
        </div>
      )
    )}

    {playingSong && (
      <MusicPlayer
        song={playingSong}
        playlistSongs={currentPlaylist?.songs || []}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSongEnd={handleSongEnd}
        onPlayNext={handlePlayNext}
        onPlayPrev={handlePlayPrev}
      />
    )}

    {toast && (
      <div className="toast">
        <Check size={16} />
        {toast}
      </div>
    )}
    </div>
  );
};

export default App;
