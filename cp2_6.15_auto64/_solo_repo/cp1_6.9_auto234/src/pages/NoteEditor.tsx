import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { noteApi } from '../api';
import { useToast } from '../context/ToastContext';
import { saveDraft, loadDraft, clearDraft, getTagColor } from '../utils';

const PREDEFINED_TAGS = ['工作', '学习', '生活', '灵感', '待办'];
const MAX_TITLE_LENGTH = 30;
const MAX_TAGS = 3;
const AUTO_SAVE_INTERVAL = 30000;

const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const noteParamId = id || 'new';
  const isNew = noteParamId === 'new';
  const [loading, setLoading] = useState(true);
  const [noteId, setNoteId] = useState<string>(isNew ? '' : noteParamId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveLock = useRef(false);

  const fetchNote = useCallback(async () => {
    if (isNew) {
      const draftKey = 'new';
      const draft = loadDraft(draftKey);
      if (draft) {
        setTitle(draft.title);
        setContent(draft.content);
        setDraftRecovered(true);
        if (textareaRef.current) {
          try {
            textareaRef.current.setSelectionRange(draft.cursorPosition, draft.cursorPosition);
          } catch {}
        }
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await noteApi.getNote(noteParamId);
      const note = res.data.note;

      const draft = loadDraft(note.id);
      if (draft && new Date(draft.savedAt).getTime() > new Date(note.updatedAt).getTime()) {
        setTitle(draft.title);
        setContent(draft.content);
        setDraftRecovered(true);
        if (textareaRef.current) {
          try {
            textareaRef.current.setSelectionRange(draft.cursorPosition, draft.cursorPosition);
          } catch {}
        }
        showToast('已恢复最新草稿', 'info');
      } else {
        setTitle(note.title);
        setContent(note.content);
        setTags(note.tags || []);
      }
      setNoteId(note.id);
    } catch (err) {
      console.error('加载笔记失败:', err);
      showToast('加载笔记失败', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [noteParamId, isNew, navigate, showToast]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const saveToServer = useCallback(async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);

    try {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const data = {
        title: title || '无标题笔记',
        content,
        tags,
        cursorPosition: cursorPos
      };

      if (isNew && !noteId) {
        const res = await noteApi.createNote(data);
        setNoteId(res.data.note.id);
        clearDraft('new');
      } else if (noteId) {
        await noteApi.updateNote(noteId, data);
        clearDraft(noteId);
      }

      setLastSavedAt(new Date());
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败，已保存至本地草稿', 'error');
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  }, [title, content, tags, isNew, noteId, showToast]);

  useEffect(() => {
    if (loading) return;

    autoSaveTimer.current = setInterval(() => {
      if (title || content) {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        saveDraft(noteId || 'new', { title, content, cursorPosition: cursorPos });
        saveToServer();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [loading, title, content, noteId, saveToServer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (title || content) {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        saveDraft(noteId || 'new', { title, content, cursorPosition: cursorPos });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, content, noteId]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_TITLE_LENGTH) {
      setTitle(val);
    }
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const insertFormat = useCallback(
    (type: 'bold' | 'italic' | 'list' | 'code' | 'h1' | 'h2' | 'h3') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end) || '';
      let prefix = '';
      let suffix = '';
      let insertText = '';

      switch (type) {
        case 'bold':
          prefix = '**';
          suffix = '**';
          break;
        case 'italic':
          prefix = '*';
          suffix = '*';
          break;
        case 'code':
          prefix = '`';
          suffix = '`';
          break;
        case 'list':
          insertText = '\n- ';
          break;
        case 'h1':
          insertText = '\n# ';
          break;
        case 'h2':
          insertText = '\n## ';
          break;
        case 'h3':
          insertText = '\n### ';
          break;
      }

      let newContent: string;
      let newCursor: number;

      if (prefix || suffix) {
        newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
        newCursor = start + prefix.length + selected.length;
      } else {
        newContent = content.slice(0, start) + insertText + selected + content.slice(end);
        newCursor = start + insertText.length + selected.length;
      }

      setContent(newContent);
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newCursor, newCursor);
        }
      });
    },
    [content]
  );

  const toggleTag = useCallback(
    (tag: string) => {
      setTags(prev => {
        if (prev.includes(tag)) {
          return prev.filter(t => t !== tag);
        }
        if (prev.length >= MAX_TAGS) {
          showToast(`最多添加 ${MAX_TAGS} 个标签`, 'info');
          return prev;
        }
        return [...prev, tag];
      });
    },
    [showToast]
  );

  const handleSaveClick = useCallback(async () => {
    if (!title && !content) {
      showToast('笔记内容为空', 'info');
      return;
    }
    await saveToServer();
    showToast('保存成功');
  }, [title, content, saveToServer, showToast]);

  const handleBack = useCallback(async () => {
    if (title || content) {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      saveDraft(noteId || 'new', { title, content, cursorPosition: cursorPos });
      await saveToServer();
    }
    navigate('/');
  }, [title, content, noteId, saveToServer, navigate]);

  const saveStatusText = useMemo(() => {
    if (saving) return '保存中...';
    if (lastSavedAt) {
      const diff = (Date.now() - lastSavedAt.getTime()) / 1000;
      if (diff < 60) return '刚刚保存';
      if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前保存`;
      return '已保存';
    }
    if (draftRecovered) return '已恢复草稿';
    return '尚未保存';
  }, [saving, lastSavedAt, draftRecovered]);

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={handleBack}>
          <span>←</span> 返回
        </button>
        <div className="editor-save-status">
          <span className={`status-dot ${saving ? 'saving' : 'saved'}`}></span>
          <span className="status-text">{saveStatusText}</span>
        </div>
        <button
          className={`save-btn ${saving ? 'saving' : ''}`}
          onClick={handleSaveClick}
          disabled={saving}
        >
          {saving ? '保存中...' : '✓ 保存'}
        </button>
      </div>

      <div className="tags-editor">
        <span className="tags-label">标签：</span>
        <div className="tags-selector">
          {PREDEFINED_TAGS.map(tag => {
            const colors = getTagColor(tag);
            const isActive = tags.includes(tag);
            return (
              <button
                key={tag}
                className={`tag-selector-btn ${isActive ? 'active' : ''}`}
                style={
                  isActive
                    ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.text }
                    : undefined
                }
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <span className="tags-hint">已选 {tags.length}/{MAX_TAGS}</span>
      </div>

      <div className="editor-toolbar">
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('bold')}
          title="加粗 (**文本**)"
        >
          <span className="toolbar-icon-bold">B</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('italic')}
          title="斜体 (*文本*)"
        >
          <span className="toolbar-icon-italic">I</span>
        </button>
        <div className="toolbar-divider"></div>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('h1')}
          title="一级标题 (# )"
        >
          <span className="toolbar-icon-h">H1</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('h2')}
          title="二级标题 (## )"
        >
          <span className="toolbar-icon-h">H2</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('h3')}
          title="三级标题 (### )"
        >
          <span className="toolbar-icon-h">H3</span>
        </button>
        <div className="toolbar-divider"></div>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('list')}
          title="无序列表 (- )"
        >
          <span className="toolbar-icon-list">≡</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => insertFormat('code')}
          title="行内代码 (`文本`)"
        >
          <span className="toolbar-icon-code">{`</>`}</span>
        </button>
      </div>

      <div className="editor-paper">
        <input
          type="text"
          className="editor-title-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="标题（最多30字）"
          maxLength={MAX_TITLE_LENGTH}
        />
        <div className="title-counter">
          {title.length}/{MAX_TITLE_LENGTH}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-content"
          value={content}
          onChange={handleContentChange}
          placeholder="开始记录你的想法...&#10;&#10;支持 Markdown 语法：&#10;# 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;`代码`"
        />
      </div>
    </div>
  );
};

export default NoteEditor;
