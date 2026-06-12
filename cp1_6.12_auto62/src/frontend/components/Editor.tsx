import React from 'react';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface QuizData {
  id: string;
  videoId: string;
  timePoint: number;
  question: string;
  options: string[];
  correctIndex: number;
  subtitleText: string;
}

interface QuizStat {
  quizId: string;
  question: string;
  totalAnswers: number;
  correctCount: number;
  correctRate: number;
}

interface EditorProps {
  onOpenPlayer: (videoId: string) => void;
  currentVideoId: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Editor({ onOpenPlayer, currentVideoId: initialVideoId }: EditorProps) {
  const [videoId, setVideoId] = React.useState<string | null>(initialVideoId);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [subtitles, setSubtitles] = React.useState<Subtitle[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = React.useState<number | null>(null);
  const [quizzes, setQuizzes] = React.useState<QuizData[]>([]);
  const [editingSubId, setEditingSubId] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState('');
  const [showQuizModal, setShowQuizModal] = React.useState(false);
  const [generatingQuiz, setGeneratingQuiz] = React.useState(false);
  const [currentQuiz, setCurrentQuiz] = React.useState<QuizData | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [stats, setStats] = React.useState<QuizStat[]>([]);
  const [subtitleCollapsed, setSubtitleCollapsed] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSubtitles = React.useCallback(async (vid: string) => {
    try {
      const res = await fetch(`/api/videos/${vid}/subtitles`);
      const data = await res.json();
      setSubtitles(data);
    } catch {
      showToast('加载字幕失败', 'error');
    }
  }, []);

  const loadQuizzes = React.useCallback(async (vid: string) => {
    try {
      const res = await fetch(`/api/videos/${vid}/quizzes`);
      const data = await res.json();
      setQuizzes(data);
    } catch {
      showToast('加载题目失败', 'error');
    }
  }, []);

  React.useEffect(() => {
    if (videoId) {
      loadSubtitles(videoId);
      loadQuizzes(videoId);
    }
  }, [videoId, loadSubtitles, loadQuizzes]);

  React.useEffect(() => {
    const handleResize = () => {
      setSubtitleCollapsed(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      showToast('文件大小不能超过200MB', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/videos/upload', { method: 'POST', body: formData });
      const data = await res.json();

      setVideoId(data.id);
      setSubtitles(data.subtitles);
      setQuizzes([]);
      setVideoUrl(URL.createObjectURL(file));
      showToast('视频上传成功，字幕已自动生成', 'success');
    } catch {
      showToast('上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubtitleClick = (index: number) => {
    setSelectedSubIndex(index);
    const sub = subtitles[index];
    if (videoRef.current) {
      videoRef.current.currentTime = sub.startTime;
    }
  };

  const handleStartEditSubtitle = (sub: Subtitle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubId(sub.id);
    setEditText(sub.text);
  };

  const handleSaveSubtitle = async (subId: number) => {
    try {
      await fetch(`/api/subtitles/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });
      setSubtitles(prev => prev.map(s => s.id === subId ? { ...s, text: editText } : s));
      setEditingSubId(null);
      showToast('字幕已更新', 'success');
    } catch {
      showToast('更新失败', 'error');
    }
  };

  const handleGenerateQuiz = async () => {
    if (selectedSubIndex === null) return;
    const sub = subtitles[selectedSubIndex];
    setGeneratingQuiz(true);

    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          subtitleText: sub.text,
          timePoint: sub.startTime,
        }),
      });
      const data = await res.json();
      setCurrentQuiz(data);
      setShowQuizModal(true);
    } catch {
      showToast('题目生成失败', 'error');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSaveQuiz = () => {
    if (currentQuiz) {
      setQuizzes(prev => [...prev, currentQuiz]);
      setShowQuizModal(false);
      setCurrentQuiz(null);
      showToast('题目已保存', 'success');
    }
  };

  const handleQuizFieldChange = (field: 'question' | 'options', value: string | string[], optIndex?: number) => {
    if (!currentQuiz) return;
    if (field === 'question') {
      setCurrentQuiz({ ...currentQuiz, question: value as string });
    } else if (field === 'options' && optIndex !== undefined) {
      const newOptions = [...currentQuiz.options];
      newOptions[optIndex] = value as string;
      setCurrentQuiz({ ...currentQuiz, options: newOptions });
    }
  };

  const handleLoadStats = async () => {
    if (!videoId) return;
    try {
      const res = await fetch(`/api/videos/${videoId}/stats`);
      const data = await res.json();
      setStats(data);
      setShowStats(true);
    } catch {
      showToast('加载统计失败', 'error');
    }
  };

  const renderSubtitlePanel = () => (
    <div className={`subtitle-panel ${subtitleCollapsed ? 'subtitle-panel-bottom' : ''}`}>
      <div className="panel-header">
        <h3>字幕列表</h3>
        <span className="subtitle-count">{subtitles.length} 条</span>
      </div>
      <div className="subtitle-list">
        {subtitles.map((sub, index) => (
          <div
            key={sub.id}
            className={`subtitle-item ${selectedSubIndex === index ? 'selected' : ''}`}
            onClick={() => handleSubtitleClick(index)}
          >
            <div className="subtitle-time">
              <span>{formatTime(sub.startTime)}</span>
              <span className="time-sep">→</span>
              <span>{formatTime(sub.endTime)}</span>
            </div>
            {editingSubId === sub.id ? (
              <div className="subtitle-edit-row">
                <input
                  className="input subtitle-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleSaveSubtitle(sub.id); }}>保存</button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditingSubId(null); }}>取消</button>
              </div>
            ) : (
              <div className="subtitle-text-row">
                <span className="subtitle-text">{sub.text}</span>
                <button className="edit-btn" onClick={(e) => handleStartEditSubtitle(sub, e)}>✎</button>
              </div>
            )}
            {quizzes.some(q => q.timePoint === sub.startTime) && (
              <div className="quiz-badge">📌 已有题目</div>
            )}
          </div>
        ))}
      </div>
      {selectedSubIndex !== null && (
        <div className="subtitle-actions">
          <button
            className="btn btn-primary"
            onClick={handleGenerateQuiz}
            disabled={generatingQuiz}
          >
            {generatingQuiz ? '生成中...' : '🎯 生成题目'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="editor-page">
      <style>{`
        .editor-page {
          display: flex;
          height: calc(100vh - 56px);
          overflow: hidden;
        }

        .subtitle-panel {
          width: 360px;
          min-width: 360px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .subtitle-panel-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          min-width: unset;
          max-height: 45vh;
          border-right: none;
          border-top: 1px solid var(--border-color);
          z-index: 100;
        }

        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h3 { font-size: 16px; font-weight: 600; }

        .subtitle-count {
          font-size: 12px;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.06);
          padding: 2px 10px;
          border-radius: 12px;
        }

        .subtitle-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .subtitle-item {
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 4px;
        }

        .subtitle-item:hover { background: rgba(255,255,255,0.04); }
        .subtitle-item.selected { background: rgba(59,130,246,0.15); border-left: 3px solid var(--accent-blue); }

        .subtitle-time {
          font-size: 12px;
          color: var(--accent-blue);
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .time-sep { color: var(--text-secondary); font-size: 10px; }

        .subtitle-text-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .subtitle-text {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-primary);
          flex: 1;
        }

        .edit-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .edit-btn:hover { color: var(--accent-blue); background: rgba(59,130,246,0.1); }

        .subtitle-edit-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .subtitle-input { flex: 1; font-size: 13px; }

        .btn-sm { padding: 4px 10px; font-size: 12px; }

        .quiz-badge {
          margin-top: 4px;
          font-size: 11px;
          color: var(--accent-blue);
        }

        .subtitle-actions {
          padding: 12px 16px;
          border-top: 1px solid var(--border-color);
        }

        .editor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 24px;
        }

        .upload-area {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius);
          padding: 60px 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255,255,255,0.02);
        }

        .upload-area:hover { border-color: var(--accent-blue); background: rgba(59,130,246,0.04); }
        .upload-area.dragging { border-color: var(--accent-blue); background: rgba(59,130,246,0.08); }

        .upload-icon { font-size: 48px; margin-bottom: 16px; }
        .upload-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
        .upload-hint { font-size: 14px; color: var(--text-secondary); }

        .video-section {
          margin-top: 20px;
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          aspect-ratio: 16/9;
          background: #000;
          border-radius: var(--radius);
          overflow: hidden;
        }

        .video-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .video-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .quiz-list-section {
          margin-top: 28px;
        }

        .quiz-list-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .quiz-card {
          background: var(--bg-card);
          border-radius: var(--radius);
          padding: 16px 20px;
          margin-bottom: 10px;
          box-shadow: var(--shadow);
        }

        .quiz-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .quiz-card-time {
          font-size: 12px;
          color: var(--accent-blue);
          font-weight: 600;
          background: rgba(59,130,246,0.1);
          padding: 2px 10px;
          border-radius: 12px;
        }

        .quiz-card-question {
          font-size: 14px;
          color: var(--text-dark);
          font-weight: 500;
          margin-bottom: 8px;
        }

        .quiz-card-options {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quiz-option-preview {
          font-size: 13px;
          color: #475569;
          padding: 4px 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 28px 32px;
          width: 560px;
          max-width: 95vw;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 8px 40px rgba(0,0,0,0.4);
          animation: modalSlide 0.25s ease;
        }

        @keyframes modalSlide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal h2 {
          font-size: 18px;
          color: var(--text-dark);
          margin-bottom: 20px;
        }

        .modal label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          display: block;
          margin-bottom: 6px;
        }

        .modal .input, .modal textarea {
          width: 100%;
          margin-bottom: 14px;
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: var(--text-dark);
        }

        .modal textarea {
          min-height: 60px;
          resize: vertical;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .stats-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .stats-table th, .stats-table td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }

        .stats-table th {
          background: #f8fafc;
          color: var(--text-dark);
          font-weight: 600;
        }

        .stats-table td { color: #475569; }

        .correct-rate {
          font-weight: 600;
        }

        .correct-rate.high { color: var(--accent-green); }
        .correct-rate.medium { color: #f59e0b; }
        .correct-rate.low { color: var(--accent-red); }

        @media (max-width: 768px) {
          .editor-page { flex-direction: column; }
          .editor-main { padding: 16px; }
          .subtitle-panel { display: none; }
          .subtitle-panel-bottom { display: flex; }
        }
      `}</style>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {renderSubtitlePanel()}

      <div className="editor-main">
        {!videoId ? (
          <div
            className={`upload-area ${uploading ? 'dragging' : ''}`}
            onClick={() => document.getElementById('video-upload')?.click()}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) {
                const input = document.getElementById('video-upload') as HTMLInputElement;
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change'));
              }
            }}
          >
            <input id="video-upload" type="file" accept=".mp4" onChange={handleUpload} style={{ display: 'none' }} />
            <div className="upload-icon">🎬</div>
            <div className="upload-title">
              {uploading ? '正在上传并解析字幕...' : '上传视频课件'}
            </div>
            <div className="upload-hint">支持 MP4 格式，最大 200MB</div>
          </div>
        ) : (
          <div className="video-section">
            <div className="video-container">
              <video ref={videoRef} controls src={videoUrl || undefined}>
                您的浏览器不支持视频播放
              </video>
            </div>
            <div className="video-toolbar">
              <button className="btn btn-primary" onClick={() => onOpenPlayer(videoId)}>
                ▶ 打开学生播放模式
              </button>
              <button className="btn btn-secondary" onClick={handleLoadStats}>
                📊 查看答题统计
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setVideoId(null);
                setVideoUrl(null);
                setSubtitles([]);
                setQuizzes([]);
              }}>
                🔄 重新上传
              </button>
            </div>

            {quizzes.length > 0 && (
              <div className="quiz-list-section">
                <h3>已创建的题目 ({quizzes.length})</h3>
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="quiz-card">
                    <div className="quiz-card-header">
                      <span className="quiz-card-time">⏱ {formatTime(quiz.timePoint)}</span>
                    </div>
                    <div className="quiz-card-question">{quiz.question}</div>
                    <div className="quiz-card-options">
                      {quiz.options.map((opt, i) => (
                        <div key={i} className="quiz-option-preview" style={{ color: i === quiz.correctIndex ? '#22c55e' : '#475569', fontWeight: i === quiz.correctIndex ? 600 : 400 }}>
                          {String.fromCharCode(65 + i)}. {opt} {i === quiz.correctIndex && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showQuizModal && currentQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>编辑题目</h2>
            <label>题目文本</label>
            <textarea
              value={currentQuiz.question}
              onChange={e => handleQuizFieldChange('question', e.target.value)}
            />
            <label>选项</label>
            {currentQuiz.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: i === currentQuiz.correctIndex ? '#22c55e' : '#94a3b8', width: '24px' }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  className="input"
                  style={{ flex: 1, background: '#f1f5f9', borderColor: '#e2e8f0', color: '#1a2332' }}
                  value={opt}
                  onChange={e => handleQuizFieldChange('options', e.target.value, i)}
                />
                {i === currentQuiz.correctIndex && <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>正确</span>}
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowQuizModal(false)}>取消</button>
              <button className="btn btn-success" onClick={handleSaveQuiz}>确认保存</button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>答题统计汇总</h2>
            {stats.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>暂无答题数据</p>
            ) : (
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>题目</th>
                    <th>答题人数</th>
                    <th>正确人数</th>
                    <th>正确率</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => {
                    const ratePercent = Math.round(s.correctRate * 100);
                    const rateClass = ratePercent >= 70 ? 'high' : ratePercent >= 40 ? 'medium' : 'low';
                    return (
                      <tr key={s.quizId}>
                        <td>{s.question.substring(0, 30)}...</td>
                        <td>{s.totalAnswers}</td>
                        <td>{s.correctCount}</td>
                        <td><span className={`correct-rate ${rateClass}`}>{ratePercent}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowStats(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
