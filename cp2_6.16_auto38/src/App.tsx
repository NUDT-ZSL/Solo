import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import ReactDOM from 'react-dom/client';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import * as prettier from 'prettier';
import type { Language, Snippet } from './api';
import {
  loadSnippets,
  addSnippet as apiAddSnippet,
  deleteSnippet as apiDeleteSnippet,
  searchSnippets,
  generateId,
} from './api';
import SnippetCard from './SnippetCard';

type ThemeMode = 'light' | 'dark';

interface AppContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const useAppContext = () => useContext(AppContext);

const LANGUAGES: Language[] = ['JavaScript', 'Python', 'HTML/CSS', 'TypeScript'];

const HLJS_LANGUAGE_MAP: Record<Language, string> = {
  JavaScript: 'javascript',
  Python: 'python',
  'HTML/CSS': 'html',
  TypeScript: 'typescript',
};

const PRETTIER_PARSER_MAP: Record<Language, string> = {
  JavaScript: 'babel',
  Python: 'python',
  'HTML/CSS': 'html',
  TypeScript: 'typescript',
};

function Sidebar() {
  const { theme } = useAppContext();
  return (
    <div style={sidebarStyles.container}>
      <div style={sidebarStyles.logo}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span style={sidebarStyles.logoText}>CodeClip</span>
      </div>
      <div style={sidebarStyles.divider} />
      <div style={sidebarStyles.section}>
        <div style={sidebarStyles.sectionTitle}>导航</div>
        <div style={sidebarStyles.navItemActive}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <span>全部片段</span>
        </div>
      </div>
      <div style={sidebarStyles.section}>
        <div style={sidebarStyles.sectionTitle}>语言分类</div>
        {LANGUAGES.map((lang) => (
          <div key={lang} style={sidebarStyles.navItem}>
            <span style={{ ...sidebarStyles.langDot, backgroundColor: getLanguageColor(lang) }} />
            <span>{lang}</span>
          </div>
        ))}
      </div>
      <div style={sidebarStyles.footer}>
        <span style={{ color: '#607d8b', fontSize: 12 }}>v1.0.0</span>
      </div>
    </div>
  );
}

function getLanguageColor(lang: Language): string {
  const map: Record<Language, string> = {
    JavaScript: '#f7df1e',
    Python: '#3572A5',
    'HTML/CSS': '#e34f26',
    TypeScript: '#3178c6',
  };
  return map[lang];
}

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (snippets: Snippet[]) => void;
}

function CreateModal({ open, onClose, onCreated }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<Language>('JavaScript');
  const [code, setCode] = useState('');

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim() || !code.trim()) return;
    const snippet: Snippet = {
      id: generateId(),
      title: title.trim(),
      language,
      code,
      createdAt: Date.now(),
    };
    const updated = apiAddSnippet(snippet);
    setTitle('');
    setLanguage('JavaScript');
    setCode('');
    onCreated(updated);
    onClose();
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <span style={modalStyles.headerTitle}>新建代码片段</span>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>标题</label>
            <input
              style={modalStyles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入片段标题..."
            />
          </div>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>语言</label>
            <select
              style={modalStyles.select}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>代码</label>
            <textarea
              style={modalStyles.textarea}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="粘贴或输入代码..."
            />
          </div>
        </div>
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose}>取消</button>
          <button style={modalStyles.saveBtn} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

interface DetailViewProps {
  snippet: Snippet;
  onClose: () => void;
  onDeleted: (snippets: Snippet[]) => void;
}

function DetailView({ snippet, onClose, onDeleted }: DetailViewProps) {
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState('');
  const [formatError, setFormatError] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = snippet.code;
      hljs.highlightElement(codeRef.current);
    }
  }, [snippet]);

  useEffect(() => {
    const formatCode = async () => {
      try {
        const parser = PRETTIER_PARSER_MAP[snippet.language];
        if (parser === 'python') {
          setFormatted(snippet.code);
          setFormatError(false);
          return;
        }
        const result = await prettier.format(snippet.code, {
          parser: parser as any,
          plugins: (prettier as any).plugins || [],
        });
        setFormatted(result);
        setFormatError(false);
      } catch {
        setFormatted(snippet.code);
        setFormatError(true);
      }
    };
    formatCode();
  }, [snippet]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleDelete = () => {
    const updated = apiDeleteSnippet(snippet.id);
    onDeleted(updated);
    onClose();
  };

  const isHtml = snippet.language === 'HTML/CSS';
  const isJson = snippet.code.trim().startsWith('{') || snippet.code.trim().startsWith('[');

  return (
    <div style={detailStyles.overlay} onClick={onClose}>
      <div style={detailStyles.container} onClick={(e) => e.stopPropagation()}>
        <div style={detailStyles.header}>
          <div style={detailStyles.titleRow}>
            <span style={detailStyles.title}>{snippet.title}</span>
            <span
              style={{
                ...detailStyles.langBadge,
                backgroundColor: getLanguageColor(snippet.language),
                color: snippet.language === 'JavaScript' ? '#333' : '#fff',
              }}
            >
              {snippet.language}
            </span>
          </div>
          <div style={detailStyles.actions}>
            <button
              style={{
                ...detailStyles.copyBtn,
                backgroundColor: copied ? '#4caf50' : '#1976d2',
              }}
              onClick={handleCopy}
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
            <button style={detailStyles.deleteBtn} onClick={handleDelete}>
              🗑 删除
            </button>
            <button style={detailStyles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={detailStyles.body}>
          <div style={detailStyles.codePanel}>
            <div style={detailStyles.panelTitle}>源代码</div>
            <pre style={detailStyles.pre}>
              <code ref={codeRef} style={detailStyles.code} />
            </pre>
          </div>
          <div style={detailStyles.previewPanel}>
            <div style={detailStyles.panelTitle}>
              预览
              {formatError && <span style={{ fontSize: 11, color: '#e53935', marginLeft: 8 }}>格式化失败，显示原文</span>}
            </div>
            {isHtml ? (
              <iframe
                style={detailStyles.iframe}
                srcDoc={snippet.code}
                title="preview"
                sandbox="allow-scripts"
              />
            ) : (
              <pre style={detailStyles.formattedPre}>{formatted}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ITEM_HEIGHT = 224;
const COLS = 3;
const GAP = 24;

function VirtualGrid({ items, onSelect }: { items: Snippet[]; onSelect: (s: Snippet) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [visibleCols, setVisibleCols] = useState(COLS);

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      setContainerHeight(containerRef.current.clientHeight);
      const w = containerRef.current.clientWidth;
      if (w < 500) setVisibleCols(1);
      else if (w < 800) setVisibleCols(2);
      else setVisibleCols(COLS);
    };
    updateLayout();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateLayout);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalRows = Math.ceil(items.length / visibleCols);
  const totalHeight = totalRows * (ITEM_HEIGHT + GAP);

  const rowStart = Math.max(0, Math.floor(scrollTop / (ITEM_HEIGHT + GAP)) - 1);
  const visibleRowLimit = Math.ceil(containerHeight / (ITEM_HEIGHT + GAP)) + 2;
  const rowEnd = Math.min(totalRows, rowStart + visibleRowLimit);

  const visibleItems: { snippet: Snippet; col: number; row: number }[] = [];
  for (let row = rowStart; row < rowEnd; row++) {
    for (let col = 0; col < visibleCols; col++) {
      const idx = row * visibleCols + col;
      if (idx < items.length) {
        visibleItems.push({ snippet: items[idx], col, row });
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ snippet, col, row }) => (
          <div
            key={snippet.id}
            style={{
              position: 'absolute',
              left: col * (280 + GAP),
              top: row * (ITEM_HEIGHT + GAP),
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <SnippetCard snippet={snippet} onClick={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    setSnippets(loadSnippets());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const filteredSnippets = useMemo(() => {
    if (!debouncedKeyword.trim()) return snippets;
    return searchSnippets(debouncedKeyword);
  }, [snippets, debouncedKeyword]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const handleCreated = useCallback((updated: Snippet[]) => {
    setSnippets(updated);
  }, []);

  const handleDeleted = useCallback((updated: Snippet[]) => {
    setSnippets(updated);
  }, []);

  const handleSelect = useCallback((snippet: Snippet) => {
    setSelectedSnippet(snippet);
  }, []);

  return (
    <AppContext.Provider value={{ theme, toggleTheme }}>
      <div style={appStyles.layout}>
        <Sidebar />
        <div style={appStyles.main}>
          <div style={appStyles.topBar}>
            <div style={appStyles.searchRow}>
              <input
                style={appStyles.searchInput}
                placeholder="搜索代码片段..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button style={appStyles.searchBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                搜索
              </button>
            </div>
            <button style={appStyles.newBtn} onClick={() => setModalOpen(true)}>
              + 新建片段
            </button>
          </div>
          <div style={appStyles.stats}>
            共 <strong>{filteredSnippets.length}</strong> 个片段
            {debouncedKeyword && (
              <span style={{ color: '#666', marginLeft: 8 }}>
                搜索 "{debouncedKeyword}" 的结果
              </span>
            )}
          </div>
          {filteredSnippets.length === 0 ? (
            <div style={appStyles.empty}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <p style={{ color: '#999', marginTop: 16, fontSize: 15 }}>
                {debouncedKeyword ? '没有找到匹配的片段' : '还没有代码片段，点击新建开始吧！'}
              </p>
            </div>
          ) : (
            <VirtualGrid items={filteredSnippets} onSelect={handleSelect} />
          )}
        </div>
      </div>
      <CreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
      {selectedSnippet && (
        <DetailView
          snippet={selectedSnippet}
          onClose={() => setSelectedSnippet(null)}
          onDeleted={handleDeleted}
        />
      )}
    </AppContext.Provider>
  );
}

const appStyles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    width: '100%',
    height: '100vh',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px 32px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    width: 400,
    height: 40,
    borderRadius: 8,
    border: '1px solid #ddd',
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  searchBtn: {
    height: 40,
    padding: '0 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  newBtn: {
    height: 40,
    padding: '0 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  stats: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const sidebarStyles: Record<string, React.CSSProperties> = {
  container: {
    width: 240,
    minWidth: 240,
    background: '#263238',
    color: '#cfd8dc',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 16px',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
  },
  divider: {
    height: 1,
    background: '#37474f',
    margin: '0 20px 16px',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    color: '#607d8b',
    padding: '0 20px',
    marginBottom: 8,
    letterSpacing: '1px',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 20px',
    color: '#fff',
    background: 'rgba(255,255,255,0.08)',
    borderLeft: '3px solid #4fc3f7',
    fontSize: 14,
    cursor: 'pointer',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 20px',
    fontSize: 14,
    color: '#b0bec5',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  langDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  footer: {
    marginTop: 'auto',
    padding: '0 20px',
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    width: 500,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'scaleIn 0.3s ease',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    fontSize: 18,
    color: '#999',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
  },
  input: {
    height: 36,
    borderRadius: 6,
    border: '1px solid #ddd',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    height: 36,
    borderRadius: 6,
    border: '1px solid #ddd',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    border: '1px solid #ddd',
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    resize: 'vertical' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid #eee',
  },
  cancelBtn: {
    padding: '8px 20px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    color: '#666',
    fontSize: 14,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 20px',
    borderRadius: 6,
    border: 'none',
    background: '#1976d2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
};

const detailStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    animation: 'fadeIn 0.2s ease',
  },
  container: {
    width: 700,
    height: 400,
    background: '#fafafa',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'scaleIn 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #e0e0e0',
    background: '#fff',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  langBadge: {
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  deleteBtn: {
    border: 'none',
    borderRadius: 6,
    backgroundColor: '#e53935',
    color: '#fff',
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    fontSize: 18,
    color: '#999',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  codePanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e0e0e0',
    overflow: 'hidden',
  },
  previewPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelTitle: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  pre: {
    flex: 1,
    overflow: 'auto',
    margin: 0,
    padding: 12,
    background: '#272822',
    fontSize: 13,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
  iframe: {
    flex: 1,
    border: 'none',
    background: '#fff',
  },
  formattedPre: {
    flex: 1,
    overflow: 'auto',
    margin: 0,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    background: '#fff',
    whiteSpace: 'pre-wrap',
  },
};

export default App;
