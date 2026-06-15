import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getChapter, addAnnotation, getComments, addComment, claimChapter } from '../api';
import AnnotationCard from './AnnotationCard';
import type { ChapterDetail, Annotation, Comment } from '../types';

interface ChapterViewProps {
  chapterId: string;
  currentUserId: string;
  currentUserName: string;
  navigate: (r: any) => void;
  onBackToChapters: () => void;
}

const HIGHLIGHT_COLORS = [
  { color: '#fff59d', label: '淡黄' },
  { color: '#a5d6a7', label: '淡绿' },
  { color: '#90caf9', label: '淡蓝' },
  { color: '#ef9a9a', label: '淡红' },
];

export default function ChapterView({
  chapterId,
  currentUserId,
  currentUserName,
  navigate,
  onBackToChapters,
}: ChapterViewProps) {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
    rect: { top: number; left: number };
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState('#fff59d');
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationBody, setAnnotationBody] = useState('');
  const [claiming, setClaiming] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const loadChapter = useCallback(async () => {
    setLoading(true);
    const data = await getChapter(chapterId);
    setChapter(data);
    setLoading(false);
  }, [chapterId]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRef.current) return;

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text || text.length < 2) return;

    const contentText = chapter?.content || '';
    const startOffset = contentText.indexOf(text);
    if (startOffset === -1) return;

    const rect = range.getBoundingClientRect();

    setSelectionInfo({
      text,
      startOffset,
      endOffset: startOffset + text.length,
      rect: { top: rect.top + window.scrollY - 50, left: rect.left + rect.width / 2 },
    });
    setSelectedColor('#fff59d');
    setShowAnnotationInput(false);
  }, [chapter]);

  const handleAddAnnotation = () => {
    setShowAnnotationInput(true);
  };

  const handleSubmitAnnotation = async () => {
    if (!selectionInfo || !annotationBody.trim()) return;

    const newAnnotation = await addAnnotation({
      chapterId,
      userId: currentUserId,
      userName: currentUserName,
      selectedText: selectionInfo.text,
      startOffset: selectionInfo.startOffset,
      endOffset: selectionInfo.endOffset,
      highlightColor: selectedColor,
      body: annotationBody.trim(),
    });

    setChapter(prev =>
      prev ? { ...prev, annotations: [newAnnotation, ...prev.annotations] } : prev
    );
    setAnnotationBody('');
    setShowAnnotationInput(false);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleClaim = async () => {
    if (!chapter || chapter.claimed_by) return;
    setClaiming(true);
    const res = await claimChapter(chapterId, currentUserId, currentUserName);
    if (res.success) {
      setChapter(prev => prev ? { ...prev, claimed_by: res.claimed_by } : prev);
    } else {
      alert(res.error || '认领失败');
    }
    setClaiming(false);
  };

  if (loading || !chapter) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <div style={{ color: '#7b1fa2' }}>章节加载中...</div>
      </div>
    );
  }

  const renderHighlightedContent = () => {
    if (!chapter.annotations || chapter.annotations.length === 0) {
      return chapter.content;
    }

    const sortedAnnotations = [...chapter.annotations].sort(
      (a, b) => a.start_offset - b.start_offset
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((ann, idx) => {
      if (ann.start_offset > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {chapter.content.slice(lastIndex, ann.start_offset)}
          </span>
        );
      }
      parts.push(
        <mark
          key={`hl-${ann.id}`}
          style={{
            backgroundColor: ann.highlight_color + '80',
            borderRadius: 3,
            padding: '1px 2px',
            cursor: 'pointer',
            borderBottom: `2px solid ${ann.highlight_color}`,
            transition: 'background-color 0.2s ease',
          }}
          onClick={() => {
            const el = document.getElementById(`annotation-${ann.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ann.highlight_color + 'cc')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ann.highlight_color + '80')}
        >
          {chapter.content.slice(ann.start_offset, ann.end_offset)}
        </mark>
      );
      lastIndex = ann.end_offset;
    });

    if (lastIndex < chapter.content.length) {
      parts.push(<span key="text-last">{chapter.content.slice(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBackToChapters}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a148c',
            fontSize: 16,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ← 返回
        </button>
        <h2 style={{ color: '#4a148c', fontSize: 22, fontWeight: 700 }}>{chapter.title}</h2>
        {!chapter.claimed_by && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            style={{
              background: '#7e57c2',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 13,
              cursor: 'pointer',
              marginLeft: 'auto',
              transition: 'all 0.2s ease',
            }}
          >
            {claiming ? '认领中...' : '🎯 认领此章节'}
          </button>
        )}
        {chapter.claimed_by && (
          <span
            style={{
              background: '#e8f5e9',
              color: '#388e3c',
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            ✓ {chapter.claimed_by} 已认领
          </span>
        )}
      </div>

      <div className="chapter-layout" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div
          className="chapter-content-panel"
          style={{
            flex: '1 1 60%',
            background: '#fef9e7',
            borderRadius: 16,
            padding: '32px 36px',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            minHeight: 400,
          }}
        >
          <div
            ref={contentRef}
            onMouseUp={handleMouseUp}
            style={{
              fontFamily: 'Georgia, "Noto Serif SC", serif',
              fontSize: 18,
              lineHeight: 1.8,
              color: '#333',
              userSelect: 'text',
            }}
          >
            {renderHighlightedContent()}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#aaa', textAlign: 'center' }}>
            💡 选中文字即可添加批注和高亮
          </div>

          {selectionInfo && !showAnnotationInput && (
            <div
              ref={toolbarRef}
              style={{
                position: 'absolute',
                top: selectionInfo.rect.top - (contentRef.current?.getBoundingClientRect().top || 0) + window.scrollY - (contentRef.current?.offsetTop || 0) + 40,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                zIndex: 100,
              }}
            >
              <button
                onClick={handleAddAnnotation}
                style={{
                  background: '#7e57c2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease',
                }}
              >
                ✏️ 批注
              </button>
              <div style={{ width: 1, height: 20, background: '#ddd' }} />
              {HIGHLIGHT_COLORS.map(hc => (
                <button
                  key={hc.color}
                  onClick={() => setSelectedColor(hc.color)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: selectedColor === hc.color ? '2px solid #7e57c2' : '2px solid #ddd',
                    background: hc.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0,
                  }}
                  title={hc.label}
                />
              ))}
              <button
                onClick={() => setSelectionInfo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {showAnnotationInput && selectionInfo && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={e => {
                if (e.target === e.currentTarget) {
                  setShowAnnotationInput(false);
                  setSelectionInfo(null);
                }
              }}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  width: 380,
                  maxWidth: '90vw',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ marginBottom: 12, fontWeight: 600, color: '#4a148c', fontSize: 16 }}>
                  添加批注
                </div>
                <div
                  style={{
                    background: selectedColor + '30',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#555',
                    fontStyle: 'italic',
                    borderLeft: `3px solid ${selectedColor}`,
                  }}
                >
                  "{selectionInfo.text}"
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {HIGHLIGHT_COLORS.map(hc => (
                    <button
                      key={hc.color}
                      onClick={() => setSelectedColor(hc.color)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: selectedColor === hc.color ? '3px solid #7e57c2' : '2px solid #ddd',
                        background: hc.color,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        padding: 0,
                      }}
                      title={hc.label}
                    />
                  ))}
                </div>
                <textarea
                  value={annotationBody}
                  onChange={e => setAnnotationBody(e.target.value.slice(0, 500))}
                  placeholder="写下你的批注（最多500字）..."
                  style={{
                    width: '100%',
                    height: 120,
                    border: '1px solid #ddd',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#7e57c2')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#ddd')}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{annotationBody.length}/500</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setShowAnnotationInput(false);
                        setSelectionInfo(null);
                      }}
                      style={{
                        background: '#f5f5f5',
                        color: '#666',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmitAnnotation}
                      disabled={!annotationBody.trim()}
                      style={{
                        background: annotationBody.trim() ? '#7e57c2' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 20px',
                        cursor: annotationBody.trim() ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      提交
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="chapter-annotations-panel"
          style={{
            flex: '0 0 380px',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <h3 style={{ color: '#4a148c', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              📝 批注 ({chapter.annotations?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chapter.annotations?.map(ann => (
                <AnnotationCard
                  key={ann.id}
                  annotation={ann}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />
              ))}
              {(!chapter.annotations || chapter.annotations.length === 0) && (
                <div style={{ textAlign: 'center', padding: 24, color: '#aaa', fontSize: 14 }}>
                  暂无批注，选中原文文字添加第一条吧
                </div>
              )}
            </div>
          </div>

          <ChapterDiscussion
            chapterId={chapterId}
            annotations={chapter.annotations || []}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chapter-layout {
            flex-direction: column !important;
          }
          .chapter-content-panel {
            flex: 1 1 100% !important;
          }
          .chapter-annotations-panel {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

function ChapterDiscussion({
  chapterId,
  annotations,
  currentUserId,
  currentUserName,
}: {
  chapterId: string;
  annotations: Annotation[];
  currentUserId: string;
  currentUserName: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    const allComments: Comment[] = [];
    let pending = annotations.length;
    if (pending === 0) {
      setComments([]);
      setLoading(false);
      return;
    }
    annotations.forEach(ann => {
      getComments(ann.id).then(data => {
        allComments.push(...data);
        pending--;
        if (pending === 0) {
          allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setComments(allComments);
          setLoading(false);
        }
      });
    });
  }, [annotations.length]);

  const handleSubmitComment = async (parentId: string | null, body: string) => {
    if (!body.trim() || annotations.length === 0) return;
    const annId = annotations[0].id;
    const newCm = await addComment({
      annotationId: annId,
      parentId,
      userId: currentUserId,
      userName: currentUserName,
      body: body.trim(),
    });
    setComments(prev => [...prev, newCm]);
    return newCm;
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const formatRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <h3 style={{ color: '#4a148c', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        💬 章节讨论
      </h3>

      <div
        style={{
          maxHeight: 480,
          overflowY: 'auto',
          marginBottom: 16,
          paddingRight: 4,
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>加载讨论中...</div>
        ) : topLevelComments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#aaa', fontSize: 14 }}>
            暂无讨论，来发表第一条评论吧
          </div>
        ) : (
          topLevelComments.map(cm => (
            <div key={cm.id} style={{ marginBottom: 16 }}>
              <CommentItem
                comment={cm}
                onReply={() => setReplyTo(cm.id)}
                formatRelativeTime={formatRelativeTime}
              />
              {getReplies(cm.id).map(reply => (
                <div key={reply.id} style={{ marginLeft: 20 }}>
                  <CommentItem
                    comment={reply}
                    onReply={null}
                    formatRelativeTime={formatRelativeTime}
                  />
                </div>
              ))}
              {replyTo === cm.id && (
                <div style={{ marginLeft: 20, marginTop: 8 }}>
                  <ReplyInput
                    onSubmit={body => {
                      handleSubmitComment(cm.id, body).then(() => {
                        setReplyTo(null);
                        setReplyBody('');
                      });
                    }}
                    value={replyBody}
                    onChange={setReplyBody}
                    onCancel={() => setReplyTo(null)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="发表你的看法..."
          style={{
            flex: 1,
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#7e57c2')}
          onBlur={e => (e.currentTarget.style.borderColor = '#ddd')}
          onKeyDown={e => {
            if (e.key === 'Enter' && newComment.trim()) {
              handleSubmitComment(null, newComment).then(() => setNewComment(''));
            }
          }}
        />
        <button
          onClick={() => {
            if (newComment.trim()) {
              handleSubmitComment(null, newComment).then(() => setNewComment(''));
            }
          }}
          disabled={!newComment.trim()}
          style={{
            background: newComment.trim() ? '#7e57c2' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '10px 20px',
            cursor: newComment.trim() ? 'pointer' : 'not-allowed',
            fontSize: 14,
            transition: 'all 0.2s ease',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  formatRelativeTime,
}: {
  comment: Comment;
  onReply: (() => void) | null;
  formatRelativeTime: (d: string) => string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 0',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#7e57c2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {comment.user_name[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a148c' }}>{comment.user_name}</span>
          <span style={{ fontSize: 11, color: '#aaa' }}>{formatRelativeTime(comment.created_at)}</span>
        </div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>{comment.body}</div>
        {onReply && (
          <button
            onClick={onReply}
            style={{
              background: 'none',
              border: 'none',
              color: '#7e57c2',
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 0',
              marginTop: 4,
            }}
          >
            回复
          </button>
        )}
      </div>
    </div>
  );
}

function ReplyInput({
  onSubmit,
  value,
  onChange,
  onCancel,
}: {
  onSubmit: (body: string) => void;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="回复..."
        autoFocus
        style={{
          flex: 1,
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#7e57c2')}
        onBlur={e => (e.currentTarget.style.borderColor = '#ddd')}
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) {
            onSubmit(value);
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={() => { if (value.trim()) onSubmit(value); }}
        style={{
          background: '#7e57c2',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        回复
      </button>
      <button
        onClick={onCancel}
        style={{
          background: '#f5f5f5',
          color: '#666',
          border: 'none',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        取消
      </button>
    </div>
  );
}
