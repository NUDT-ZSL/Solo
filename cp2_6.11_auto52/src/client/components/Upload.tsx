import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload as UploadIcon, ChevronLeft as ScrollLeftIcon, ChevronRight as ScrollRightIcon, Check, X } from 'lucide-react';
import * as api from '../api';

interface LocalPhoto {
  id: string;
  file: File;
  url: string;
  savedId?: string;
  savedUrl?: string;
}

function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dragHoldTimer, setDragHoldTimer] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [rollId, setRollId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const remaining = 10 - photos.length;
    if (remaining <= 0) {
      alert('最多只能上传10张照片');
      return;
    }
    const toAdd = arr.slice(0, remaining);
    const newItems: LocalPhoto[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newItems]);
  }, [photos.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removePhoto = (id: string, idx: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    const item = photos.find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.url);
  };

  // 拖拽排序：长按触发（HTML5 Drag API）
  const startDragHold = (idx: number) => {
    clearTimers();
    const t = window.setTimeout(() => {
      setDragIndex(idx);
      setIsDragging(true);
    }, 300);
    setDragHoldTimer(t);
  };
  const cancelHold = () => {
    if (dragHoldTimer) {
      clearTimeout(dragHoldTimer);
      setDragHoldTimer(null);
    }
  };
  const clearTimers = () => {
    if (dragHoldTimer) {
      clearTimeout(dragHoldTimer);
      setDragHoldTimer(null);
    }
  };

  const onPhotoDragStart = (e: React.DragEvent, idx: number) => {
    if (!isDragging || dragIndex !== idx) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    e.currentTarget.classList.add('dragging');
  };
  const onPhotoDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDragIndex(null);
    setOverIndex(null);
    setIsDragging(false);
    clearTimers();
  };
  const onPhotoDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      setOverIndex(idx);
    }
  };
  const onPhotoDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) {
      setOverIndex(null);
      return;
    }
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setOverIndex(null);
  };

  const scrollThumbs = (dir: 1 | -1) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async () => {
    if (!title.trim()) {
      alert('请给这卷胶卷取个名字');
      return;
    }
    if (photos.length < 3) {
      alert('至少需要3张照片');
      return;
    }
    try {
      setPublishing(true);
      // 1. 创建胶卷
      const roll = await api.createRoll(title.trim());
      setRollId(roll.id);
      // 2. 上传所有照片
      const files = photos.map((p) => p.file);
      const saved = await api.uploadPhotos(roll.id, files);
      // 3. 应用用户的排序
      const orderedPhotos = saved.map((sp, i) => ({ ...sp, order: i }));
      await api.updateRoll(roll.id, { photos: orderedPhotos });

      setPublished(true);
      setTimeout(() => {
        navigate(`/edit/${roll.id}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('发布失败，请重试');
      setPublishing(false);
    }
  };

  return (
    <div className="linen-bg min-h-screen relative flex flex-col items-center" style={{ paddingTop: 80, paddingBottom: 100 }}>
      <nav
        className="glass fixed top-0 left-0 right-0 z-40 flex items-center justify-between"
        style={{ height: 72, paddingLeft: 32, paddingRight: 32 }}
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2" style={{ color: '#8B6914' }}>
          <ArrowLeft size={22} />
          <span className="text-lg font-medium">返回</span>
        </button>
        <h1 className="gradient-gold-text font-bold text-[28px]">胶卷回忆录</h1>
        <div style={{ width: 80 }} />
      </nav>

      {/* 上传区 */}
      <div
        className={`dashed-upload flex flex-col items-center justify-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
        style={{ width: 500, maxWidth: '90vw', height: 300, borderRadius: 16 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={handlePick}
      >
        <UploadIcon size={48} color="#B8860B" />
        <p className="mt-4" style={{ color: '#8A8A8A', fontSize: 16 }}>
          拖拽照片到这里，或点击选择
        </p>
        <p className="mt-1 text-xs" style={{ color: '#BFA98A' }}>
          支持 3 - 10 张照片，当前 {photos.length}/10
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* 缩略图列表 */}
      {photos.length > 0 && (
        <div className="relative mt-8" style={{ width: 'min(80vw, 900px)' }}>
          {photos.length >= 5 && (
            <>
              <button
                onClick={() => scrollThumbs(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center hover:bg-white"
                style={{
                  width: 40,
                  height: 40,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  background: 'rgba(255,255,255,0.7)',
                }}
              >
                <ScrollLeftIcon size={20} color="#B8860B" />
              </button>
              <button
                onClick={() => scrollThumbs(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center hover:bg-white"
                style={{
                  width: 40,
                  height: 40,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  background: 'rgba(255,255,255,0.7)',
                }}
              >
                <ScrollRightIcon size={20} color="#B8860B" />
              </button>
            </>
          )}
          <div
            ref={scrollContainerRef}
            className="scroll-hide flex gap-3 overflow-x-auto py-4 px-8"
          >
            {photos.map((p, idx) => (
              <div
                key={p.id}
                draggable={isDragging && dragIndex === idx}
                onMouseDown={() => startDragHold(idx)}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={() => startDragHold(idx)}
                onTouchEnd={cancelHold}
                onDragStart={(e) => onPhotoDragStart(e, idx)}
                onDragEnd={onPhotoDragEnd}
                onDragOver={(e) => onPhotoDragOver(e, idx)}
                onDrop={(e) => onPhotoDrop(e, idx)}
                className={`relative flex-shrink-0 select-none transition-transform ${overIndex === idx ? 'drag-over-target' : ''}`}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: isDragging && dragIndex === idx ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" draggable={false} />
                {isDragging && dragIndex === idx && (
                  <div className="absolute inset-0 bg-amber-500/30 border-2 border-amber-500 rounded" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(p.id, idx);
                  }}
                  className="absolute top-1 right-1 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform"
                  style={{
                    width: 22,
                    height: 22,
                    background: '#E74C3C',
                    color: 'white',
                  }}
                >
                  <X size={14} />
                </button>
                <div
                  className="absolute left-1 top-1 rounded-full text-[10px] font-medium flex items-center justify-center"
                  style={{ width: 20, height: 20, background: 'rgba(0,0,0,0.55)', color: 'white' }}
                >
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs mt-2" style={{ color: '#8A8A8A' }}>
            提示：长按缩略图约 0.3 秒后可拖动调整顺序
          </p>
        </div>
      )}

      {/* 底部输入与按钮 */}
      <div className="fixed bottom-0 left-0 right-0 glass flex items-center justify-center gap-5 py-4 z-30">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这卷胶卷取个名字..."
          className="rounded-lg border outline-none px-4"
          style={{
            height: 48,
            width: 320,
            maxWidth: '45vw',
            borderColor: '#C9B99A',
            background: '#FFFFFF',
            color: '#2C2C2C',
            fontSize: 16,
          }}
        />
        <button
          onClick={publish}
          disabled={publishing || published || photos.length < 3 || !title.trim()}
          className="btn-gold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            width: 180,
            height: 50,
            background: published
              ? 'linear-gradient(135deg,#27ae60,#2ecc71)'
              : 'linear-gradient(135deg,#B8860B,#D4AF37)',
            fontSize: 22,
          }}
        >
          {publishing ? (
            <div className="spinner-half" style={{ width: 22, height: 22 }} />
          ) : published ? (
            <>
              <Check size={22} />
              已保存
            </>
          ) : (
            '发布'
          )}
        </button>
      </div>
    </div>
  );
}

export default Upload;
export { Upload };
