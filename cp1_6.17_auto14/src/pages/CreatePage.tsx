import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioEngine } from '../business/audio-engine';
import type { Song, ThemeType } from '../types';
import { THEMES } from '../types';

interface UploadedSong {
  file: File;
  title: string;
  artist: string;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  peaks: number[];
  albumCover?: string;
}

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<ThemeType>('classic');
  const [songs, setSongs] = useState<UploadedSong[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }

    const newSongs: UploadedSong[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/mpeg') && !file.type.startsWith('audio/mp3')) {
        alert(`文件 ${file.name} 不是MP3格式`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const peakData = await audioEngineRef.current.decodeAudio(arrayBuffer);

        const url = URL.createObjectURL(file);
        const tempAudio = new Audio(url);

        await new Promise<void>((resolve) => {
          tempAudio.onloadedmetadata = () => resolve();
        });

        newSongs.push({
          file,
          title: file.name.replace(/\.mp3$/i, ''),
          artist: '未知艺术家',
          duration: tempAudio.duration || peakData.duration,
          fadeIn: 1,
          fadeOut: 1,
          peaks: peakData.peaks,
          albumCover: `https://picsum.photos/300/300?random=${Date.now() + i}`
        });

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    if (songs.length + newSongs.length > 10) {
      alert('最多只能添加10首歌曲');
      newSongs.splice(10 - songs.length);
    }

    setSongs(prev => [...prev, ...newSongs]);
  }, [songs.length]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSongs = [...songs];
    const [removed] = newSongs.splice(draggedIndex, 1);
    newSongs.splice(index, 0, removed);
    setSongs(newSongs);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRemoveSong = (index: number) => {
    setSongs(prev => prev.filter((_, i) => i !== index));
  };

  const handleFadeChange = (index: number, type: 'fadeIn' | 'fadeOut', value: number) => {
    setSongs(prev => prev.map((song, i) =>
      i === index ? { ...song, [type]: value } : song
    ));
  };

  const renderFadeCurve = (song: UploadedSong, width: number, height: number) => {
    const points: string[] = [];
    const totalSamples = song.peaks.length;
    const fadeInSamples = (song.fadeIn / song.duration) * totalSamples;
    const fadeOutSamples = (song.fadeOut / song.duration) * totalSamples;

    for (let i = 0; i < width; i++) {
      const sampleIndex = Math.floor((i / width) * totalSamples);
      let gain = 1;

      if (sampleIndex < fadeInSamples) {
        gain = sampleIndex / fadeInSamples;
        gain = gain < 0.5 ? 2 * gain * gain : 1 - Math.pow(-2 * gain + 2, 2) / 2;
      } else if (sampleIndex > totalSamples - fadeOutSamples) {
        gain = (totalSamples - sampleIndex) / fadeOutSamples;
        gain = gain < 0.5 ? 2 * gain * gain : 1 - Math.pow(-2 * gain + 2, 2) / 2;
      }

      const peakHeight = song.peaks[sampleIndex] * gain * (height * 0.8);
      const x = i;
      const y = (height - peakHeight) / 2;
      points.push(`${x},${y} ${x},${y + peakHeight}`);
    }

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`fadeGrad-${song.title}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3498DB" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {points.map((p, i) => (
          <line
            key={i}
            x1={p.split(' ')[0].split(',')[0]}
            y1={p.split(' ')[0].split(',')[1]}
            x2={p.split(' ')[1].split(',')[0]}
            y2={p.split(' ')[1].split(',')[1]}
            stroke={`url(#fadeGrad-${song.title})`}
            strokeWidth="1"
          />
        ))}
      </svg>
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入混音带标题');
      return;
    }
    if (songs.length < 5) {
      alert('至少需要5首歌曲');
      return;
    }
    if (songs.length > 10) {
      alert('最多只能有10首歌曲');
      return;
    }

    setIsSubmitting(true);

    try {
      const songData: Omit<Song, 'id'>[] = songs.map(song => ({
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        fadeIn: song.fadeIn,
        fadeOut: song.fadeOut,
        url: song.file.name,
        albumCover: song.albumCover
      }));

      const response = await fetch('/api/mixtapes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          theme,
          songs: songData
        })
      });

      if (response.ok) {
        const newMixtape = await response.json();
        alert('混音带创建成功！');
        navigate(`/play/${newMixtape.id}`);
      } else {
        const error = await response.json();
        alert(error.error || '创建失败');
      }
    } catch (error) {
      console.error('Failed to create mixtape:', error);
      alert('创建失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(15, 15, 15, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{ fontSize: '14px', color: 'var(--text-secondary)' }}
          >
            ← 返回广场
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>创建混音带</h1>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || songs.length < 5 || !title.trim()}
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              borderRadius: 'var(--border-radius)',
              fontSize: '14px',
              fontWeight: 500,
              opacity: (isSubmitting || songs.length < 5 || !title.trim()) ? 0.5 : 1,
              cursor: (isSubmitting || songs.length < 5 || !title.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? '创建中...' : '生成混音带'}
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>基本信息</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              混音带标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的混音带起个名字"
              maxLength={50}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px',
                transition: 'all var(--transition-fast)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍一下这个混音带..."
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px',
                resize: 'none',
                transition: 'all var(--transition-fast)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              {description.length}/200
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '12px'
            }}>
              选择主题
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(Object.keys(THEMES) as ThemeType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 'var(--border-radius)',
                    background: theme === t ? THEMES[t].background : 'rgba(255, 255, 255, 0.05)',
                    border: theme === t ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all var(--transition-fast)',
                    minHeight: '80px'
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: t === 'minimal' ? '#333' : '#fff',
                    marginBottom: '4px'
                  }}>
                    {THEMES[t].name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: t === 'minimal' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'
                  }}>
                    {THEMES[t].primary}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius)',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                歌曲列表
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {songs.length}/10 首歌曲（至少5首）
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={songs.length >= 10}
              style={{
                padding: '10px 20px',
                background: 'var(--accent)',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px',
                fontWeight: 500,
                opacity: songs.length >= 10 ? 0.5 : 1,
                cursor: songs.length >= 10 ? 'not-allowed' : 'pointer'
              }}
            >
              + 添加MP3文件
            </button>
          </div>

          {songs.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--border-radius)',
                padding: '60px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎵</div>
              <p style={{ fontSize: '16px', marginBottom: '4px' }}>点击或拖拽上传MP3文件</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                支持批量上传，5-10首歌曲
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {songs.map((song, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'move',
                    opacity: draggedIndex === index ? 0.5 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{
                    width: '24px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    flexShrink: 0
                  }}>
                    ⋮⋮ {index + 1}
                  </div>
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={song.title}
                      onChange={(e) => {
                        setSongs(prev => prev.map((s, i) =>
                          i === index ? { ...s, title: e.target.value } : s
                        ));
                      }}
                      style={{
                        width: '100%',
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '4px',
                        background: 'transparent',
                        borderBottom: '1px solid transparent',
                        padding: '2px 0'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderBottomColor = 'var(--accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderBottomColor = 'transparent';
                      }}
                    />
                    <input
                      type="text"
                      value={song.artist}
                      onChange={(e) => {
                        setSongs(prev => prev.map((s, i) =>
                          i === index ? { ...s, artist: e.target.value } : s
                        ));
                      }}
                      style={{
                        width: '100%',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        borderBottom: '1px solid transparent',
                        padding: '2px 0'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderBottomColor = 'var(--accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderBottomColor = 'transparent';
                      }}
                    />
                  </div>

                  <div style={{ width: '200px', flexShrink: 0 }}>
                    {renderFadeCurve(song, 200, 40)}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '150px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '30px' }}>
                        淡入
                      </span>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={song.fadeIn}
                        onChange={(e) => handleFadeChange(index, 'fadeIn', parseFloat(e.target.value))}
                        style={{ flex: 1, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '11px', width: '28px', textAlign: 'right' }}>
                        {song.fadeIn.toFixed(1)}s
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '30px' }}>
                        淡出
                      </span>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={song.fadeOut}
                        onChange={(e) => handleFadeChange(index, 'fadeOut', parseFloat(e.target.value))}
                        style={{ flex: 1, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '11px', width: '28px', textAlign: 'right' }}>
                        {song.fadeOut.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSong(index)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 107, 107, 0.2)',
                      color: 'var(--accent)',
                      fontSize: '14px',
                      flexShrink: 0,
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {songs.length > 0 && songs.length < 5 && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(255, 200, 0, 0.1)',
              borderRadius: 'var(--border-radius)',
              fontSize: '13px',
              color: '#F1C40F'
            }}>
              ⚠️ 还需要添加 {5 - songs.length} 首歌曲
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
