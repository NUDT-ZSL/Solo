import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CodeSnippet, LANGUAGES } from './types';
import { getAllSnippets, getSnippetById, addSnippet, updateSnippet, deleteSnippet, searchSnippets } from './store/db';
import Editor, { HighlightedCode } from './components/Editor';
import CardList from './components/CardList';
import { MarkdownRenderer, formatRelativeTime } from './utils';

type Page = 'home' | 'create' | 'detail' | 'share';

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

const MAX_TITLE_LENGTH = 50;
const MAX_TAG_COUNT = 5;

function TagInput({
  tags,
  onChange,
  onError,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  onError?: (msg: string) => void;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().replace(/,$/, '');
      if (!newTag) {
        setInput('');
        return;
      }
      if (tags.length >= MAX_TAG_COUNT) {
        onError?.(`标签最多${MAX_TAG_COUNT}个`);
        setInput('');
        return;
      }
      if (tags.includes(newTag)) {
        onError?.('标签已存在');
        setInput('');
        return;
      }
      onChange([...tags, newTag]);
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
      {tags.length < MAX_TAG_COUNT && (
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
  formError,
  setFormError,
}: {
  initial?: CodeSnippet;
  onSave: (snippet: CodeSnippet) => void;
  onCancel: () => void;
  formError: string;
  setFormError: (msg: string) => void;
}) {
  const [title, setTitle] = useState((initial?.title || '').slice(0, MAX_TITLE_LENGTH));
  const [language, setLanguage] = useState(initial?.language || LANGUAGES[0]);
  const [tags, setTags] = useState<string[]>((initial?.tags || []).slice(0, MAX_TAG_COUNT));
  const [code, setCode] = useState(initial?.code || '');
  const [comment, setComment] = useState(initial?.comment || '');

  const isTitleInvalid = title.length > MAX_TITLE_LENGTH || (title.trim().length === 0);
  const isTagsInvalid = tags.length > MAX_TAG_COUNT;
  const isFormValid = title.trim().length > 0 && code.trim().length > 0 && !isTagsInvalid;

  const handleSubmit = () => {
    if (title.trim().length === 0) {
      setFormError('标题不能为空');
      return;
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      setFormError(`标题不能超过${MAX_TITLE_LENGTH}字符`);
      return;
    }
    if (tags.length > MAX_TAG_COUNT) {
      setFormError(`标签最多${MAX_TAG_COUNT}个`);
      return;
    }
    if (code.trim().length === 0) {
      setFormError('代码不能为空');
      return;
    }

    const snippet: CodeSnippet = {
      id: initial?.id || uuidv4(),
      title: title.trim().slice(0, MAX_TITLE_LENGTH),
      code,
      language,
      tags: tags.slice(0, MAX_TAG_COUNT),
      comment,
      createdAt: initial?.createdAt || Date.now(),
    };
    onSave(snippet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {formError && (
        <div style={{
          padding: '10px 14px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          border: '1px solid #fecaca',
        }}>
          {formError}
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          标题 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(最多{MAX_TITLE_LENGTH}字符，当前 {title.length}/{MAX_TITLE_LENGTH})</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
          placeholder="输入代码片段标题..."
          maxLength={MAX_TITLE_LENGTH}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${isTitleInvalid && title.length > 0 ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            color: '#1e293b',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = isTitleInvalid && title.length > 0 ? '#fca5a5' : '#e2e8f0'; }}
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
          标签 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(最多{MAX_TAG_COUNT}个，当前 {tags.length}/{MAX_TAG_COUNT})</span>
        </label>
        <TagInput
          tags={tags}
          onChange={(t) => { setTags(t.slice(0, MAX_TAG_COUNT)); setFormError(''); }}
          onError={(msg) => setFormError(msg)}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          代码
        </label>
        <Editor code={code} onChange={setCode} language={language} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          Markdown 注释 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(可选，左侧编辑，右侧实时预览)</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="添加 Markdown 格式的注释...&#10;&#10;支持：&#10;# 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;```代码块```&#10;`行内代码`&#10;> 引用"
            style={{
              width: '100%',
              height: 260,
              padding: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              color: '#1e293b',
              boxSizing: 'border-box',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
            }}
          />
          <div
            style={{
              height: 260,
              padding: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: comment.trim() ? '#ffffff' : '#f8fafc',
              overflow: 'auto',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#475569',
              boxSizing: 'border-box',
            }}
          >
            {comment.trim() ? (
              <MarkdownRenderer text={comment} />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Markdown 预览区域</div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
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
            transition: 'background 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 8,
            background: !isFormValid ? '#94a3b8' : '#3b82f6',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: !isFormValid ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, transform 0.2s',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (isFormValid) {
              (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (isFormValid) {
              (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
            }
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {initial ? '保存修改' : '创建片段'}
        </button>
      </div>
    </div>
  );
}

interface SharePageProps {
  snippet: CodeSnippet | null;
  navigateTo: (hash: string) => void;
}

function SharePage({ snippet, navigateTo }: SharePageProps) {
  if (!snippet) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 20px',
        color: '#94a3b8',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>未找到该代码片段</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>该分享链接已失效或片段已被删除</div>
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
    );
  }

  return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            padding: '3px 10px',
            borderRadius: 4,
            background: '#a855f7',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 600,
          }}>
            分享片段
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
              {snippet.title}
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
                {snippet.language}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {formatRelativeTime(snippet.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {snippet.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {snippet.tags.map((tag) => (
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

        <HighlightedCode code={snippet.code} language={snippet.language} />

        {snippet.comment && (
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
            >
              <MarkdownRenderer text={snippet.comment} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareSnippet, setShareSnippet] = useState<CodeSnippet | null>(null);
  const [filterLang, setFilterLang] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ message: '', visible: false });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
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
    const handleRoute = async () => {
      const hash = window.location.hash;
      setEditModalOpen(false);
      setSelectedSnippet(null);
      setShareSnippet(null);

      if (hash.startsWith('#/share/')) {
        const id = hash.replace('#/share/', '');
        setShareId(id);
        setPage('share');
        const s = await getSnippetById(id);
        setShareSnippet(s || null);
      } else if (hash === '#/create') {
        setPage('create');
      } else if (hash.startsWith('#/detail/')) {
        const id = hash.replace('#/detail/', '');
        setSelectedId(id);
        setPage('detail');
        const s = await getSnippetById(id);
        setSelectedSnippet(s || null);
      } else {
        setPage('home');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  const handleSearch = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
  };

  const handleCreate = async (snippet: CodeSnippet) => {
    await addSnippet(snippet);
    window.location.hash = '#/';
    setFormError('');
    showToast('代码片段创建成功！');
  };

  const handleUpdate = async (snippet: CodeSnippet) => {
    await updateSnippet(snippet);
    setEditModalOpen(false);
    setSelectedSnippet(snippet);
    setFormError('');
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

  const showNavLangButtons = page === 'home';

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
          {showNavLangButtons && (
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
                    transition: 'background 0.2s, color 0.2s, transform 0.2s',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (filterLang !== lang) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0';
                    }
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    if (filterLang !== lang) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
                    }
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {lang === 'All' ? '全部' : lang}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showNavLangButtons && (
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
          {showNavLangButtons && (
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
            maxWidth: 920,
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
              formError={formError}
              setFormError={setFormError}
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
                      {formatRelativeTime(selectedSnippet.createdAt)}
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
                    onClick={() => { setEditModalOpen(true); setFormError(''); }}
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
                  >
                    <MarkdownRenderer text={selectedSnippet.comment} />
                  </div>
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

        {page === 'share' && (
          <SharePage snippet={shareSnippet} navigateTo={navigateTo} />
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
            width: 920,
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
              onCancel={() => { setEditModalOpen(false); setFormError(''); }}
              formError={formError}
              setFormError={setFormError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
