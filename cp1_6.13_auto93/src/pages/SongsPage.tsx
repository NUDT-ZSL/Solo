import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Song } from '../types';

const SongsPage: React.FC = () => {
  const { songs, updateSong, updateSongsOrder } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBpm, setEditBpm] = useState<number>(0);
  const [editKey, setEditKey] = useState<string>('');
  const [editProgress, setEditProgress] = useState<number>(0);

  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndexRef.current !== index) {
      dragOverIndexRef.current = index;
      setDragOverIndex(index);
    }
  };

  const onDragLeave = () => {
    dragOverIndexRef.current = null;
    setDragOverIndex(null);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDragOverIndex(null);
    if (from === null || from === index) return;

    const newSongs = [...songs];
    const [moved] = newSongs.splice(from, 1);
    newSongs.splice(index, 0, moved);
    const updates = newSongs.map((s, i) => ({ _id: s._id, order: i }));
    await updateSongsOrder(updates);
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDragOverIndex(null);
  };

  const openEdit = (song: Song) => {
    setEditingId(song._id);
    setEditBpm(song.bpm);
    setEditKey(song.key);
    setEditProgress(song.progress);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateSong(editingId, { bpm: editBpm, key: editKey, progress: editProgress });
    setEditingId(null);
  };

  const togglePracticed = async (song: Song) => {
    await updateSong(song._id, { practiced: !song.practiced, progress: !song.practiced ? Math.max(song.progress, 80) : song.progress });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">排练曲目</h2>
        <div className="hint-text">拖拽卡片可调整顺序 · 点击曲目编辑BPM和调性</div>
      </div>

      <div className="songs-grid">
        {songs.map((song, index) => (
          <div
            key={song._id}
            className={`song-card ${dragOverIndex === index ? 'song-drop-over' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, index)}
            onDragEnd={onDragEnd}
            onClick={() => !editingId && openEdit(song)}
          >
            <div className="song-drag-handle" title="拖拽调整顺序">⋮⋮</div>
            <div className="song-card-body">
              <div className="song-name" title={song.name}>
                {song.name}
              </div>

              {editingId === song._id ? (
                <div className="song-edit-form" onClick={(e) => e.stopPropagation()}>
                  <label>
                    BPM
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={editBpm}
                      onChange={(e) => setEditBpm(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    调性
                    <input
                      type="text"
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                    />
                  </label>
                  <label>
                    进度 {editProgress}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={editProgress}
                      onChange={(e) => setEditProgress(Number(e.target.value))}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="btn-sm" onClick={() => setEditingId(null)}>取消</button>
                    <button className="btn-sm btn-primary" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="song-info">
                    <span className="info-item">🎵 {song.bpm} BPM</span>
                    <span className="info-item">🎼 {song.key}</span>
                  </div>

                  <div className="progress-bar-container">
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${song.progress}%` }}
                      />
                    </div>
                    <span className="progress-label">{song.progress}%</span>
                  </div>

                  <label className="practiced-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={song.practiced}
                      onChange={() => togglePracticed(song)}
                    />
                    <span>已排练</span>
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongsPage;
