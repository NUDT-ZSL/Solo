import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CapsuleCard,
  CapsuleDetailModal,
  TypewriterContent,
  ImageCarousel,
  AudioSpectrum,
} from './components/TimeCapsule';

export interface CapsuleData {
  id: string;
  shareId: string;
  title: string;
  content: string;
  images: string[];
  audio: string | null | boolean;
  createdAt: number;
  lastAccessedAt: number;
  archived: boolean;
}

export interface CapsuleDetail extends CapsuleData {
  isOwner?: boolean;
  accessCountLeft?: number;
}

type ViewType = 'home' | 'editor';

interface EditorState {
  isEditing: boolean;
  capsuleId?: string;
  prefill?: {
    title: string;
    content: string;
    images: string[];
    audio: string | null;
  };
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('home');
  const [capsules, setCapsules] = useState<CapsuleData[]>([]);
  const [archivedCapsules, setArchivedCapsules] = useState<CapsuleData[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({ isEditing: false });
  const [toast, setToast] = useState<string>('');
  const [searchDate, setSearchDate] = useState('');
  const [searchResults, setSearchResults] = useState<CapsuleData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const hashRef = useRef<string>(window.location.hash);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const fetchCapsules = useCallback(async () => {
    try {
      const res = await fetch('/api/capsules');
      if (res.ok) {
        const data = await res.json();
        setCapsules(data);
      }
      const resArchived = await fetch('/api/capsules?archived=true');
      if (resArchived.ok) {
        const dataArchived = await resArchived.json();
        setArchivedCapsules(dataArchived);
      }
    } catch (err) {
      console.error('获取胶囊列表失败', err);
    }
  }, []);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith('capsule/')) {
      const shareId = hash.replace('capsule/', '');
      openCapsuleByShareId(shareId);
    }
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash !== hashRef.current) {
        hashRef.current = newHash;
        if (newHash && newHash.startsWith('capsule/')) {
          const shareId = newHash.replace('capsule/', '');
          openCapsuleByShareId(shareId);
        } else if (!newHash && showDetail) {
          setShowDetail(false);
          setSelectedCapsule(null);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openCapsuleByShareId = async (shareId: string) => {
    try {
      const res = await fetch(`/api/capsules/${shareId}`);
      if (res.status === 429) {
        const errData = await res.json();
        showToast(errData.error || '访问次数超限');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSelectedCapsule(data);
        setShowDetail(true);
      } else {
        showToast('胶囊不存在或已被删除');
      }
    } catch (err) {
      console.error('获取胶囊详情失败', err);
      showToast('加载失败，请稍后重试');
    }
  };

  const openCapsuleDetail = async (capsule: CapsuleData) => {
    window.location.hash = `capsule/${capsule.shareId}`;
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedCapsule(null);
    window.location.hash = '';
  };

  const handleNewCapsule = () => {
    setEditorState({ isEditing: false });
    setView('editor');
  };

  const handleEditCapsule = async (id: string, password: string) => {
    try {
      const res = await fetch(`/api/capsules/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        return false;
      }
      const capsule = capsules.find((c) => c.id === id) || archivedCapsules.find((c) => c.id === id);
      if (!capsule) return false;
      const detailRes = await fetch(`/api/capsules/${capsule.shareId}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setShowDetail(false);
        setEditorState({
          isEditing: true,
          capsuleId: id,
          prefill: {
            title: detail.title || '',
            content: detail.content || '',
            images: detail.images || [],
            audio: detail.audio || null,
          },
        });
        setView('editor');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteCapsule = async (id: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/capsules/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        showToast('胶囊已删除');
        handleCloseDetail();
        fetchCapsules();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRestoreCapsule = async (id: string) => {
    try {
      const res = await fetch(`/api/capsules/${id}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('胶囊已恢复，时间戳已重置');
        fetchCapsules();
      }
    } catch (err) {
      console.error('恢复失败', err);
    }
  };

  const handleSearchByDate = async () => {
    if (!searchDate) return;
    try {
      const res = await fetch(`/api/capsules/search?date=${encodeURIComponent(searchDate)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setHasSearched(true);
        if (data.length === 0) {
          showToast('该日期未找到胶囊');
        }
      }
    } catch (err) {
      console.error('搜索失败', err);
    }
  };

  const handleEditorSave = async (data: {
    title: string;
    content: string;
    images: string[];
    audio: string | null;
    password: string;
  }) => {
    try {
      if (editorState.isEditing && editorState.capsuleId) {
        const res = await fetch(`/api/capsules/${editorState.capsuleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data }),
        });
        if (res.ok) {
          showToast('胶囊已更新封存');
          setView('home');
          fetchCapsules();
        } else {
          const err = await res.json();
          showToast(err.error || '保存失败');
        }
      } else {
        const res = await fetch('/api/capsules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data }),
        });
        if (res.ok) {
          const result = await res.json();
          showToast(`胶囊已封存！分享ID：${result.shareId}`);
          setView('home');
          fetchCapsules();
        } else {
          const err = await res.json();
          showToast(err.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存失败', err);
      showToast('网络错误，保存失败');
    }
  };

  return (
    <div className="app-container">
      {view === 'home' && (
        <>
          <header className="header">
            <div className="logo">
              <span className="logo-icon">⏳</span>
              <span>时间胶囊</span>
            </div>
            <button className="new-capsule-btn" onClick={handleNewCapsule}>
              <span>＋</span> 新建胶囊
            </button>
          </header>

          <section>
            <h2 className="section-title">我的时间线</h2>
            {capsules.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">还没有胶囊</div>
                <div className="empty-state-desc">点击「新建胶囊」，封存此刻的思绪与记忆</div>
              </div>
            ) : (
              <div className="capsule-grid">
                {capsules.map((capsule) => (
                  <CapsuleCard
                    key={capsule.id}
                    capsule={capsule}
                    onClick={() => openCapsuleDetail(capsule)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="archive-section">
            <h2 className="archive-section-title">🗄️ 归档区 · 按日期检索恢复</h2>
            <div className="search-box">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                placeholder="选择日期"
              />
              <button className="btn-secondary" onClick={handleSearchByDate}>
                🔍 搜索该日期
              </button>
            </div>
            {hasSearched && searchResults.length > 0 && (
              <div className="capsule-grid">
                {searchResults.map((capsule) => (
                  <div key={capsule.id} style={{ position: 'relative' }}>
                    <CapsuleCard
                      capsule={capsule}
                      onClick={() => openCapsuleDetail(capsule)}
                    />
                    <button
                      className="btn-secondary"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        zIndex: 3,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreCapsule(capsule.id);
                      }}
                    >
                      ↺ 恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
            {archivedCapsules.length > 0 && !hasSearched && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                当前共有 {archivedCapsules.length} 个胶囊已自动归档（超过30天未访问）。
                使用上方日期搜索可找到并恢复它们。
              </p>
            )}
          </section>
        </>
      )}

      {view === 'editor' && (
        <CapsuleEditor
          editorState={editorState}
          onCancel={() => setView('home')}
          onSave={handleEditorSave}
        />
      )}

      {showDetail && selectedCapsule && (
        <CapsuleDetailModal
          capsule={selectedCapsule}
          onClose={handleCloseDetail}
          onEdit={handleEditCapsule}
          onDelete={handleDeleteCapsule}
          showToast={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

interface CapsuleEditorProps {
  editorState: EditorState;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    content: string;
    images: string[];
    audio: string | null;
    password: string;
  }) => void;
}

const CapsuleEditor: React.FC<CapsuleEditorProps> = ({ editorState, onCancel, onSave }) => {
  const [title, setTitle] = useState(editorState.prefill?.title || '');
  const [content, setContent] = useState(editorState.prefill?.content || '');
  const [images, setImages] = useState<string[]>(editorState.prefill?.images || []);
  const [audio, setAudio] = useState<string | null>(editorState.prefill?.audio || null);
  const [password, setPassword] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = contentRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragover');
  };

  const processImageFile = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImages((prev) => {
        if (prev.length >= 5) return prev;
        return [...prev, dataUrl];
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => processImageFile(file));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => processImageFile(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          setAudio(e.target?.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      const startTs = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTs) / 1000);
        setRecordTime(elapsed);
        if (elapsed >= 30) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error('录音失败', err);
      alert('无法访问麦克风，请检查浏览器权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRemoveAudio = () => {
    setAudio(null);
  };

  const handleSave = () => {
    if (!/^\d{6}$/.test(password)) {
      alert('请设置6位数字密码');
      return;
    }
    onSave({ title, content, images, audio, password });
  };

  return (
    <div className="editor-page">
      <header className="editor-header">
        <button className="editor-back" onClick={onCancel}>
          ← 返回
        </button>
        <div className="editor-actions">
          <input
            type="text"
            className="password-input"
            placeholder="6位数字密码"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <button className="btn-primary" onClick={handleSave}>
            {editorState.isEditing ? '重新封存' : '封存胶囊'}
          </button>
        </div>
      </header>
      <div className="editor-content">
        <div className="editor-layout">
          <div className="editor-section">
            <div className="editor-section-title">📝 文字区域</div>
            <div className="text-input-area">
              <input
                type="text"
                className="title-input"
                placeholder="给胶囊起个标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                ref={contentRef}
                className="content-textarea"
                placeholder="记录此刻的思绪...支持Markdown语法"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="markdown-hint">文字区域 · 支持Markdown · 高度随内容扩展</div>
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-section-title">🖼️ 图片区域 ({images.length}/5)</div>
            <div
              className="image-upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="image-upload-icon">📷</div>
              <div className="image-upload-text">点击或拖拽上传图片</div>
              <div className="image-upload-hint">支持 JPG / PNG · 单张不超过5MB · 最多5张</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <div className="image-grid">
              {images.map((img, i) => (
                <div key={i} className="image-item">
                  <img src={img} alt={`upload-${i}`} />
                  <button className="image-remove" onClick={() => handleRemoveImage(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-section-title">🎙️ 录音区域</div>
            <div className="recording-area">
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
              >
                {isRecording ? '⏹' : '🎙'}
              </button>
              <div className="record-timer">
                {String(Math.floor(recordTime / 60)).padStart(2, '0')}:
                {String(recordTime % 60).padStart(2, '0')}
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}> / 00:30</span>
              </div>
              <div className="record-status">
                {isRecording ? '🔴 正在录音...最长30秒' : audio ? '录音完成，可重新录制' : '点击按钮开始录音'}
              </div>
              {audio && (
                <>
                  <div className="audio-preview">
                    <audio controls src={audio} />
                  </div>
                  <button className="remove-audio-btn" onClick={handleRemoveAudio}>
                    🗑️ 删除录音
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { TypewriterContent, ImageCarousel, AudioSpectrum };
export default App;
