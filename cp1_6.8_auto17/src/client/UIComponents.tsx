import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StarshipCanvas, ConstellationCanvas } from './StarshipCanvas';
import {
  Diary,
  TAG_LIST,
  TAG_CONFIG,
  getTagColor,
  fetchAllDiaries,
  fetchAuthorDiaries,
  createDiary,
  respondToDiary,
  updateDiaryPosition,
  getAuthorId,
  formatDiaryDate,
} from './DiaryLogic';

const glassBase: React.CSSProperties = {
  background: 'rgba(15, 10, 40, 0.55)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  color: '#e0e0ff',
};

export const StarOrbitView: React.FC<{
  onStarClick: (diary: Diary) => void;
  refreshKey: number;
}> = ({ onStarClick, refreshKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarshipCanvas | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);

  const loadDiaries = useCallback(async () => {
    try {
      const data = await fetchAllDiaries();
      setDiaries(data);
    } catch (err) {
      console.error('Failed to load diaries', err);
    }
  }, []);

  useEffect(() => {
    loadDiaries();
  }, [loadDiaries, refreshKey]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new StarshipCanvas(canvasRef.current);
      engineRef.current.start();
    }
    engineRef.current.setDiaries(diaries);
    engineRef.current.setStarClickHandler(onStarClick);
  }, [diaries, onStarClick]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 56px)',
        display: 'block',
        cursor: 'default',
      }}
    />
  );
};

export const DiaryCard: React.FC<{
  diary: Diary;
  onClose: () => void;
  onResponded: () => void;
}> = ({ diary, onClose, onResponded }) => {
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const tagInfo = TAG_CONFIG[diary.tag];
  const tagLabel = tagInfo?.label ?? diary.tag;
  const tagColor = tagInfo?.color ?? '#fff';

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;
    try {
      await respondToDiary(diary.id, responseText.trim());
      setResponseText('');
      setShowResponse(false);
      onResponded();
    } catch (err) {
      console.error('Failed to respond', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...glassBase,
          width: 'min(420px, 90vw)',
          padding: 28,
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
          boxShadow: `0 0 40px ${tagColor}30, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 20,
              background: `${tagColor}25`,
              color: tagColor,
              border: `1px solid ${tagColor}50`,
              textShadow: `0 0 8px ${tagColor}80`,
            }}
          >
            {tagLabel}
          </span>
          <span style={{ fontSize: 12, color: '#8888aa' }}>{formatDiaryDate(diary.createdAt)}</span>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, textShadow: '0 0 8px rgba(200,200,255,0.2)' }}>
          {diary.content}
        </p>

        {diary.responses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 6 }}>
              ✦ {diary.responses.length} 条回应
            </div>
            {diary.responses.map((r) => (
              <div
                key={r.id}
                style={{
                  fontSize: 13,
                  color: '#b0b0d0',
                  padding: '6px 10px',
                  marginBottom: 4,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: `2px solid ${tagColor}50`,
                }}
              >
                {r.content}
              </div>
            ))}
          </div>
        )}

        {!showResponse ? (
          <button
            onClick={() => setShowResponse(true)}
            style={{
              background: `${tagColor}20`,
              border: `1px solid ${tagColor}40`,
              color: tagColor,
              padding: '8px 20px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              textShadow: `0 0 6px ${tagColor}60`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = `${tagColor}35`;
              (e.target as HTMLElement).style.boxShadow = `0 0 16px ${tagColor}30`;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = `${tagColor}20`;
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            ✧ 回应这颗星
          </button>
        ) : (
          <div>
            <textarea
              maxLength={100}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="写下你的回应…"
              style={{
                width: '100%',
                height: 60,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: 10,
                color: '#e0e0ff',
                fontSize: 13,
                resize: 'none',
                outline: 'none',
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResponse(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#8888aa',
                  padding: '6px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim()}
                style={{
                  background: responseText.trim() ? `${tagColor}30` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${tagColor}40`,
                  color: responseText.trim() ? tagColor : '#555',
                  padding: '6px 14px',
                  borderRadius: 8,
                  cursor: responseText.trim() ? 'pointer' : 'default',
                  fontSize: 12,
                  textShadow: responseText.trim() ? `0 0 6px ${tagColor}60` : 'none',
                }}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TagSelector: React.FC<{
  selected: string;
  onChange: (tag: string) => void;
}> = ({ selected, onChange }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {TAG_LIST.map((tag) => (
        <button
          key={tag.key}
          onClick={() => onChange(tag.key)}
          style={{
            padding: '5px 14px',
            borderRadius: 20,
            fontSize: 13,
            border: `1px solid ${tag.color}${selected === tag.key ? '80' : '30'}`,
            background: selected === tag.key ? `${tag.color}25` : 'transparent',
            color: selected === tag.key ? tag.color : '#8888aa',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textShadow: selected === tag.key ? `0 0 8px ${tag.color}60` : 'none',
            boxShadow: selected === tag.key ? `0 0 12px ${tag.color}20` : 'none',
          }}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
};

export const DiaryForm: React.FC<{
  onCreated: () => void;
}> = ({ onCreated }) => {
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('happy');
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  const charCount = content.length;
  const tagColor = getTagColor(tag);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await createDiary(content.trim(), tag);
      setContent('');
      setOpen(false);
      onCreated();
    } catch (err) {
      console.error('Failed to create diary', err);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1px solid rgba(255,215,0,0.4)',
          background: 'rgba(255,215,0,0.12)',
          color: '#FFD700',
          fontSize: 26,
          cursor: 'pointer',
          zIndex: 50,
          boxShadow: '0 0 20px rgba(255,215,0,0.2)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(255,215,0,0.35)';
          (e.target as HTMLElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(255,215,0,0.2)';
          (e.target as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        ✦
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              ...glassBase,
              width: 'min(440px, 90vw)',
              padding: 28,
              transform: visible ? 'scale(1)' : 'scale(0.85)',
              opacity: visible ? 1 : 0,
              transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
              boxShadow: `0 0 40px ${tagColor}20, 0 8px 32px rgba(0,0,0,0.4)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                marginBottom: 18,
                textShadow: '0 0 12px rgba(200,200,255,0.3)',
              }}
            >
              ✦ 写下此刻的心情
            </h3>

            <TagSelector selected={tag} onChange={setTag} />

            <textarea
              maxLength={200}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录此刻的想法…"
              style={{
                width: '100%',
                height: 100,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: 12,
                color: '#e0e0ff',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
                marginBottom: 4,
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 11,
                color: charCount > 180 ? '#ff6b6b' : '#666688',
                marginBottom: 16,
              }}
            >
              {charCount}/200
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#8888aa',
                  padding: '8px 18px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim()}
                style={{
                  background: content.trim() ? `${tagColor}25` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${tagColor}40`,
                  color: content.trim() ? tagColor : '#555',
                  padding: '8px 22px',
                  borderRadius: 10,
                  cursor: content.trim() ? 'pointer' : 'default',
                  fontSize: 13,
                  textShadow: content.trim() ? `0 0 8px ${tagColor}60` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                投向星轨 ✧
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ConstellationView: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ConstellationCanvas | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);

  const loadDiaries = useCallback(async () => {
    try {
      const authorId = getAuthorId();
      const data = await fetchAuthorDiaries(authorId);
      setDiaries(data);
    } catch (err) {
      console.error('Failed to load author diaries', err);
    }
  }, []);

  useEffect(() => {
    loadDiaries();
  }, [loadDiaries, refreshKey]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new ConstellationCanvas(canvasRef.current);
      engineRef.current.start();
    }
    engineRef.current.setDiaries(diaries);
    engineRef.current.setPositionChangeHandler(async (id, x, y) => {
      try {
        await updateDiaryPosition(id, x, y);
      } catch (err) {
        console.error('Failed to update position', err);
      }
    });
  }, [diaries]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  if (diaries.length === 0) {
    return (
      <div
        style={{
          height: 'calc(100vh - 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666688',
          fontSize: 15,
        }}
      >
        你还没有星星，去首页写一篇日记吧 ✧
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 56px)',
        display: 'block',
        cursor: 'grab',
      }}
    />
  );
};
