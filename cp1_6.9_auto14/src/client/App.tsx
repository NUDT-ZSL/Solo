import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntry, DiaryRequest, EmotionTag, EmotionResponse } from '../shared/types';
import Journal from './Journal';
import Timeline from './Timeline';
import EmotionStats from './EmotionStats';

const EMOTION_TAGS: EmotionTag[] = ['快乐', '兴奋', '平静', '忧伤', '怀念'];

const App: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<EmotionTag[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiaries = useCallback(async () => {
    try {
      const res = await fetch('/api/diaries');
      const data = await res.json();
      setDiaries(data);
    } catch (err) {
      console.error('获取日记列表失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  const toggleTag = (tag: EmotionTag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim() || title.length > 30) {
      setError('请输入1-30字的标题');
      return;
    }
    if (content.length < 100 || content.length > 500) {
      setError('正文长度必须在100-500字之间');
      return;
    }
    if (selectedTags.length < 1 || selectedTags.length > 3) {
      setError('请选择1-3个情感标签');
      return;
    }

    setLoading(true);
    try {
      const requestData: DiaryRequest = {
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
      };

      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '提交失败');
      }

      const result: EmotionResponse = await res.json();

      const newDiary: DiaryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
        date: new Date().toISOString().split('T')[0],
        tendency: result.tendency,
        score: result.score,
        keywords: result.keywords,
        favorite: false,
      };

      setDiaries(prev => [newDiary, ...prev]);
      setCurrentIndex(0);
      setTitle('');
      setContent('');
      setSelectedTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/diary/${id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDiaries(prev =>
          prev.map(d => (d.id === id ? { ...d, favorite: data.favorite } : d))
        );
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>情绪手账·日记工坊</h1>
        <p>用文字记录心情，让时光留下温度</p>
      </header>

      <div className="main-content">
        <section className="input-section">
          {error && <div className="error-message">{error}</div>}

          <div className="input-row">
            <label className="input-label">日记标题</label>
            <input
              type="text"
              className="input-title"
              placeholder="给今天的心情起个名字..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={30}
            />
            <div className="char-count">{title.length}/30</div>
          </div>

          <div className="input-row">
            <label className="input-label">今日心情</label>
            <textarea
              className="input-content"
              placeholder="写下今天的故事、感受和思绪...（100-500字）"
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
            />
            <div
              className={`char-count ${content.length > 500 || (content.length > 0 && content.length < 100) ? 'warning' : ''}`}
            >
              {content.length}/500 字
            </div>
          </div>

          <div className="input-row">
            <label className="input-label">情感标签（选择1-3个）</label>
            <div className="tags-container">
              {EMOTION_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  data-tag={tag}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '正在生成手账...' : '生成我的情绪手账 ✨'}
          </button>
        </section>

        {diaries.length > 0 && (
          <div className="stats-container">
            <EmotionStats diaries={diaries} />
          </div>
        )}

        <section className="timeline-section">
          {diaries.length > 0 ? (
            <Timeline
              diaries={diaries}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              renderJournal={(diary, isActive) => (
                <Journal
                  diary={diary}
                  isActive={isActive}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            />
          ) : (
            <div className="empty-state">
              <h3>还没有日记，开始写下今天的心情吧～</h3>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default App;
