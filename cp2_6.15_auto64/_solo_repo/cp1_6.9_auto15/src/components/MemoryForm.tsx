import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, EmotionType, EMOTION_COLORS, EMOTION_LABELS, MemoryMarker } from '../store';

const EMOTIONS: EmotionType[] = ['happy', 'sad', 'nostalgic', 'surprised'];

const MemoryForm: React.FC = () => {
  const showForm = useAppStore((s) => s.showForm);
  const pendingPosition = useAppStore((s) => s.pendingPosition);
  const currentMap = useAppStore((s) => s.currentMap);
  const isVisitor = useAppStore((s) => s.isVisitor);
  const setShowForm = useAppStore((s) => s.setShowForm);
  const addMarker = useAppStore((s) => s.addMarker);
  const setPendingPosition = useAppStore((s) => s.setPendingPosition);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [emotionType, setEmotionType] = useState<EmotionType>('nostalgic');
  const [intensity, setIntensity] = useState(5);
  const [error, setError] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) {
      setTitle('');
      setContent('');
      setPhoto(undefined);
      setEmotionType('nostalgic');
      setIntensity(5);
      setError('');
    }
  }, [showForm]);

  if (!showForm || isVisitor) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('仅支持 jpg/png 格式的照片');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('照片大小不能超过 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setError('');
    };
    reader.onerror = () => setError('照片读取失败');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!pendingPosition || !currentMap) return;
    if (!title.trim()) {
      setError('请填写回忆标题');
      return;
    }
    if (content.length > 500) {
      setError('正文不能超过 500 字');
      return;
    }

    const payload = {
      mapId: currentMap.id,
      marker: {
        x: pendingPosition.x,
        y: pendingPosition.y,
        title: title.trim(),
        content: content.substring(0, 500),
        photo,
        emotionType,
        emotionIntensity: intensity,
      },
    };

    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const m: MemoryMarker = data.data;
        addMarker(m);
        setShowForm(false);
        setPendingPosition(null);
      } else {
        setError(data.error || '提交失败');
      }
    } catch {
      setError('网络错误，提交失败');
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setPendingPosition(null);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 46, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.4s ease-out',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #141452 0%, #0F0F3F 100%)',
          border: '1px solid rgba(155, 89, 182, 0.3)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(155,89,182,0.15)',
          color: '#E0E0FF',
          animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>
          🌸 记录这段回忆
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(224,224,255,0.6)', marginBottom: 20 }}>
          在记忆星系中点亮一颗新的花朵星
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(224,224,255,0.85)' }}>
            回忆标题 <span style={{ color: '#E74C3C' }}>*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这段回忆起个名字..."
            maxLength={60}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(224,224,255,0.15)',
              borderRadius: 10,
              color: '#E0E0FF',
              fontSize: 14,
              outline: 'none',
              transition: 'border 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(155, 89, 182, 0.6)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(224,224,255,0.15)')}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(224,224,255,0.85)' }}>
            回忆内容 <span style={{ fontSize: 11, color: 'rgba(224,224,255,0.4)' }}>({content.length}/500)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="写下你想要珍藏的那段时光..."
            rows={5}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(224,224,255,0.15)',
              borderRadius: 10,
              color: '#E0E0FF',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(155, 89, 182, 0.6)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(224,224,255,0.15)')}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(224,224,255,0.85)' }}>
            上传照片 <span style={{ fontSize: 11, color: 'rgba(224,224,255,0.4)' }}>(jpg/png, ≤3MB, 可选)</span>
          </label>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              padding: photo ? 8 : 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(224,224,255,0.2)',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            {photo ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={photo} alt="preview" style={{ maxHeight: 100, borderRadius: 6 }} />
                <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(224,224,255,0.6)' }}>点击更换</div>
              </div>
            ) : (
              <div style={{ color: 'rgba(224,224,255,0.5)', fontSize: 13 }}>
                📷 点击上传回忆照片
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'rgba(224,224,255,0.85)' }}>
            情感类型
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {EMOTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmotionType(e)}
                style={{
                  padding: '10px 8px',
                  background: emotionType === e ? EMOTION_COLORS[e] : 'rgba(255,255,255,0.04)',
                  border: emotionType === e ? 'none' : '1px solid rgba(224,224,255,0.12)',
                  borderRadius: 8,
                  color: emotionType === e ? '#0A0A2E' : '#E0E0FF',
                  fontSize: 13,
                  fontWeight: emotionType === e ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {EMOTION_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'rgba(224,224,255,0.85)' }}>
            情感强度 <span style={{ color: EMOTION_COLORS[emotionType], fontWeight: 600 }}>{intensity}</span>
            <span style={{ fontSize: 11, color: 'rgba(224,224,255,0.4)', marginLeft: 8 }}>
              ({intensity === 1 ? '极淡' : intensity <= 3 ? '轻微' : intensity <= 6 ? '适中' : intensity <= 8 ? '深刻' : '刻骨铭心'})
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            style={{
              width: '100%',
              height: 4,
              WebkitAppearance: 'none',
              appearance: 'none',
              background: `linear-gradient(to right, ${EMOTION_COLORS[emotionType]} 0%, ${EMOTION_COLORS[emotionType]} ${
                (intensity - 1) * 11.11
              }%, rgba(224,224,255,0.15) ${(intensity - 1) * 11.11}%, rgba(224,224,255,0.15) 100%)`,
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 18px; height: 18px;
              border-radius: 50%;
              background: ${EMOTION_COLORS[emotionType]};
              border: 3px solid #0A0A2E;
              cursor: pointer;
              box-shadow: 0 0 10px ${EMOTION_COLORS[emotionType]}88;
            }
            input[type=range]::-moz-range-thumb {
              width: 18px; height: 18px;
              border-radius: 50%;
              background: ${EMOTION_COLORS[emotionType]};
              border: 3px solid #0A0A2E;
              cursor: pointer;
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'rgba(224,224,255,0.35)' }}>
            <span>1 花瓣</span>
            <span>10 花瓣</span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 8,
            color: '#E74C3C',
            fontSize: 12,
            marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(224,224,255,0.15)',
              borderRadius: 10,
              color: '#E0E0FF',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1.2,
              padding: '12px 20px',
              background: `linear-gradient(135deg, ${EMOTION_COLORS[emotionType]} 0%, #9B59B6 100%)`,
              border: 'none',
              borderRadius: 10,
              color: '#0A0A2E',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: `0 4px 20px ${EMOTION_COLORS[emotionType]}66`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 6px 28px ${EMOTION_COLORS[emotionType]}99`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 20px ${EMOTION_COLORS[emotionType]}66`;
            }}
          >
            🌸 绽放回忆
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryForm;
