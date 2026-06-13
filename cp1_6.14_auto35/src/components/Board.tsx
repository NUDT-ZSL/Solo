import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchCards,
  createCard,
  updateCard,
  fetchUsers,
} from '../api';
import type { Card, ColumnType, Priority, Tag, User } from '../types';

interface BoardProps {
  projectId: string;
  currentUser: User;
  onSelectCard: (card: Card) => void;
}

const COLUMN_CONFIG: { key: ColumnType; title: string }[] = [
  { key: 'todo', title: '待办 To Do' },
  { key: 'inProgress', title: '进行中 In Progress' },
  { key: 'done', title: '已完成 Done' },
];

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

function Board({ projectId, currentUser, onSelectCard }: BoardProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverCol, setHoverCol] = useState<ColumnType | null>(null);
  const [addingColumn, setAddingColumn] = useState<ColumnType | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTags, setNewTags] = useState<Tag[]>([]);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragCardEl = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    const [cardsRes, usersRes] = await Promise.all([
      fetchCards(projectId),
      fetchUsers(),
    ]);
    if (cardsRes.code === 0) setCards(cardsRes.data);
    if (usersRes.code === 0) setUsers(usersRes.data);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUser = (id: string | null) => users.find((u) => u.id === id) || null;

  const onCardMouseDown = (e: React.MouseEvent, card: Card) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggingId(card.id);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX, y: e.clientY });
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!draggingId) return;

    const onMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      const cols = document.querySelectorAll('[data-column]');
      let found: ColumnType | null = null;
      cols.forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          found = (el as HTMLElement).dataset.column as ColumnType;
        }
      });
      setHoverCol(found);
    };

    const onUp = async () => {
      const id = draggingId;
      const targetCol = hoverCol;
      setDraggingId(null);
      setHoverCol(null);
      if (id && targetCol) {
        const card = cards.find((c) => c.id === id);
        if (card && card.column !== targetCol) {
          const res = await updateCard(id, { column: targetCol });
          if (res.code === 0 && res.data) {
            setCards((prev) =>
              prev.map((c) => (c.id === id ? (res.data as Card) : c))
            );
          }
        }
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingId, hoverCol, cards]);

  const handleCreateCard = async () => {
    if (!addingColumn || !newTitle.trim()) return;
    const res = await createCard({
      projectId,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      assigneeId: currentUser.id,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      tags: newTags,
    });
    if (res.code === 0 && res.data) {
      setCards((prev) => [...prev, res.data as Card]);
    }
    resetForm();
  };

  const resetForm = () => {
    setAddingColumn(null);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewDueDate('');
    setNewTags([]);
    setNewTagInput('');
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
    const color = palette[newTags.length % palette.length];
    setNewTags([...newTags, { name, color }]);
    setNewTagInput('');
  };

  const removeTag = (idx: number) => {
    setNewTags(newTags.filter((_, i) => i !== idx));
  };

  const getColCards = (col: ColumnType) =>
    cards.filter((c) => c.column === col);

  const draggingCard = draggingId ? cards.find((c) => c.id === draggingId) : null;

  return (
    <div style={styles.container}>
      <div style={styles.board}>
        {COLUMN_CONFIG.map((col) => {
          const colCards = getColCards(col.key);
          const isHover = hoverCol === col.key;
          return (
            <div
              key={col.key}
              data-column={col.key}
              style={{
                ...styles.column,
                ...(isHover ? styles.columnHover : {}),
              }}
            >
              <div style={styles.columnHeader}>
                <div style={styles.columnTitle}>{col.title}</div>
                <div style={styles.columnCount}>{colCards.length}</div>
                <button
                  data-no-drag
                  style={styles.addBtn}
                  onClick={() => {
                    setAddingColumn(col.key);
                    setNewTitle('');
                    setNewDesc('');
                    setNewPriority('medium');
                    setNewDueDate('');
                    setNewTags([]);
                  }}
                >
                  ＋
                </button>
              </div>

              <div style={styles.columnBody}>
                {addingColumn === col.key && (
                  <div data-no-drag style={styles.addCardForm}>
                    <input
                      style={styles.formInput}
                      placeholder="任务标题 *"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      style={styles.formTextarea}
                      placeholder="任务描述"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                    <div style={styles.formRow}>
                      <select
                        style={styles.formSelect}
                        value={newPriority}
                        onChange={(e) =>
                          setNewPriority(e.target.value as Priority)
                        }
                      >
                        <option value="urgent">紧急</option>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                      <input
                        style={styles.formInput}
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <input
                        style={styles.formInput}
                        placeholder="标签名称，回车添加"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <button style={styles.tagAddBtn} onClick={addTag}>
                        添加
                      </button>
                    </div>
                    {newTags.length > 0 && (
                      <div style={styles.tagPreview}>
                        {newTags.map((t, i) => (
                          <span
                            key={i}
                            style={{
                              ...styles.tag,
                              background: t.color + '33',
                              borderColor: t.color,
                              color: t.color,
                            }}
                          >
                            {t.name}
                            <span
                              style={styles.tagRemove}
                              onClick={() => removeTag(i)}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={styles.formActions}>
                      <button style={styles.formCancel} onClick={resetForm}>
                        取消
                      </button>
                      <button style={styles.formSubmit} onClick={handleCreateCard}>
                        创建
                      </button>
                    </div>
                  </div>
                )}

                {colCards.map((card) => {
                  if (card.id === draggingId) return null;
                  const assignee = getUser(card.assigneeId);
                  return (
                    <div
                      key={card.id}
                      ref={(el) => {
                        if (card.id === draggingId) dragCardEl.current = el;
                      }}
                      style={styles.card}
                      onMouseDown={(e) => onCardMouseDown(e, card)}
                      onClick={() => onSelectCard(card)}
                    >
                      <div
                        style={{
                          ...styles.priorityBar,
                          background: PRIORITY_COLORS[card.priority],
                        }}
                      />
                      <div style={styles.cardInner}>
                        <div style={styles.cardTitleRow}>
                          <div style={styles.cardTitle}>{card.title}</div>
                          <span
                            style={{
                              ...styles.priorityBadge,
                              background:
                                PRIORITY_COLORS[card.priority] + '22',
                              color: PRIORITY_COLORS[card.priority],
                              borderColor: PRIORITY_COLORS[card.priority],
                            }}
                          >
                            {PRIORITY_LABELS[card.priority]}
                          </span>
                        </div>
                        {card.description && (
                          <div style={styles.cardDesc}>
                            {card.description.length > 80
                              ? card.description.slice(0, 80) + '...'
                              : card.description}
                          </div>
                        )}
                        {card.tags.length > 0 && (
                          <div style={styles.cardTags}>
                            {card.tags.map((t, i) => (
                              <span
                                key={i}
                                style={{
                                  ...styles.tag,
                                  background: t.color + '33',
                                  borderColor: t.color,
                                  color: t.color,
                                }}
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={styles.cardFooter}>
                          {card.dueDate && (
                            <div style={styles.dueDate}>
                              📅 {card.dueDate}
                            </div>
                          )}
                          {assignee && (
                            <div
                              style={{
                                ...styles.assigneeAvatar,
                                background: colorForName(assignee.nickname),
                              }}
                              title={assignee.nickname}
                            >
                              {assignee.avatar}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {draggingCard && (
        <div
          style={{
            position: 'fixed',
            left: dragPos.x - dragOffset.x,
            top: dragPos.y - dragOffset.y,
            width: dragCardEl.current?.offsetWidth || 260,
            zIndex: 9999,
            pointerEvents: 'none',
            transform: 'rotate(2deg)',
            opacity: 0.9,
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={styles.card}>
            <div
              style={{
                ...styles.priorityBar,
                background: PRIORITY_COLORS[draggingCard.priority],
              }}
            />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{draggingCard.title}</div>
            </div>
          </div>
        </div>
      )}
    </div>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '24px 24px 32px',
  },
  board: {
    display: 'flex',
    gap: 16,
    height: '100%',
    minWidth: 'min-content',
  },
  column: {
    flex: '0 0 auto',
    minWidth: 300,
    width: 320,
    background: '#2a2a3e',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
    transition: 'background 0.2s',
  },
  columnHover: {
    background: '#343452',
    boxShadow: 'inset 0 0 0 2px #3b82f655',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 16px 12px',
    borderBottom: '1px solid #31314a',
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  columnCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    background: '#31314a',
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#31314a',
    color: '#9ca3af',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  columnBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: '#31314a',
    borderRadius: 8,
    overflow: 'hidden',
    cursor: 'grab',
    userSelect: 'none',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  priorityBar: {
    height: 3,
    width: '100%',
  },
  cardInner: {
    padding: 12,
  },
  cardTitleRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    lineHeight: 1.4,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid',
    flexShrink: 0,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 1.5,
    marginBottom: 10,
  },
  cardTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 10,
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  tagRemove: {
    cursor: 'pointer',
    fontSize: 13,
    lineHeight: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
  },
  addCardForm: {
    background: '#31314a',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  formInput: {
    width: '100%',
    height: 36,
    borderRadius: 6,
    background: '#1e1e2e',
    color: '#fff',
    padding: '0 10px',
    fontSize: 13,
  },
  formTextarea: {
    width: '100%',
    minHeight: 60,
    borderRadius: 6,
    background: '#1e1e2e',
    color: '#fff',
    padding: 10,
    fontSize: 13,
    resize: 'vertical',
  },
  formRow: {
    display: 'flex',
    gap: 8,
  },
  formSelect: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    background: '#1e1e2e',
    color: '#fff',
    padding: '0 10px',
    fontSize: 13,
    border: 'none',
    outline: 'none',
  },
  tagAddBtn: {
    height: 36,
    padding: '0 14px',
    borderRadius: 6,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 12,
    flexShrink: 0,
  },
  tagPreview: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  formActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  formCancel: {
    height: 34,
    padding: '0 16px',
    borderRadius: 6,
    background: '#4b5563',
    color: '#fff',
    fontSize: 13,
  },
  formSubmit: {
    height: 34,
    padding: '0 16px',
    borderRadius: 6,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
  },
};

export default Board;
