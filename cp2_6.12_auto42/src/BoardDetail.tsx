import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface User {
  id: string;
  username: string;
}

interface ImageItem {
  id: string;
  boardId: string;
  imageUrl: string;
  tags: string[];
  note: string;
  likes: number;
  mood: string | null;
  createdAt: number;
}

interface Board {
  id: string;
  name: string;
  coverImage: string;
}

interface Stats {
  totalImages: number;
  totalLikes: number;
}

function BoardDetail({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalImages: 0, totalLikes: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNote, setNewNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [parsedTags, setParsedTags] = useState<string[]>([]);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [fadingInIds, setFadingInIds] = useState<Set<string>>(new Set());
  const [newImageId, setNewImageId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${user.id}`);
      const boards = await res.json();
      const found = boards.find((b: Board) => b.id === boardId);
      if (found) setBoard(found);
    } catch {}
  }, [user.id, boardId]);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/images`);
      const data = await res.json();
      setImages(data);
    } catch {}
  }, [boardId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/stats`);
      const data = await res.json();
      setStats(data);
    } catch {}
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
    fetchImages();
    fetchStats();
  }, [fetchBoard, fetchImages, fetchStats]);

  const allTags = Array.from(new Set(images.flatMap(img => img.tags)));

  const filteredImages = selectedTags.length === 0
    ? images
    : images.filter(img => selectedTags.every(tag => img.tags.includes(tag)));

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];

      const currentFiltered = new Set(
        (next.length === 0 ? images : images.filter(img => next.every(t => img.tags.includes(t)))).map(i => i.id)
      );
      const prevFiltered = new Set(
        (prev.length === 0 ? images : images.filter(img => prev.every(t => img.tags.includes(t)))).map(i => i.id)
      );

      const fadingOut = new Set<string>();
      const fadingIn = new Set<string>();
      prevFiltered.forEach(id => { if (!currentFiltered.has(id)) fadingOut.add(id); });
      currentFiltered.forEach(id => { if (!prevFiltered.has(id)) fadingIn.add(id); });

      setFadingOutIds(fadingOut);
      setFadingInIds(fadingIn);

      setTimeout(() => {
        setFadingOutIds(new Set());
        setFadingInIds(new Set());
      }, 300);

      return next;
    });
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.endsWith(',')) {
      const tag = value.slice(0, -1).trim();
      if (tag && !parsedTags.includes(tag)) {
        setParsedTags(prev => [...prev, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveParsedTag = (tag: string) => {
    setParsedTags(prev => prev.filter(t => t !== tag));
  };

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return;
    const tags = [...parsedTags];
    if (tagInput.trim()) {
      tagInput.split(',').forEach(t => {
        const trimmed = t.trim();
        if (trimmed && !tags.includes(trimmed)) tags.push(trimmed);
      });
    }
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          imageUrl: newImageUrl.trim(),
          tags,
          note: newNote.slice(0, 200),
        }),
      });
      const newImg = await res.json();
      setImages(prev => [newImg, ...prev]);
      setNewImageId(newImg.id);
      setTimeout(() => setNewImageId(null), 350);
      setShowAdd(false);
      setNewImageUrl('');
      setNewTags('');
      setNewNote('');
      setTagInput('');
      setParsedTags([]);
      fetchStats();
    } catch {}
  };

  const handleMoodClick = async (imageId: string, currentMood: string | null) => {
    const newMood = currentMood ? null : 'happy';
    setPulseId(imageId);
    setTimeout(() => setPulseId(null), 300);
    try {
      await fetch(`/api/images/${imageId}/mood`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: newMood }),
      });
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, mood: newMood } : img
      ));
      fetchStats();
    } catch {}
  };

  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  };

  if (!board) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>加载中...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={bannerStyle}>
        <img src={board.coverImage} alt={board.name} style={bannerImgStyle} />
        <div style={bannerOverlayStyle} />
        <div style={bannerContentStyle}>
          <button onClick={() => navigate('/boards')} style={backBtnStyle}>
            ← 返回看板列表
          </button>
          <h1 style={bannerTitleStyle}>{board.name}</h1>
          <div style={statsRowStyle}>
            <span style={statItemStyle}>📷 {stats.totalImages} 张图片</span>
            <span style={statItemStyle}>😊 {stats.totalLikes} 次心情</span>
          </div>
        </div>
      </div>

      <div style={toolbarStyle}>
        <div style={tagsRowStyle}>
          {allTags.map(tag => (
            <span
              key={tag}
              className={`tag-filter${selectedTags.includes(tag) ? ' tag-filter--active' : ''}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </span>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} style={addInspirationBtnStyle}>
          + 添加灵感
        </button>
      </div>

      <div style={waterfallStyle}>
        {filteredImages.map(img => {
          const isFadingOut = fadingOutIds.has(img.id);
          const isFadingIn = fadingInIds.has(img.id);
          const isNew = newImageId === img.id;
          const isLoaded = loadedImages.has(img.id);

          let animClass = '';
          if (isFadingOut) animClass = 'fade-out';
          else if (isFadingIn) animClass = 'fade-in';
          else if (isNew) animClass = 'elastic-in';

          return (
            <div
              key={img.id}
              className={animClass}
              style={imageCardStyle}
            >
              <div style={{ ...imageWrapperStyle, minHeight: isLoaded ? 'auto' : '200px' }}>
                {!isLoaded && (
                  <div className="skeleton" style={skeletonStyle} />
                )}
                <img
                  src={img.imageUrl}
                  alt={img.note || '灵感图片'}
                  style={{
                    ...imageStyle,
                    display: isLoaded ? 'block' : 'none',
                  }}
                  onClick={() => setPreviewImage(img.imageUrl)}
                  onLoad={() => handleImageLoad(img.id)}
                />
              </div>
              <div style={imageInfoStyle}>
                <div style={tagsLineStyle}>
                  {img.tags.map(tag => (
                    <span key={tag} style={tagStyle}>{tag}</span>
                  ))}
                </div>
                {img.note && (
                  <p style={noteStyle}>
                    {img.note.length > 20 ? img.note.slice(0, 20) + '...' : img.note}
                  </p>
                )}
              </div>
              <button
                className={pulseId === img.id ? 'pulse-animation' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoodClick(img.id, img.mood);
                }}
                style={moodBtnStyle}
              >
                {img.mood ? '😊' : '🙂'}
              </button>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div style={modalOverlayStyle} onClick={() => setShowAdd(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitleStyle}>添加灵感</h3>

            <div style={formGroupStyle}>
              <label style={labelStyle}>图片 URL</label>
              <input
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>标签（用逗号分隔）</label>
              <div style={tagInputContainerStyle}>
                {parsedTags.map(tag => (
                  <span key={tag} style={parsedTagStyle}>
                    {tag}
                    <span
                      style={tagRemoveStyle}
                      onClick={() => handleRemoveParsedTag(tag)}
                    >
                      ×
                    </span>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => handleTagInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      const tag = tagInput.trim();
                      if (!parsedTags.includes(tag)) {
                        setParsedTags(prev => [...prev, tag]);
                      }
                      setTagInput('');
                    }
                  }}
                  placeholder="输入标签，逗号分隔"
                  style={tagInputStyle}
                />
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>备注（最多200字）</label>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value.slice(0, 200))}
                placeholder="写下你的灵感备注..."
                rows={3}
                style={textareaStyle}
              />
              <span style={charCountStyle}>{newNote.length}/200</span>
            </div>

            <div style={modalBtnsStyle}>
              <button onClick={() => setShowAdd(false)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleAddImage} style={confirmBtnStyle}>添加</button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div style={modalOverlayStyle} onClick={() => setPreviewImage(null)}>
          <div style={previewModalStyle} onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="预览" style={previewImgStyle} />
            <button onClick={() => setPreviewImage(null)} style={closePreviewBtnStyle}>✕</button>
          </div>
        </div>
      )}

      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={logoSmallStyle}>🏠</span>
          <span style={brandStyle}>灵感墙</span>
        </div>
        <div style={headerRightStyle}>
          <span style={userStyle}>{user.username}</span>
          <button onClick={onLogout} style={logoutBtnStyle}>退出</button>
        </div>
      </header>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F0F4F8',
};

const bannerStyle: React.CSSProperties = {
  width: '100%',
  height: '280px',
  position: 'relative',
  overflow: 'hidden',
};

const bannerImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const bannerOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))',
};

const bannerContentStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '32px',
  left: '48px',
  right: '48px',
  zIndex: 1,
};

const backBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
  marginBottom: '12px',
  backdropFilter: 'blur(4px)',
};

const bannerTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#fff',
  marginBottom: '8px',
  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
};

const statItemStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.9)',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 48px',
  backgroundColor: '#fff',
  borderBottom: '1px solid #e2e8f0',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'center',
};

const addInspirationBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  marginLeft: '20px',
};

const waterfallStyle: React.CSSProperties = {
  columnWidth: '320px',
  columnGap: '12px',
  padding: '28px 48px',
};

const imageCardStyle: React.CSSProperties = {
  breakInside: 'avoid',
  marginBottom: '12px',
  backgroundColor: '#fff',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  position: 'relative',
};

const imageWrapperStyle: React.CSSProperties = {
  width: '100%',
  position: 'relative',
  cursor: 'pointer',
};

const skeletonStyle: React.CSSProperties = {
  width: '100%',
  height: '200px',
  borderRadius: '0',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
};

const imageInfoStyle: React.CSSProperties = {
  padding: '10px 14px',
};

const tagsLineStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginBottom: '6px',
};

const tagStyle: React.CSSProperties = {
  padding: '2px 8px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 500,
};

const noteStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: 1.4,
};

const moodBtnStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  width: '32px',
  height: '32px',
  border: 'none',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.9)',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  zIndex: 2,
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: '32px',
  width: '480px',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '24px',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#475569',
  marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
};

const tagInputContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  minHeight: '40px',
  alignItems: 'center',
};

const parsedTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  borderRadius: '14px',
  fontSize: '12px',
  fontWeight: 500,
};

const tagRemoveStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 700,
  marginLeft: '2px',
  lineHeight: 1,
};

const tagInputStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  fontSize: '14px',
  flex: 1,
  minWidth: '80px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const charCountStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  display: 'block',
  textAlign: 'right',
  marginTop: '4px',
};

const modalBtnsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '24px',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#64748b',
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const previewModalStyle: React.CSSProperties = {
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
};

const previewImgStyle: React.CSSProperties = {
  maxWidth: '90vw',
  maxHeight: '85vh',
  borderRadius: '12px',
  objectFit: 'contain',
};

const closePreviewBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-12px',
  right: '-12px',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#fff',
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 48px',
  backgroundColor: '#fff',
  borderTop: '1px solid #e2e8f0',
  zIndex: 100,
};

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const logoSmallStyle: React.CSSProperties = {
  fontSize: '20px',
};

const brandStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#1e293b',
};

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const userStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
};

const logoutBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#64748b',
  cursor: 'pointer',
};

export default BoardDetail;
