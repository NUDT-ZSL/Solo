import React, { useState } from 'react';
import * as api from '../utils/api';

interface CreateProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (program: any) => void;
}

const CreateProgramModal: React.FC<CreateProgramModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (audioFile) {
        fd.append('audio', audioFile);
      }
      if (transcript.trim()) {
        fd.append('transcript', transcript.trim());
        const timestamps = transcript
          .split(/[。！？.!?]+/)
          .filter((s) => s.trim())
          .map((text, i) => ({
            time: i * 15,
            text: text.trim(),
          }));
        fd.append('transcriptTimestamps', JSON.stringify(timestamps));
      }
      const program = await api.upload<any>('/programs', fd);
      onCreated(program);
      setTitle('');
      setAudioFile(null);
      setTranscript('');
    } catch (err) {
      console.error('Failed to create program', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          background: '#1e1e1e',
          padding: 24,
          color: '#e0e0e0',
          border: '1px solid #333',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            fontSize: 18,
            fontWeight: 600,
            color: '#e0e0e0',
          }}
        >
          创建新节目
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                color: '#aaa',
              }}
            >
              节目标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入节目标题"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#121212',
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                color: '#aaa',
              }}
            >
              音频文件 (mp3/wav, 最大50MB)
            </label>
            <input
              type="file"
              accept=".mp3,.wav"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#121212',
                color: '#e0e0e0',
                fontSize: 14,
                cursor: 'pointer',
              }}
            />
            {audioFile && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#66bb6a' }}>
                已选择: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                color: '#aaa',
              }}
            >
              转录稿内容
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="粘贴转录稿文本，每句话将自动生成为一个时间戳段落..."
              style={{
                width: '100%',
                height: 120,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#121212',
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #333',
                background: 'transparent',
                color: '#aaa',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#42a5f5',
                color: '#fff',
                fontSize: 14,
                cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !title.trim() ? 0.6 : 1,
                transition: 'transform 0.2s ease',
              }}
              onMouseDown={(e) => {
                if (!submitting && title.trim()) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
                }
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {submitting ? '创建中...' : '创建节目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProgramModal;
