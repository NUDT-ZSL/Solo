import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, GripVertical, Plus } from 'lucide-react';
import type { Song } from './types';

interface Props {
  songs: Song[];
  playingSongId: string | null;
  onSongClick: (song: Song) => void;
  onDeleteSong: (songId: string) => void;
  onReorder: (songIds: string[]) => void;
  onAddSong: (song: Song) => void;
}

const formatTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SongList: React.FC<Props> = ({
  songs,
  playingSongId,
  onSongClick,
  onDeleteSong,
  onReorder,
  onAddSong,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/songs/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data: Song[] = await res.json();
          const existingIds = new Set(songs.map((s) => s.id));
          setSuggestions(data.filter((s) => !existingIds.has(s.id)));
        }
      } catch {
        // ignore abort errors
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, songs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent, songId: string) => {
    setDraggedId(songId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', songId);
  };

  const handleDragOver = (e: React.DragEvent, songId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (songId !== draggedId) {
      setDragOverId(songId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...songs];
    const draggedIndex = newOrder.findIndex((s) => s.id === draggedId);
    const targetIndex = newOrder.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    onReorder(newOrder.map((s) => s.id));
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddSong = (song: Song) => {
    onAddSong(song);
    setSuggestions((prev) => prev.filter((s) => s.id !== song.id));
  };

  return (
    <>
      <div className="search-section" ref={searchRef}>
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="搜索歌曲或艺术家..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((song) => (
              <div
                key={song.id}
                className="search-item"
                onClick={() => handleAddSong(song)}
              >
                <div
                  className="search-item-cover"
                  style={{ background: song.coverColor }}
                />
                <div className="search-item-info">
                  <div className="search-item-title">{song.title}</div>
                  <div className="search-item-artist">{song.artist}</div>
                </div>
                <span className="search-item-duration">{formatTime(song.duration)}</span>
                <button className="btn-add" onClick={(e) => {
                  e.stopPropagation();
                  handleAddSong(song);
                }}>
                  <Plus size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="song-list">
        <div className="song-list-header">
          <span></span>
          <span>#</span>
          <span>标题</span>
          <span className="artist-col">艺术家</span>
          <span>时长</span>
          <span></span>
        </div>
        {songs.length === 0 ? (
          <div className="empty-song-list">
            <p>暂无歌曲，在上方搜索框搜索并添加歌曲吧</p>
          </div>
        ) : (
          songs.map((song, index) => (
            <div
              key={song.id}
              className={`song-item ${draggedId === song.id ? 'dragging' : ''} ${
                dragOverId === song.id ? 'drag-over' : ''
              } ${playingSongId === song.id ? 'playing' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, song.id)}
              onDragOver={(e) => handleDragOver(e, song.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, song.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSongClick(song)}
            >
              <div className="drag-handle">
                <GripVertical size={16} />
              </div>
              <span className="song-index">{index + 1}</span>
              <div
                className="song-cover"
                style={{ background: song.coverColor }}
              />
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
              <span className="song-duration">{formatTime(song.duration)}</span>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSong(song.id);
                }}
                title="删除歌曲"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default SongList;
