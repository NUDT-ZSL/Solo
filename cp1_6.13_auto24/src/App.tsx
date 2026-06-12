import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CodeSnippet, LANGUAGES } from './types';
import { getAllSnippets, getSnippetById, addSnippet, updateSnippet, deleteSnippet, searchSnippets } from './store/db';
import Editor, { HighlightedCode } from './components/Editor';
import CardList from './components/CardList';

type Page = 'home' | 'create' | 'detail';

function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;margin:8px 0"><code>${code}</code></pre>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;color:#7c3aed">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:12px 0 6px;color:#1e293b">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:14px 0 8px;color:#1e293b">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;margin:16px 0 8px;color:#1e293b">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^[-*] (.+)$/gm, '<li style="margin-left:20px;list-style:disc;color:#475569">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;list-style:decimal;color:#475569">$1</li>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding-left:12px;color:#64748b;margin:8px 0">$1</blockquote>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#3b82f6;text-decoration:underline" target="_blank">$1</a>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      background: '#22c55e',
      color: '#ffffff',
      padding: '10px 20px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      zIndex: 10000,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-10px)',
      transition: 'opacity 0.3s, transform 0.3s',
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
    }}>
      {message}
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().replace(/,$/, '');
      if (newTag && tags.length < 5 && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      padding: '8px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      background: '#ffffff',
      minHeight: 42,
      alignItems: 'center',
    }}>
      {tags.map((tag) => (
        <span key={tag} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 10px',
          borderRadius: 999,
          background: '#e2e8f0',
          color: '#334155',
          fontSize: 13,
          fontWeight: 500,
        }}>
          {tag}
          <span
            onClick={() => removeTag(tag)}
            style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, color: '#94a3b8' }}
          >
            ×
          </span>
        </span>
      ))}
      {tags.length < 5 && (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? '输入标签，按回车或逗号添加' : ''}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: 13,
            flex: 1,
            minWidth: 120,
            color: '#1e293b',
            background: 'transparent',
          }}
        />
      )}
    </div>
  );
}

function SnippetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CodeSnippet;
  onSave: (snippet: CodeSnippet) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [language, setLanguage] = useState(initial?.language || LANGUAGES[0]);
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [code, setCode] = useState(initial?.code || '');
  const [comment, setComment] = useState(initial?.comment || '');
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !code.trim()) return;
    const snippet: CodeSnippet = {
      id: initial?.id || uuidv4(),
      title: title.trim().slice(0, 50),
      code,
      language,
      tags,
      comment,
      createdAt: initial?.createdAt || Date.now(),
    };
    onSave(snippet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          标题 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(最多50字符)</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
          placeholder="输入代码片段标题..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            color: '#1e293b',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'; }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          语言
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            color: '#1e293b',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          标签 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(最多5个)</span>
        </label>
        <TagInput tags={tags} onChange={setTags} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          代码
        </label>
        <Editor code={code} onChange={setCode} language={language} />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Markdown 注释 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(可选)</span>
          </label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              border: 'none',
              background: 'none',
              fontSize: 12,
              color: '#3b82f6',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            {showPreview ? '编辑' : '预览'}
          </button>
        </div>
        {showPreview ? (
          <div
            style={{
              minHeight: 100,
              padding: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#ffffff',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#475569',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(comment) }}
          />
        ) : (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="添加 Markdown 格式的注释..."
            style={{
              width: '100%',
              minHeight: 100,
              padding: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              color: '#1e293b',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 24px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#ffffff',
            color: '#475569',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !code.trim()}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 8,
            background: (!title.trim() || !code.trim()) ? '#94a3b8' : '#3b82f6',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: (!title.trim() || !code.trim()) ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {initial ? '保存修改' : '创建片段'}
        </button>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [filterLang, setFilterLang] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ message: '', visible: false });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2000);
  }, []);

  const loadSnippets = useCallback(async () => {
    const data = await searchSnippets(searchQuery, filterLang === 'All' ? undefined : filterLang);
    setSnippets(data);
  }, [searchQuery, filterLang]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/share/')) {
        const id = hash.replace('#/share/', '');
        setSelectedId(id);
        setPage('detail');
      } else if (hash === '#/create') {
        setPage('create');
      } else if (hash.startsWith('#/detail/')) {
        const id = hash.replace('#/detail/', '');
        setSelectedId(id);
        setPage('detail');
      } else {
        setPage('home');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  useEffect(() => {
    if (page === 'detail' && selectedId) {
      getSnippetById(selectedId).then((s) => setSelectedSnippet(s || null));
    }
  }, [page, selectedId]);

  const handleSearch = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
  };

  const handleCreate = async (snippet: CodeSnippet) => {
    await addSnippet(snippet);
    window.location.hash = '#/';
    showToast('代码片段创建成功！');
  };

  const handleUpdate = async (snippet: CodeSnippet) => {
    await updateSnippet(snippet);
    setEditModalOpen(false);
    setSelectedSnippet(snippet);
    loadSnippets();
    showToast('代码片段已更新！');
  };

  const handleDelete = async (id: string) => {
    await deleteSnippet(id);
    window.location.hash = '#/';
    showToast('代码片段已删除！');
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/share/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('分享链接已复制到剪贴板！');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('分享链接已复制到剪贴板！');
    });
  };

  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <Toast message={toast.message} visible={toast.visible} />
      
      <nav style={{
        height: 56,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            onClick={() => navigateTo('#/')}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1e293b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            CodeFlow
          </div>
          {page === 'home' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', ...LANGUAGES].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setFilterLang(lang)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 8,
                    background: filterLang === lang ? '#3b82f6' : '#f1f5f9',
                    color: filterLang === lang ? '#ffffff' : '#475569',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {lang === 'All' ? '全部' : lang}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {page === 'home' && (
            <input
              placeholder="搜索标题或标签..."
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: 240,
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                color: '#1e293b',
                background: '#f8fafc',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'; }}
            />
          )}
          {page === 'home' && (
            <button
              onClick={() => navigateTo('#/create')}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: 8,
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建
            </button>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>
        {page === 'home' && (
          <CardList
            snippets={snippets}
            onCardClick={(id) => navigateTo(`#/detail/${id}`)}
            onShare={handleShare}
          />
        )}

        {page === 'create' && (
          <div style={{
            maxWidth: 720,
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
              创建代码片段
            </h2>
            <SnippetForm
              onSave={handleCreate}
              onCancel={() => navigateTo('#/')}
            />
          </div>
        )}

        {page === 'detail' && selectedSnippet && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <button
              onClick={() => navigateTo('#/')}
              style={{
                border: 'none',
                background: 'none',
                color: '#3b82f6',
                fontSize: 14,
                cursor: 'pointer',
                padding: '4px 0',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 500,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              返回列表
            </button>
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 28,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
                    {selectedSnippet.title}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 4,
                      background: '#3b82f6',
                      color: '#ffffff',
                    }}>
                      {selectedSnippet.language}
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(selectedSnippet.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleShare(selectedSnippet.id)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    分享
                  </button>
                  <button
                    onClick={() => setEditModalOpen(true)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('确定删除此代码片段？')) {
                        handleDelete(selectedSnippet.id);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      background: '#ffffff',
                      color: '#ef4444',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>

              {selectedSnippet.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {selectedSnippet.tags.map((tag) => (
                    <span key={tag} style={{
                      padding: '3px 12px',
                      borderRadius: 999,
                      background: '#e2e8f0',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <HighlightedCode code={selectedSnippet.code} language={selectedSnippet.language} />

              {selectedSnippet.comment && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 8 }}>注释</h3>
                  <div
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: '#475569',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedSnippet.comment) }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {page === 'detail' && !selectedSnippet && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#94a3b8',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>未找到该代码片段</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>该片段可能已被删除</div>
            <button
              onClick={() => navigateTo('#/')}
              style={{
                marginTop: 16,
                padding: '8px 20px',
                border: 'none',
                borderRadius: 8,
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              返回首页
            </button>
          </div>
        )}
      </main>

      {editModalOpen && selectedSnippet && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#00000066',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false);
          }}
        >
          <div style={{
            width: 700,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            background: '#ffffff',
            borderRadius: 16,
            padding: 32,
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
              编辑代码片段
            </h2>
            <SnippetForm
              initial={selectedSnippet}
              onSave={handleUpdate}
              onCancel={() => setEditModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
