import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDaysFromNow, fileToBase64 } from '../utils';
import { CreateCapsuleResponse } from '../types';
import { initAudioContext } from '../AudioManager';

type UnlockPreset = '1day' | '3days' | '7days' | '30days' | 'custom';

const UNLOCK_PRESETS: { key: UnlockPreset; label: string; getTime: () => number }[] = [
  { key: '1day', label: '1天后', getTime: () => getDaysFromNow(1) },
  { key: '3days', label: '3天后', getTime: () => getDaysFromNow(3) },
  { key: '7days', label: '7天后', getTime: () => getDaysFromNow(7) },
  { key: '30days', label: '30天后', getTime: () => getDaysFromNow(30) },
  { key: 'custom', label: '自定义', getTime: () => 0 },
];

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockPreset, setUnlockPreset] = useState<UnlockPreset>('7days');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageName, setImageName] = useState('');
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioName, setAudioName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const getUnlockTime = (): number => {
    if (unlockPreset === 'custom') {
      if (!customDate) return 0;
      const dateStr = customTime
        ? `${customDate}T${customTime}`
        : `${customDate}T00:00`;
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? 0 : t;
    }
    const preset = UNLOCK_PRESETS.find(p => p.key === unlockPreset);
    return preset ? preset.getTime() : 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('仅支持 JPG 或 PNG 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }
    setError('');
    try {
      const b64 = await fileToBase64(file);
      setImageBase64(b64);
      setImageName(file.name);
    } catch {
      setError('图片上传失败');
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3'].includes(file.type) && !file.name.endsWith('.mp3')) {
      setError('仅支持 MP3 格式的音频');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('音频大小不能超过 3MB');
      return;
    }
    setError('');
    try {
      const b64 = await fileToBase64(file);
      setAudioBase64(b64);
      setAudioName(file.name);
    } catch {
      setError('音频上传失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    initAudioContext();

    if (!title.trim()) {
      setError('请输入胶囊标题');
      return;
    }
    if (title.length > 20) {
      setError('标题不能超过20字');
      return;
    }
    if (!content.trim()) {
      setError('请输入正文内容');
      return;
    }
    if (content.length > 500) {
      setError('正文不能超过500字');
      return;
    }
    const unlockTime = getUnlockTime();
    if (unlockTime <= Date.now()) {
      setError(unlockPreset === 'custom' ? '请选择一个未来的日期时间' : '解锁时间必须在未来');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        title: title.trim(),
        content: content.trim(),
        unlockTime,
      };
      if (imageBase64) body.image = imageBase64;
      if (audioBase64) body.audio = audioBase64;

      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '创建失败');
      }

      const data: CreateCapsuleResponse = await res.json();
      navigate(`/capsule/${data.id}`);
    } catch (err: any) {
      setError(err.message || '创建胶囊失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">创建时间胶囊</h1>
        <p className="page-subtitle">
          封存此刻的文字、影像与声音，让未来的你与惊喜相遇
        </p>
      </div>

      <form className="create-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">⚠️ {error}</div>}

        <div className="form-group">
          <label className="form-label">胶囊标题</label>
          <input
            type="text"
            className="form-input"
            placeholder="给你的胶囊取个名字..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={20}
          />
          <div className="form-hint">{title.length}/20 字</div>
        </div>

        <div className="form-group">
          <label className="form-label">正文内容</label>
          <textarea
            className="form-textarea"
            placeholder="写下你想对未来说的话..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
          />
          <div className="form-hint">{content.length}/500 字</div>
        </div>

        <div className="form-group">
          <label className="form-label">解锁时间</label>
          <div className="unlock-options">
            {UNLOCK_PRESETS.map(preset => (
              <button
                type="button"
                key={preset.key}
                className={`unlock-option ${unlockPreset === preset.key ? 'active' : ''}`}
                onClick={() => setUnlockPreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {unlockPreset === 'custom' && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <input
                type="date"
                className="form-input"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ flex: 1 }}
              />
              <input
                type="time"
                className="form-input"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{ width: '160px' }}
              />
            </div>
          )}
          <div className="form-hint">
            {unlockPreset !== 'custom' && getUnlockTime() > 0 && (
              <>预计解锁时间：{new Date(getUnlockTime()).toLocaleString('zh-CN')}</>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">附加图片（可选）</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          {!imageBase64 ? (
            <div className="file-upload" onClick={() => imageInputRef.current?.click()}>
              <div className="file-upload-label">
                📷 <strong>点击上传图片</strong><br />
                <span style={{ fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                  支持 JPG/PNG，最大 5MB
                </span>
              </div>
            </div>
          ) : (
            <div className="file-preview">
              <span className="file-preview-name">🖼️ {imageName}</span>
              <button
                type="button"
                className="file-remove"
                onClick={() => { setImageBase64(''); setImageName(''); }}
              >
                移除
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">附加音频（可选）</label>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            style={{ display: 'none' }}
            onChange={handleAudioUpload}
          />
          {!audioBase64 ? (
            <div className="file-upload" onClick={() => audioInputRef.current?.click()}>
              <div className="file-upload-label">
                🎵 <strong>点击上传音频</strong><br />
                <span style={{ fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                  支持 MP3，最大 3MB
                </span>
              </div>
            </div>
          ) : (
            <div className="file-preview">
              <span className="file-preview-name">🎧 {audioName}</span>
              <button
                type="button"
                className="file-remove"
                onClick={() => { setAudioBase64(''); setAudioName(''); }}
              >
                移除
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={loading}
        >
          {loading ? '⏳ 正在封存胶囊...' : '🔒 封存胶囊'}
        </button>
      </form>
    </div>
  );
};

export default CreatePage;
