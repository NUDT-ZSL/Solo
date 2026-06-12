import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: 'unread' | 'reading' | 'read';
}

interface Note {
  id: string;
  book_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

interface Tag {
  id: string;
  name: string;
  category: 'tech' | 'literature' | 'history' | 'philosophy' | 'art' | 'general';
}

const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', category: 'general' as Tag['category'] });
  const editorRef = useRef<HTMLDivElement>(null);

  const fetchBook = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/books/${id}`);
      if (res.ok) setBook(await res.json());
    } catch { }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/books/${id}/notes`);
      if (res.ok) setNotes(await res.json());
    } catch { }
  }, [id]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) setAllTags(await res.json());
    } catch { }
  }, []);

  useEffect(() => { fetchBook(); fetchNotes(); fetchTags(); }, [fetchBook, fetchNotes, fetchTags]);

  const handleStatusChange = async (status: Book['reading_status']) => {
    if (!id) return;
    await fetch(`/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reading_status: status }),
    });
    fetchBook();
  };

  const execCommand = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setEditContent(editorRef.current.innerHTML);
    }
  };

  const startEdit = (note: Note) => {
    setEditing(note.id);
    setEditContent(note.content);
    setEditTagIds(note.tags.map(t => t.id));
    setShowNewNote(false);
  };

  const startNewNote = () => {
    if (book?.reading_status !== 'read') return;
    setShowNewNote(true);
    setNewContent('');
    setNewTagIds([]);
    setEditing(null);
  };

  const saveNote = async () => {
    if (!id) return;
    const content = editorRef.current?.innerHTML || editContent;
    if (editing) {
      await fetch(`/api/notes/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tag_ids: editTagIds }),
      });
      setEditing(null);
    } else if (showNewNote) {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: id, content, tag_ids: newTagIds }),
      });
      setShowNewNote(false);
    }
    setEditContent('');
    setNewContent('');
    fetchNotes();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('确定删除此笔记？')) return;
    await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
    if (editing === noteId) setEditing(null);
    fetchNotes();
  };

  const createTag = async () => {
    if (!tagForm.name.trim()) return;
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tagForm),
    });
    setTagForm({ name: '', category: 'general' });
    setShowTagForm(false);
    fetchTags();
  };

  const toggleTag = (tagId: string, isNew: boolean) => {
    if (isNew) {
      setNewTagIds(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
    } else {
      setEditTagIds(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
    }
  };

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

  const isEditing = editing || showNewNote;
  const currentTagIds = showNewNote ? newTagIds : editTagIds;

  if (!book) return <div className="page-container"><p>加载中...</p></div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/books')} style={{ marginBottom: 12 }}>← 返回书架</button>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            width: 120, height: 160, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg, #e8e4de, #d5d0c8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <span style={{ fontSize: 40, opacity: 0.3 }}>📖</span>}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{book.title}</h1>
            <p style={{ color: 'var(--text-light)', marginBottom: 12 }}>{book.author || '未知作者'}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-light)', marginRight: 4 }}>阅读状态：</span>
              {(['unread', 'reading', 'read'] as const).map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${book.reading_status === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleStatusChange(s)}
                >
                  {{ unread: '未读', reading: '在读', read: '已读' }[s]}
                </button>
              ))}
              {book.reading_status === 'read' && !isEditing && (
                <button className="btn btn-primary" onClick={startNewNote} style={{ marginLeft: 8 }}>＋ 新建笔记</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div style={{
          background: '#fff', borderRadius: 'var(--radius)', padding: 20,
          border: '1px solid var(--border)', marginBottom: 20,
          animation: 'scaleIn 0.3s ease',
        }}>
          <h3 style={{ marginBottom: 12, fontWeight: 600 }}>{showNewNote ? '新建笔记' : '编辑笔记'}</h3>

          <div style={{
            display: 'flex', gap: 4, marginBottom: 10, padding: '6px 8px',
            background: 'var(--bg)', borderRadius: 8, flexWrap: 'wrap',
          }}>
            <button className="btn btn-ghost btn-sm" onClick={() => execCommand('bold')} title="加粗"><b>B</b></button>
            <button className="btn btn-ghost btn-sm" onClick={() => execCommand('italic')} title="斜体"><i>I</i></button>
            <button className="btn btn-ghost btn-sm" onClick={() => execCommand('insertUnorderedList')} title="列表">☰</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = sel.toString() || '代码';
                pre.appendChild(code);
                pre.style.cssText = 'background:#f4f2ee;padding:8px;border-radius:6px;font-size:13px;overflow-x:auto;';
                range.deleteContents();
                range.insertNode(pre);
              }
            }} title="代码块">&lt;/&gt;</button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: showNewNote ? newContent : editContent }}
            onInput={() => {
              if (editorRef.current) {
                const html = editorRef.current.innerHTML;
                if (showNewNote) setNewContent(html); else setEditContent(html);
              }
            }}
            style={{
              minHeight: 160, padding: 14, border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 14, lineHeight: 1.7, outline: 'none', background: '#fff',
            }}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-light)' }}>知识点标签：</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTagForm(true)}>＋ 新标签</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allTags.map(tag => (
                <span
                  key={tag.id}
                  className={`tag-chip cat-${tag.category}`}
                  style={{ opacity: currentTagIds.includes(tag.id) ? 1 : 0.45, outline: currentTagIds.includes(tag.id) ? '2px solid var(--accent)' : 'none' }}
                  onClick={() => toggleTag(tag.id, !!showNewNote)}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => { setEditing(null); setShowNewNote(false); }}>取消</button>
            <button className="btn btn-primary" onClick={saveNote}>保存</button>
          </div>
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: 14, fontWeight: 600 }}>笔记列表 ({notes.length})</h3>
        {notes.length === 0 ? (
          <div className="empty-state"><p>暂无笔记</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(note => (
              <div key={note.id} style={{
                background: 'var(--card-bg)', backdropFilter: 'blur(6px)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', padding: 16, transition: 'box-shadow 0.3s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(44,62,80,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{note.created_at.slice(0, 16)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(note)}>编辑</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteNote(note.id)}>删除</button>
                  </div>
                </div>
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, maxHeight: 120, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                {note.tags && note.tags.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {note.tags.map(t => (
                      <span key={t.id} className={`tag-chip cat-${t.category}`}>{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showTagForm && (
        <div className="modal-overlay" onClick={() => setShowTagForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">创建新标签</h3>
            <div className="form-group">
              <label>标签名称</label>
              <input type="text" value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} placeholder="输入标签名" />
            </div>
            <div className="form-group">
              <label>主题分类</label>
              <select value={tagForm.category} onChange={e => setTagForm(f => ({ ...f, category: e.target.value as Tag['category'] }))}>
                <option value="tech">科技蓝</option>
                <option value="literature">文学绿</option>
                <option value="history">历史橙</option>
                <option value="philosophy">哲学紫</option>
                <option value="art">艺术粉</option>
                <option value="general">通用灰</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowTagForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={createTag} disabled={!tagForm.name.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
