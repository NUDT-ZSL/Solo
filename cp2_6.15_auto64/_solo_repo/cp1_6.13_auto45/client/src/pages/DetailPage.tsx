import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Waveform from '../components/Waveform';
import { Podcast, podcastApi } from '../utils/api';
import './DetailPage.css';

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (id) {
      loadPodcast();
    }
  }, [id]);

  const loadPodcast = async () => {
    try {
      setLoading(true);
      const data = await podcastApi.getById(id!);
      setPodcast(data);
    } catch (err) {
      console.error('Failed to load podcast:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bitrate: number, duration: number) => {
    const bytes = (bitrate / 8) * duration;
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleAddTag = async () => {
    if (!tagInput.trim() || !podcast) return;
    
    const newTags = [...podcast.tags, tagInput.trim()];
    try {
      const updated = await podcastApi.updateTags(podcast._id, newTags);
      setPodcast(updated);
      setTagInput('');
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!podcast) return;
    
    const newTags = podcast.tags.filter(t => t !== tagToRemove);
    try {
      const updated = await podcastApi.updateTags(podcast._id, newTags);
      setPodcast(updated);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <header className="app-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← 返回</button>
          <h1 className="page-title">加载中...</h1>
        </header>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="detail-page">
        <header className="app-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← 返回</button>
          <h1 className="page-title">未找到该播客</h1>
        </header>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <header className="app-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="page-title">{podcast.title}</h1>
        <div className="header-spacer"></div>
      </header>

      <main className="detail-content">
        <aside className="detail-sidebar">
          <div className="sidebar-section">
            <h3>专辑信息</h3>
            <div className="album-cover-large">
              <div className="cover-placeholder-large">
                <svg className="cover-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <h2 className="album-title-large">{podcast.title}</h2>
            <p className="album-date-large">上传于 {formatDate(podcast.createdAt)}</p>
          </div>

          <div className="sidebar-section">
            <h3>元数据</h3>
            <table className="metadata-table">
              <tbody>
                <tr>
                  <td>时长</td>
                  <td>{formatDuration(podcast.duration)}</td>
                </tr>
                <tr>
                  <td>采样率</td>
                  <td>{(podcast.sampleRate / 1000).toFixed(1)} kHz</td>
                </tr>
                <tr>
                  <td>声道</td>
                  <td>{podcast.channels === 1 ? '单声道' : '立体声'}</td>
                </tr>
                <tr>
                  <td>比特率</td>
                  <td>{(podcast.bitrate / 1000).toFixed(0)} kbps</td>
                </tr>
                <tr>
                  <td>编码格式</td>
                  <td>{podcast.codec.toUpperCase()}</td>
                </tr>
                <tr>
                  <td>文件大小</td>
                  <td>{formatFileSize(podcast.bitrate, podcast.duration)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="sidebar-section">
            <div className="tags-header">
              <h3>标签</h3>
              <button 
                className="edit-tags-btn"
                onClick={() => setIsEditingTags(!isEditingTags)}
              >
                {isEditingTags ? '完成' : '编辑'}
              </button>
            </div>
            <div className="tags-list">
              {podcast.tags.map((tag, index) => (
                <span key={index} className="tag-large">
                  {tag}
                  {isEditingTags && (
                    <button 
                      className="remove-tag-btn"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isEditingTags && (
              <div className="add-tag-input">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="输入新标签..."
                />
                <button onClick={handleAddTag}>添加</button>
              </div>
            )}
          </div>
        </aside>

        <section className="detail-main">
          <div className="player-section">
            <h3>波形预览</h3>
            <Waveform
              waveformData={podcast.waveform || []}
              duration={podcast.duration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              onPlayPause={handlePlayPause}
            />
          </div>

          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src={`/uploads/${podcast.filename}`} />
          </audio>
        </section>
      </main>
    </div>
  );
};

export default DetailPage;
