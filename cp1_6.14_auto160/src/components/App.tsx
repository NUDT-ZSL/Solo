import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CodeTokenizer, type Language, type Token } from '../modules/tokenizer';
import { SnapshotRenderer, themes, type ThemeConfig } from '../modules/renderer';
import { eventBus } from '../modules/eventBus';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

const DEFAULT_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 Fibonacci numbers
const results = [];
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i));
}

console.log("Fibonacci:", results);`;

const TOKEN_COLORS: Record<string, (theme: ThemeConfig) => string> = {
  keyword: (t) => t.keywordColor,
  string: (t) => t.stringColor,
  comment: (t) => t.commentColor,
  number: (t) => t.numberColor,
  function: (t) => t.functionColor,
  operator: (t) => t.operatorColor,
  tag: (t) => t.tagColor,
  attribute: (t) => t.attributeColor,
  selector: (t) => t.selectorColor,
  property: (t) => t.propertyColor,
  value: (t) => t.valueColor,
  type: (t) => t.typeColor,
  decorator: (t) => t.decoratorColor,
  plain: (t) => t.textColor,
  punctuation: (t) => t.textColor,
};

function renderTokenSpan(token: Token, theme: ThemeConfig, key: string): React.ReactNode {
  const colorFn = TOKEN_COLORS[token.type];
  const color = colorFn ? colorFn(theme) : theme.textColor;
  return (
    <span key={key} style={{ color }}>
      {token.value}
    </span>
  );
}

interface ToastProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'info' | 'error';
}

function Toast({ message, visible, type = 'success' }: ToastProps) {
  if (!visible) return null;
  const bg =
    type === 'success' ? '#a6e3a1' : type === 'error' ? '#f38ba8' : '#89b4fa';
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bg,
        color: '#1e1e2e',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        zIndex: 2000,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        animation: 'pp-toast-in 0.25s ease',
      }}
      className="pp-toast"
    >
      {message}
    </div>
  );
}

interface ShareModalProps {
  url: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

function ShareModal({ url, onClose, onToast }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      onToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url, onToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={styles.modalOverlay} onClick={onClose} className="pp-modal-overlay">
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="pp-modal-content">
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>
          Share Link Generated
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#a6adc8' }}>
          Copy this link to share your code screenshot
        </p>
        <div style={styles.urlBox}>
          <span style={{ fontSize: '12px', wordBreak: 'break-all', color: '#89b4fa' }}>
            {url}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button style={styles.modalButton} onClick={handleCopy} className="pp-btn">
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button
            style={{ ...styles.modalButton, background: '#45475a', color: '#cdd6f4' }}
            onClick={onClose}
            className="pp-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<Language>('javascript');
  const [themeIndex, setThemeIndex] = useState(0);
  const [tokenLines, setTokenLines] = useState<Token[][]>([]);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showHeader, setShowHeader] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as const });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTheme = themes[themeIndex];
  const totalThemes = themes.length;
  const themeLabel = `${themeIndex + 1}/${totalThemes} ${currentTheme.name}`;

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000);
  }, []);

  const processCode = useCallback(
    async (text: string, lang: Language) => {
      if (!text.trim()) {
        setTokenLines([]);
        return;
      }

      setLoading(true);
      eventBus.emit('render:start');

      try {
        const lines = text.split('\n');
        let tokens: Token[][];

        if (lines.length > 300) {
          tokens = await CodeTokenizer.tokenizeAsync(text, lang);
        } else {
          tokens = CodeTokenizer.tokenize(text, lang);
        }

        setTokenLines(tokens);

        const cfg = {
          theme: themes[themeIndex],
          language: lang,
          showHeader,
          showLineNumbers: true,
        };

        let canvas: HTMLCanvasElement;
        if (lines.length > 300) {
          canvas = await SnapshotRenderer.renderAsync(tokens, cfg);
        } else {
          canvas = SnapshotRenderer.render(tokens, cfg);
        }

        canvasRef.current = canvas;
        eventBus.emit('render:complete', canvas);
      } catch (err) {
        console.error('Render error:', err);
        eventBus.emit('render:error', err);
        showToast('Render failed', 'error');
      } finally {
        setLoading(false);
      }
    },
    [themeIndex, showHeader, showToast]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      processCode(code, language);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, language, processCode]);

  const handleDownloadPng = useCallback(() => {
    if (canvasRef.current) {
      SnapshotRenderer.downloadAsPng(canvasRef.current);
      showToast('PNG downloaded!');
      eventBus.emit('action:download');
    }
  }, [showToast]);

  const handleCopyClipboard = useCallback(async () => {
    if (canvasRef.current) {
      const success = await SnapshotRenderer.copyToClipboard(canvasRef.current);
      if (success) {
        showToast('Image copied to clipboard!');
      } else {
        showToast('Failed to copy image', 'error');
      }
      eventBus.emit('action:clipboard', success);
    }
  }, [showToast]);

  const handleThemeSwitch = useCallback(() => {
    setThemeIndex((prev) => (prev + 1) % themes.length);
    eventBus.emit('action:theme-switch');
  }, []);

  const handleShare = useCallback(() => {
    const url = SnapshotRenderer.generateShareLink(code, language, themeIndex);
    setShareUrl(url);
    setShowShareModal(true);
    eventBus.emit('action:share', url);
  }, [code, language, themeIndex]);

  const handleLoadFromHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const payload = JSON.parse(atob(hash.slice(7)));
        const decodedCode = decodeURIComponent(atob(payload.c));
        setCode(decodedCode);
        setLanguage(payload.l);
        setThemeIndex(payload.t || 0);
      } catch {
        // invalid hash
      }
    }
  }, []);

  useEffect(() => {
    handleLoadFromHash();
  }, [handleLoadFromHash]);

  const lineCount = code.split('\n').length;

  return (
    <div style={styles.app} className="pp-app">
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />

      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={{ fontSize: '24px', marginRight: '8px' }}>📸</span>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            PixelProof
          </h1>
        </div>
        <span style={{ fontSize: '12px', color: '#6c7086' }}>
          Beautiful code screenshots in seconds
        </span>
      </header>

      <div style={styles.main} className="layoutHorizontal">
        <div style={styles.leftPanel} className="panelLeft">
          <div style={styles.editorContainer}>
            <div style={styles.editorHeader}>
              <div style={styles.windowDots}>
                <span style={{ ...styles.dot, background: '#f38ba8' }} />
                <span style={{ ...styles.dot, background: '#f9e2af' }} />
                <span style={{ ...styles.dot, background: '#a6e3a1' }} />
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                style={styles.langSelect}
                className="pp-lang-select"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.editorWrapper}>
              <div style={styles.lineNumbers}>
                {code.split('\n').map((_, i) => (
                  <div key={i} style={styles.lineNumber}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={styles.textarea}
                spellCheck={false}
                placeholder="Paste or type your code here..."
              />
            </div>
          </div>

          <div style={styles.toolbar}>
            <button style={styles.actionBtn} onClick={handleDownloadPng} className="pp-btn">
              ⬇ Download PNG
            </button>
            <button style={styles.actionBtn} onClick={handleCopyClipboard} className="pp-btn">
              📋 Copy Image
            </button>
            <button
              style={styles.actionBtn}
              onClick={handleThemeSwitch}
              className="pp-btn pp-theme-btn"
            >
              🎨 {themeLabel}
            </button>
            <button style={styles.actionBtn} onClick={handleShare} className="pp-btn">
              🔗 Share
            </button>
          </div>

          <div style={styles.options}>
            <label style={styles.optionLabel}>
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
                style={{ marginRight: '6px', accentColor: '#cba6f7' }}
              />
              Show language header
            </label>
            <span style={styles.lineCount}>{lineCount} lines</span>
          </div>
        </div>

        <div style={styles.rightPanel} className="panelRight">
          <div style={styles.previewLabel}>Preview</div>
          <div ref={previewRef} style={styles.previewArea}>
            {loading && (
              <div style={styles.spinnerOverlay}>
                <div style={styles.spinner} />
                <span style={{ marginLeft: '10px', color: '#6c7086', fontSize: '13px' }}>
                  Rendering...
                </span>
              </div>
            )}
            {!loading && tokenLines.length > 0 && (
              <div
                style={{
                  ...styles.previewCard,
                  background: `linear-gradient(135deg, ${currentTheme.gradient.join(', ')})`,
                }}
              >
                {showHeader && (
                  <div style={styles.previewHeader}>
                    <span style={{ color: currentTheme.keywordColor, fontWeight: 600 }}>
                      ● {language.charAt(0).toUpperCase() + language.slice(1)}
                    </span>
                  </div>
                )}
                <div style={styles.codeBlock}>
                  {tokenLines.map((line, lineIdx) => (
                    <div key={lineIdx} style={styles.codeLine}>
                      <span style={styles.lineNum}>{lineIdx + 1}</span>
                      <span>
                        {line.map((token, tokenIdx) =>
                          renderTokenSpan(token, currentTheme, `${lineIdx}-${tokenIdx}`)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loading && tokenLines.length === 0 && (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '48px', marginBottom: '12px' }}>✨</span>
                <p style={{ color: '#6c7086', fontSize: '14px' }}>
                  Enter some code to generate a screenshot
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          url={shareUrl}
          onClose={() => setShowShareModal(false)}
          onToast={showToast}
        />
      )}

      <style>{cssStyles}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#11111b',
    color: '#cdd6f4',
    fontFamily: "'Fira Code', monospace",
    padding: '0',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #1e1e2e',
    flexWrap: 'wrap',
    gap: '8px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  main: {
    display: 'flex',
    padding: '24px 32px',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  leftPanel: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
  },
  rightPanel: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
  },
  editorContainer: {
    background: '#1e1e2e',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #313244',
    width: '100%',
    boxSizing: 'border-box',
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid #313244',
    background: '#181825',
    flexWrap: 'wrap',
    gap: '8px',
  },
  windowDots: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  langSelect: {
    background: '#313244',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 28px 6px 12px',
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
  },
  editorWrapper: {
    display: 'flex',
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
  },
  lineNumbers: {
    flexShrink: 0,
    background: '#181825',
  },
  lineNumber: {
    width: '40px',
    textAlign: 'right',
    paddingRight: '12px',
    color: '#6c7086',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: "'Fira Code', monospace",
    paddingTop: '16px',
    paddingBottom: '16px',
    userSelect: 'none',
  },
  textarea: {
    width: '100%',
    height: '240px',
    background: '#1e1e2e',
    color: '#cdd6f4',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    padding: '16px',
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  actionBtn: {
    width: '120px',
    height: '40px',
    borderRadius: '8px',
    background: '#cba6f7',
    color: '#1e1e2e',
    border: 'none',
    fontWeight: 600,
    fontSize: '11px',
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  options: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6c7086',
    flexWrap: 'wrap',
    gap: '8px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  lineCount: {
    fontSize: '12px',
  },
  previewLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#a6adc8',
    marginBottom: '4px',
  },
  previewArea: {
    position: 'relative',
    minHeight: '300px',
    background: '#181825',
    borderRadius: '12px',
    border: '1px solid #313244',
    overflow: 'auto',
    padding: '16px',
    boxSizing: 'border-box',
  },
  previewCard: {
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    overflow: 'auto',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  previewHeader: {
    marginBottom: '16px',
    fontSize: '14px',
  },
  codeBlock: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    overflowX: 'auto',
    width: '100%',
  },
  codeLine: {
    display: 'flex',
    gap: '16px',
    whiteSpace: 'pre',
  },
  lineNum: {
    color: '#6c7086',
    fontSize: '14px',
    minWidth: '28px',
    textAlign: 'right',
    userSelect: 'none',
    flexShrink: 0,
  },
  spinnerOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #313244',
    borderTopColor: '#cba6f7',
    borderRadius: '50%',
    animation: 'pp-spin 0.6s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '250px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    boxSizing: 'border-box',
  },
  modalContent: {
    width: '400px',
    maxWidth: '100%',
    borderRadius: '16px',
    background: '#1e1e2e',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    color: '#fff',
    padding: '20px',
    boxSizing: 'border-box',
  },
  urlBox: {
    background: '#11111b',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #313244',
    overflow: 'hidden',
    wordBreak: 'break-all',
  },
  modalButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    background: '#cba6f7',
    color: '#1e1e2e',
    border: 'none',
    fontWeight: 600,
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    minWidth: 0,
  },
};

const cssStyles = `
  .pp-btn {
    transition: transform 0.2s ease;
  }
  .pp-btn:hover {
    transform: scale(1.05);
  }
  .pp-btn:active {
    transform: scale(0.95);
  }
  @keyframes pp-spin {
    to { transform: rotate(360deg); }
  }

  /* ============ 响应式布局 ============ */
  .layoutHorizontal {
    display: flex;
    flex-direction: row;
  }
  .layoutVertical {
    display: flex;
    flex-direction: column;
  }
  .panelLeft {
    width: 45%;
    box-sizing: border-box;
  }
  .panelRight {
    width: 55%;
    box-sizing: border-box;
  }

  @media (max-width: 900px) {
    .layoutHorizontal {
      flex-direction: column !important;
    }
    .panelLeft,
    .panelRight {
      width: 100% !important;
      flex: none !important;
    }
    .pp-app header {
      padding: 16px;
    }
    .layoutHorizontal {
      padding: 16px !important;
      gap: 16px !important;
    }
    .pp-toast {
      width: calc(100% - 32px);
      max-width: 360px;
      text-align: center;
    }
  }

  /* ============ 语言选择下拉框样式 ============ */
  .pp-lang-select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-color: #313244 !important;
    color: #cdd6f4 !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 6px 28px 6px 12px !important;
    font-size: 13px !important;
    font-family: 'Fira Code', monospace !important;
    cursor: pointer !important;
    outline: none !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23cdd6f4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 10px center !important;
    background-size: 10px !important;
  }
  .pp-lang-select option {
    background-color: #1e1e2e !important;
    color: #cdd6f4 !important;
    padding: 6px !important;
  }
  .pp-lang-select:focus {
    box-shadow: 0 0 0 2px #cba6f7 !important;
  }

  /* ============ 主题按钮激活态 ============ */
  .pp-theme-btn {
    box-shadow: 0 0 0 2px rgba(203, 166, 247, 0.4) !important;
    position: relative;
  }

  /* ============ 分享弹窗进入动画 ============ */
  @keyframes pp-modal-in {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }
  .pp-modal-content {
    animation: pp-modal-in 0.22s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes pp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .pp-modal-overlay {
    animation: pp-fade-in 0.18s ease;
  }

  /* ============ Toast 动画 ============ */
  @keyframes pp-toast-in {
    from { opacity: 0; transform: translate(-50%, -12px); }
    to   { opacity: 1; transform: translate(-50%, 0);     }
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #181825;
  }
  ::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #585b70;
  }

  @media (max-width: 600px) {
    .pp-btn {
      width: auto !important;
      min-width: 100px;
      flex: 1 1 calc(50% - 8px);
      font-size: 11px !important;
    }
    .pp-lang-select {
      font-size: 12px !important;
    }
  }
`;
