import { useState, useEffect, useRef } from 'react';
import {
  fetchComments,
  addComment,
  updateCard,
  deleteCard,
  fetchUsers,
} from '../api';
import type { Card, Comment, User, Priority, Tag, ColumnType } from '../types';

interface CardDetailProps {
  card: Card;
  currentUser: User;
  onClose: () => void;
  onCardUpdated: (card: Card) => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#9ca3af',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

const COLUMN_LABELS: Record<ColumnType, string> = {
  todo: '待办',
  inProgress: '进行中',
  done: '已完成',
};

function CardDetail({
  card,
  currentUser,
  onClose,
  onCardUpdated,
}: CardDetailProps) {
  const [visible, setVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(card.description);
  const [editPriority, setEditPriority] = useState<Priority>(card.priority);
  const [editColumn, setEditColumn] = useState<ColumnType>(card.column);
  const [editDueDate, setEditDueDate] = useState(card.dueDate || '');
  const [editAssignee, setEditAssignee] = useState(card.assigneeId || '');
  const [newTagInput, setNewTagInput] = useState('');
  const [editTags, setEditTags] = useState<Tag[]>(card.tags);
  const [saving, setSaving] = useState(false);
  const commentListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    loadComments();
    fetchUsers().then((r) => {
      if (r.code === 0) setAllUsers(r.data);
    });
  }, [card.id]);

  const loadComments = async () => {
    const res = await fetchComments(card.id);
    if (res.code === 0) {
      setComments(res.data);
      setTimeout(() => scrollCommentsToBottom(), 50);
    }
  };

  const scrollCommentsToBottom = () => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setCommentText('');
    const res = await addComment(card.id, currentUser.id, text);
    if (res.code === 0 && res.data) {
      setComments((prev) => [...prev, res.data as Comment]);
      setTimeout(() => scrollCommentsToBottom(), 10);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCard(card.id, {
      title: editTitle.trim() || card.title,
      description: editDesc,
      priority: editPriority,
      column: editColumn,
      dueDate: editDueDate || null,
      assigneeId: editAssignee || null,
      tags: editTags,
    });
    setSaving(false);
    if (res.code === 0 && res.data) {
      onCardUpdated(res.data as Card);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这张卡片吗？')) return;
    const res = await deleteCard(card.id);
    if (res.code === 0) {
      handleClose();
      window.location.reload();
    }
  };

  const addTag = () => {
    const name = newTagInput.trim();
    if (!name) return;
    const palette = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#10b981',
      '#14b8a6',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#6b7280',
    ];
    const color = palette[editTags.length % palette.length];
    setEditTags([...editTags, { name, color }]);
    setNewTagInput('');
  };

  const removeTag = (idx: number) => {
    setEditTags(editTags.filter((_, i) => i !== idx));
  };

  const assignee = allUsers.find((u) => u.id === editAssignee);
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(
      2,
      '0'
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 400,
          maxWidth: '100vw',
          height: '100vh',
          background: '#fff',
          zIndex: 101,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          color: '#1f2937',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={s.header}>
          <div style={s.headerTitleRow}>
            <div
              style={{
                ...s.priorityDot,
                background: PRIORITY_COLORS[card.priority],
              }}
            />
            <span
              style={{
                ...s.colBadge,
                color: PRIORITY_COLORS[card.priority],
                background: PRIORITY_COLORS[card.priority] + '15',
              }}
            >
              {COLUMN_LABELS[card.column]}
            </span>
            <button style={s.closeBtn} onClick={handleClose}>
              ×
            </button>
          </div>

          {editingTitle ? (
            <input
              style={s.titleInput}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (editTitle.trim() !== card.title) handleSave();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingTitle(false);
                  handleSave();
                }
              }}
              autoFocus
            />
          ) : (
            <div
              style={s.cardTitle}
              onClick={() => setEditingTitle(true)}
              title="点击编辑"
            >
              {card.title}
              <span style={s.editHint}>✎</span>
            </div>
          )}
        </div>

        <div style={s.body}>
          <div style={s.section}>
            <div style={s.sectionLabel}>描述</div>
            {editingDesc ? (
              <div>
                <textarea
                  style={s.descTextarea}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  autoFocus
                />
                <div style={s.inlineActions}>
                  <button
                    style={s.smallBtnGhost}
                    onClick={() => {
                      setEditDesc(card.description);
                      setEditingDesc(false);
                    }}
                  >
                    取消
                  </button>
                  <button
                    style={s.smallBtn}
                    onClick={() => {
                      setEditingDesc(false);
                      handleSave();
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...s.descText,
                  minHeight: card.description ? 'auto' : 40,
                }}
                onClick={() => setEditingDesc(true)}
              >
                {card.description || (
                  <span style={{ color: '#9ca3af' }}>点击添加描述</span>
                )}
              </div>
            )}
          </div>

          <div style={s.fieldGrid}>
            <div style={s.field}>
              <div style={s.fieldLabel}>优先级</div>
              <select
                style={s.fieldSelect}
                value={editPriority}
                onChange={(e) => {
                  setEditPriority(e.target.value as Priority);
                  setTimeout(() => handleSave(), 0);
                }}
              >
                {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  )
                )}
              </select>
            </div>
            <div style={s.field}>
              <div style={s.fieldLabel}>状态</div>
              <select
                style={s.fieldSelect}
                value={editColumn}
                onChange={(e) => {
                  setEditColumn(e.target.value as ColumnType);
                  setTimeout(() => handleSave(), 0);
                }}
              >
                {(['todo', 'inProgress', 'done'] as ColumnType[]).map((c) => (
                  <option key={c} value={c}>
                    {COLUMN_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <div style={s.fieldLabel}>截止日期</div>
              <input
                style={s.fieldInput}
                type="date"
                value={editDueDate}
                onChange={(e) => {
                  setEditDueDate(e.target.value);
                  setTimeout(() => handleSave(), 0);
                }}
              />
            </div>
            <div style={s.field}>
              <div style={s.fieldLabel}>负责人</div>
              <select
                style={s.fieldSelect}
                value={editAssignee}
                onChange={(e) => {
                  setEditAssignee(e.target.value);
                  setTimeout(() => handleSave(), 0);
                }}
              >
                <option value="">未分配</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nickname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {assignee && (
            <div style={s.assigneeRow}>
              <div
                style={{
                  ...s.avatar,
                  background: colorForName(assignee.nickname),
                }}
              >
                {assignee.avatar}
              </div>
              <div>
                <div style={s.assigneeName}>{assignee.nickname}</div>
                <div style={s.assigneeLabel}>负责人</div>
              </div>
            </div>
          )}

          <div style={s.section}>
            <div style={s.sectionLabel}>标签</div>
            <div style={s.tagList}>
              {editTags.map((t, i) => (
                <span
                  key={i}
                  style={{
                    ...s.tag,
                    background: t.color + '22',
                    borderColor: t.color,
                    color: t.color,
                  }}
                >
                  {t.name}
                  <span style={s.tagX} onClick={() => removeTag(i)}>
                    ×
                  </span>
                </span>
              ))}
            </div>
            <div style={s.tagAddRow}>
              <input
                style={s.tagInput}
                placeholder="添加标签，回车确认"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                    handleSave();
                  }
                }}
              />
              <button
                style={s.smallBtn}
                onClick={() => {
                  addTag();
                  handleSave();
                }}
              >
                添加
              </button>
            </div>
          </div>

          <div style={s.meta}>
            <div>创建于 {formatTime(card.createdAt)}</div>
            {card.movedAt && <div>最近移动 {formatTime(card.movedAt)}</div>}
          </div>

          <div style={s.section}>
            <div style={s.sectionLabel}>
              评论 <span style={{ color: '#6b7280' }}>({comments.length})</span>
            </div>
            <div ref={commentListRef} style={s.commentList}>
              {comments.length === 0 ? (
                <div style={s.emptyComments}>还没有评论，来发第一条吧</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={s.commentItem}>
                    <div
                      style={{
                        ...s.avatar,
                        width: 32,
                        height: 32,
                        fontSize: 12,
                        background: c.user
                          ? colorForName(c.user.nickname)
                          : '#6b7280',
                      }}
                    >
                      {c.user?.avatar || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.commentHeader}>
                        <span style={s.commentName}>
                          {c.user?.nickname || '未知用户'}
                        </span>
                        <span style={s.commentTime}>{formatTime(c.createdAt)}</span>
                      </div>
                      <div style={s.commentContent}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={s.commentInputWrap}>
              <textarea
                style={s.commentInput}
                placeholder="输入评论内容..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                rows={2}
              />
              <button
                style={{
                  ...s.commentSubmit,
                  ...(!commentText.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
                onClick={submitComment}
                disabled={!commentText.trim()}
              >
                发布
              </button>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <button style={s.deleteBtn} onClick={handleDelete}>
            删除卡片
          </button>
          <div style={{ flex: 1 }} />
          {saving && <span style={{ color: '#6b7280', fontSize: 12 }}>保存中...</span>}
        </div>
      </div>
    </>
  );
}

function colorForName(name: string): string {
  const colors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#14b8a6',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const s: Record<string, React.CSSProperties> = {
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  colBadge: {
    fontSize: 12,
    padding: '2px 10px',
    borderRadius: 10,
    fontWeight: 500,
  },
  closeBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  editHint: {
    color: '#9ca3af',
    fontSize: 14,
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
    background: '#f9fafb',
    borderRadius: 6,
    padding: '6px 10px',
    width: '100%',
    border: '1px solid #e5e7eb',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    letterSpacing: 0.2,
  },
  descText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 1.6,
    background: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    whiteSpace: 'pre-wrap',
  },
  descTextarea: {
    width: '100%',
    minHeight: 120,
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    borderRadius: 8,
    padding: 12,
    border: '1px solid #e5e7eb',
    resize: 'vertical',
    lineHeight: 1.6,
  },
  inlineActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  smallBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 12,
    fontWeight: 500,
  },
  smallBtnGhost: {
    padding: '6px 14px',
    borderRadius: 6,
    background: '#f3f4f6',
    color: '#4b5563',
    fontSize: 12,
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500,
  },
  fieldSelect: {
    height: 36,
    borderRadius: 6,
    background: '#f9fafb',
    color: '#111827',
    padding: '0 10px',
    fontSize: 13,
    border: '1px solid #e5e7eb',
    outline: 'none',
  },
  fieldInput: {
    height: 36,
    borderRadius: 6,
    background: '#f9fafb',
    color: '#111827',
    padding: '0 10px',
    fontSize: 13,
    border: '1px solid #e5e7eb',
  },
  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  assigneeLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    fontSize: 12,
    padding: '4px 12px',
    borderRadius: 12,
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500,
  },
  tagX: {
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  },
  tagAddRow: {
    display: 'flex',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    height: 34,
    borderRadius: 6,
    background: '#f9fafb',
    color: '#111827',
    padding: '0 10px',
    fontSize: 13,
    border: '1px solid #e5e7eb',
  },
  meta: {
    fontSize: 12,
    color: '#9ca3af',
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  commentList: {
    maxHeight: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 4,
  },
  emptyComments: {
    padding: '24px 0',
    textAlign: 'center',
    fontSize: 13,
    color: '#9ca3af',
  },
  commentItem: {
    display: 'flex',
    gap: 10,
    animation: 'fadeIn 0.2s ease-out',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  commentName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#111827',
  },
  commentTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  commentContent: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    wordBreak: 'break-word',
    background: '#f9fafb',
    padding: '8px 12px',
    borderRadius: 8,
  },
  commentInputWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  commentInput: {
    width: '100%',
    borderRadius: 8,
    background: '#f9fafb',
    color: '#111827',
    padding: 10,
    fontSize: 13,
    border: '1px solid #e5e7eb',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  commentSubmit: {
    alignSelf: 'flex-end',
    padding: '8px 22px',
    borderRadius: 6,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  deleteBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    background: '#fef2f2',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 500,
  },
};

export default CardDetail;
