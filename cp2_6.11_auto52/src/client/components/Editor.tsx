import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Type, Trash2, ArrowUp, ArrowDown, Maximize2, Check, X } from 'lucide-react';
import * as api from '../api';
import { EMOJI_OPTIONS, type FilmRoll, type Photo } from '../types';

interface EditorProps {
  id?: string;
}

function Editor({ id: propId }: EditorProps) {
  const params = useParams<{ id: string }>();
  const rollId = propId || params.id || '';
  const navigate = useNavigate();

  const [roll, setRoll] = useState<FilmRoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [slideDir, setSlideDir] = useState(0);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editEmoji, setEditEmoji] = useState('❤️');
  const [noteKey, setNoteKey] = useState(0);
  const [photoDims, setPhotoDims] = useState<Record<string, { w: number; h: number }>>({});
  const [shareUrl, setShareUrl] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const loadRoll = useCallback(async () => {
    if (!rollId) return;
    try {
      setLoading(true);
      const data = await api.getRoll(rollId);
      setRoll(data);
      setShareUrl(`${location.origin}/#/share/${data.shareLink}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rollId]);

  useEffect(() => {
    loadRoll();
  }, [loadRoll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, fullscreen, roll]);

  const goPrev = () => {
    if (!roll || roll.photos.length === 0) return;
    setSlideDir(-1);
    setTimeout(() => {
      setCurrentIndex((i) => (i - 1 + roll.photos.length) % roll.photos.length);
    }, 10);
  };
  const goNext = () => {
    if (!roll || roll.photos.length === 0) return;
    setSlideDir(1);
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % roll.photos.length);
    }, 10);
  };

  const onImgLoad = (photoId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setPhotoDims((prev) => ({
      ...prev,
      [photoId]: { w: img.naturalWidth, h: img.naturalHeight },
    }));
  };

  // 便签尺寸动态计算：不超过照片40%宽度，面积约占20%
  const computeNoteSize = (photo: Photo) => {
    const dim = photoDims[photo.id];
    if (!dim) return { width: 180, fontSize: 14 };
    const pw = dim.w;
    const ph = dim.h;
    const maxNoteWidth = pw * 0.4;
    // 便签面积约占照片面积的20%
    const photoArea = pw * ph;
    const targetArea = photoArea * 0.2;
    // 便签假设宽高比4:3
    const ratio = 4 / 3;
    let noteWidth = Math.sqrt(targetArea * ratio);
    if (noteWidth > maxNoteWidth) noteWidth = maxNoteWidth;
    if (noteWidth < 120) noteWidth = 120;
    const noteHeight = noteWidth / ratio;
    // 字体基于便签宽度
    const fontSize = Math.max(12, Math.min(18, Math.floor(noteWidth / 12)));
    return {
      width: noteWidth,
      height: noteHeight,
      fontSize,
      padding: Math.max(8, Math.floor(noteWidth / 15)),
    };
  };

  const openNoteModal = () => {
    if (!roll) return;
    const cur = roll.photos[currentIndex];
    setEditText(cur.note);
    setEditEmoji(cur.emoji || '❤️');
    setNoteModalOpen(true);
  };

  const saveNote = async () => {
    if (!roll) return;
    const photos = [...roll.photos];
    photos[currentIndex] = { ...photos[currentIndex], note: editText, emoji: editEmoji };
    try {
      const updated = await api.updateRoll(roll.id, { photos });
      setRoll(updated);
      setNoteKey((k) => k + 1);
      setNoteModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCurrentPhoto = async () => {
    if (!roll) return;
    const cur = roll.photos[currentIndex];
    try {
      await api.deletePhoto(roll.id, cur.id);
      const newPhotos = roll.photos.filter((p) => p.id !== cur.id);
      setRoll({ ...roll, photos: newPhotos });
      if (currentIndex >= newPhotos.length) setCurrentIndex(Math.max(0, newPhotos.length - 1));
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const movePhoto = async (dir: number) => {
    if (!roll) return;
    const n = roll.photos.length;
    const i = currentIndex;
    const j = (i + dir + n) % n;
    const photos = [...roll.photos];
    [photos[i], photos[j]] = [photos[j], photos[i]];
    photos.forEach((p, idx) => (p.order = idx));
    try {
      const updated = await api.updateRoll(roll.id, { photos });
      setRoll(updated);
      setCurrentIndex(j);
    } catch (err) {
      console.error(err);
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('分享链接已复制');
    } catch {
      alert(shareUrl);
    }
  };

  const handleDoubleClick = () => {
    setFullscreen((f) => !f);
  };

  if (loading) {
    return (
      <div className="min-h-screen linen-bg flex items-center justify-center">
        <div className="spinner-half" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  if (!roll || roll.photos.length === 0) {
    return (
      <div className="min-h-screen linen-bg flex flex-col items-center justify-center">
        <p className="text-[#8A8A8A] mb-4">胶卷未找到或没有照片</p>
        <button className="btn-gold px-6 py-3" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const curPhoto = roll.photos[currentIndex];
  const noteSize = computeNoteSize(curPhoto);

  return (
    <div
      className="min-h-screen bg-[#1a1a1a] flex flex-col items-center"
      style={{ paddingTop: 20, paddingBottom: 20 }}
    >
      {/* 顶栏 */}
      <div className="w-full max-w-[1200px] flex items-center justify-between px-4 mb-4" style={{ color: 'white' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <h2 className="text-lg font-light" style={{ color: '#E8D5B7' }}>
          {roll.title} · {currentIndex + 1} / {roll.photos.length}
        </h2>
        <button onClick={copyShare} className="btn-gold px-4 py-2 text-sm">
          复制分享链接
        </button>
      </div>

      {/* 预览区 */}
      <div
        ref={previewRef}
        className={`relative bg-black rounded-lg overflow-hidden flex items-center justify-center select-none ${
          fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
        style={
          fullscreen
            ? { width: '100vw', height: '100vh' }
            : { width: '80vw', maxWidth: 1000, height: '70vh', minHeight: 400 }
        }
        onDoubleClick={handleDoubleClick}
      >
        {/* 左右箭头 */}
        {roll.photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 z-10 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors"
              style={{
                width: 40,
                height: 40,
                background: 'rgba(255,255,255,0.2)',
              }}
            >
              <ChevronLeft size={22} style={{ color: '#333' }} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 z-10 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors"
              style={{
                width: 40,
                height: 40,
                background: 'rgba(255,255,255,0.2)',
              }}
            >
              <ChevronRight size={22} style={{ color: '#333' }} />
            </button>
          </>
        )}

        <div
          key={`${curPhoto.id}-${currentIndex}`}
          className="relative flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            animation: `slide${slideDir >= 0 ? 'InRight' : 'InLeft'} 0.3s cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          <img
            src={curPhoto.url}
            alt=""
            onLoad={(e) => onImgLoad(curPhoto.id, e)}
            className="object-contain"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            draggable={false}
          />

          {/* 便签叠在右下角 */}
          {noteKey >= 0 && (
            <div
              key={noteKey}
              className="note-fade-in absolute rounded-xl shadow-xl"
              style={{
                right: fullscreen ? 32 : 16,
                bottom: fullscreen ? 32 : 16,
                width: fullscreen ? Math.min(noteSize.width, 240) : noteSize.width,
                background: 'rgba(255,255,255,0.8)',
                padding: noteSize.padding || 12,
                maxHeight: fullscreen ? '40%' : '40%',
                overflow: 'hidden',
              }}
            >
              <div className="flex justify-between items-start gap-2">
                <span style={{ fontSize: (noteSize.fontSize || 14) + 6 }}>{curPhoto.emoji || '❤️'}</span>
              </div>
              {curPhoto.note && (
                <p
                  className="mt-1 leading-snug overflow-hidden"
                  style={{
                    color: '#333',
                    fontSize: noteSize.fontSize || 14,
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {curPhoto.note}
                </p>
              )}
              {!curPhoto.note && (
                <p className="mt-1 italic" style={{ color: '#999', fontSize: (noteSize.fontSize || 14) - 2 }}>
                  点击下方"编辑便签"添加回忆
                </p>
              )}
            </div>
          )}
        </div>

        {/* 右上角全屏按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen((f) => !f);
          }}
          className="absolute top-3 right-3 rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
          style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* 浮动工具栏 */}
      <div
        className="glass flex items-center gap-3 mt-4"
        style={{ padding: '8px 16px', borderRadius: 999 }}
      >
        <button onClick={openNoteModal} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors" title="编辑便签">
          <Type size={18} />
          <span className="text-sm">编辑便签</span>
        </button>
        <div className="w-px h-5 bg-black/10" />
        <button onClick={deleteCurrentPhoto} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="删除照片">
          <Trash2 size={18} />
          <span className="text-sm">删除</span>
        </button>
        <div className="w-px h-5 bg-black/10" />
        <button onClick={() => movePhoto(-1)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors" title="上移">
          <ArrowUp size={18} />
          <span className="text-sm">上移</span>
        </button>
        <button onClick={() => movePhoto(1)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-black/5 transition-colors" title="下移">
          <ArrowDown size={18} />
          <span className="text-sm">下移</span>
        </button>
      </div>

      {/* 编辑便签模态框 */}
      {noteModalOpen && (
        <div className="modal-backdrop flex items-center justify-center z-[100]" onClick={() => setNoteModalOpen(false)}>
          <div
            className="modal-content bg-white rounded-2xl p-6"
            style={{ width: 440, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#2C2C2C' }}>编辑便签</h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 200))}
              maxLength={200}
              placeholder="写下这段回忆..."
              className="w-full rounded-lg border p-3"
              style={{ height: 100, borderColor: '#C9B99A', resize: 'none' }}
            />
            <div className="text-right text-sm mt-1" style={{ color: editText.length > 180 ? '#E74C3C' : '#8A8A8A' }}>
              {editText.length}/200
            </div>
            <div className="mt-3">
              <p className="text-sm mb-2" style={{ color: '#8A8A8A' }}>选择情绪图标</p>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setEditEmoji(em)}
                    className="rounded-lg text-xl transition-transform"
                    style={{
                      width: 36,
                      height: 36,
                      background: editEmoji === em ? 'linear-gradient(135deg,#E8D5B7,#D4AF37)' : '#f5f0e8',
                      transform: editEmoji === em ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setNoteModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-1">
                <X size={16} />
                取消
              </button>
              <button onClick={saveNote} className="btn-gold px-5 py-2 flex items-center gap-1">
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop flex items-center justify-center z-[100]" onClick={() => setDeleteConfirmOpen(false)}>
          <div
            className="modal-content bg-white rounded-2xl p-6"
            style={{ width: 360, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#E74C3C' }}>删除照片</h3>
            <p className="mb-4" style={{ color: '#8A8A8A' }}>确认删除这张照片吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 rounded-lg hover:bg-gray-100">
                取消
              </button>
              <button onClick={deleteCurrentPhoto} className="px-5 py-2 rounded-lg text-white" style={{ background: '#E74C3C' }}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(60px) scale(0.96); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-60px) scale(0.96); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Editor;
export { Editor };
