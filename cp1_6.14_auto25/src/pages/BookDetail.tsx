import { useEffect, useState, useRef, useCallback } from 'react';
import { booksApi, Book, Note, Member, MemberStatus, remindersApi } from '../api';

interface Props {
  bookId: string;
  onBack: () => void;
  onReminderPosted?: () => void;
}

const CURRENT_USER_ID = 'u1';

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function statusLabel(status: MemberStatus) {
  return status === 'unread' ? '未读' : status === 'reading' ? '在读' : '已读';
}

function initialOf(name: string) {
  return name ? name.charAt(0) : '?';
}

export default function BookDetail({ bookId, onBack, onReminderPosted }: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [quote, setQuote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [urgedMap, setUrgedMap] = useState<Record<string, boolean>>({});

  const notesStartRef = useRef<number>(0);

  const loadData = useCallback(async () => {
    notesStartRef.current = performance.now();
    const [b, n, m] = await Promise.all([
      booksApi.get(bookId),
      booksApi.getNotes(bookId),
      booksApi.getMembers(bookId),
    ]);
    setBook(b);
    setNotes(n);
    setMembers(m);
    setLoading(false);
    const elapsed = performance.now() - notesStartRef.current;
    if (elapsed > 200) {
      console.warn(`[perf] BookDetail initial load took ${elapsed.toFixed(0)}ms (>200ms)`);
    }
  }, [bookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const t0 = performance.now();
    setSubmitting(true);
    try {
      const newNote = await booksApi.addNote(bookId, {
        userId: CURRENT_USER_ID,
        content: content.trim(),
        quote: quote.trim() || undefined,
      });
      setNotes((prev) => [newNote, ...prev]);
      setContent('');
      setQuote('');
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        console.warn(`[perf] Note update took ${elapsed.toFixed(0)}ms (>100ms)`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrge = async (memberId: string) => {
    if (urgedMap[memberId]) return;
    try {
      await remindersApi.create(CURRENT_USER_ID, bookId);
      setUrgedMap((prev) => ({ ...prev, [memberId]: true }));
      onReminderPosted?.();
      setTimeout(() => {
        setUrgedMap((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }, 2000);
    } catch (_e) {
      setUrgedMap((prev) => ({ ...prev, [memberId]: true }));
      setTimeout(() => {
        setUrgedMap((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }, 2000);
    }
  };

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  if (!book) {
    return (
      <div>
        <div className="back-link" onClick={onBack}>← 返回面板</div>
        <div className="empty-state">未找到该书</div>
      </div>
    );
  }

  return (
    <div>
      <div className="back-link" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回面板
      </div>

      <div className="book-header">
        <div className="book-header-cover" style={{ background: book.coverColor }} />
        <div className="book-header-info">
          <div className="book-header-title">{book.title}</div>
          <div className="book-header-author">作者：{book.author}</div>
          <div className="book-header-progress">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${book.progress}%` }} />
            </div>
            <div className="progress-percent">{book.progress}%</div>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="notes-section">
          <div className="section-card">
            <div className="section-title">
              <span>📝</span>
              <span>阅读笔记</span>
              <span style={{ color: '#a99882', fontWeight: 500, fontSize: 13 }}>({notes.length})</span>
            </div>

            {notes.length === 0 ? (
              <div className="empty-state">还没有笔记，来写下第一条吧～</div>
            ) : (
              <div className="notes-list">
                {notes.map((note) => (
                  <div className="note-item" key={note._id}>
                    <div
                      className="note-avatar"
                      style={{ background: note.userAvatarColor }}
                    >
                      {initialOf(note.userName)}
                    </div>
                    <div className="note-body">
                      <div className="note-meta">
                        <span className="note-username">{note.userName}</span>
                        <span className="note-date">{formatDate(note.createdAt)}</span>
                      </div>
                      <div className="note-content">{note.content}</div>
                      {note.quote && note.quote.trim() && (
                        <div className="note-quote">“{note.quote}”</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="note-form" style={{ marginTop: 0, boxShadow: 'none', padding: 0 }}>
              <div className="form-title">✍️ 写下新笔记</div>
              <textarea
                className="textarea-main"
                placeholder="记录此刻的阅读感想..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <textarea
                className="textarea-quote"
                placeholder="摘抄一段打动你的文字（可选）..."
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
              <div className="form-actions">
                <button
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? '提交中...' : '发布笔记'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="members-section">
          <div className="section-card">
            <div className="section-title">
              <span>👥</span>
              <span>共读成员</span>
              <span style={{ color: '#a99882', fontWeight: 500, fontSize: 13 }}>({members.length})</span>
            </div>
            <div className="members-list">
              {members.map((m) => {
                const status: MemberStatus = (m.status as MemberStatus) || 'unread';
                const isSelf = m._id === CURRENT_USER_ID;
                const urged = urgedMap[m._id];
                return (
                  <div className="member-item" key={m._id}>
                    <div className="member-avatar" style={{ background: m.avatarColor }}>
                      {initialOf(m.nickname)}
                    </div>
                    <div className="member-info">
                      <div className="member-name">
                        {m.nickname}
                        {isSelf && <span style={{ color: '#a99882', fontWeight: 400, marginLeft: 4, fontSize: 12 }}>(我)</span>}
                      </div>
                      <span className={`status-tag ${status}`}>{statusLabel(status)}</span>
                    </div>
                    <button
                      className="btn-urge"
                      onClick={() => handleUrge(m._id)}
                      disabled={isSelf || urged}
                    >
                      {urged ? '已催' : '催更'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
