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

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

function ShareModal({ url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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
            style={{ ...styles.modalButton, background: '#45475a' }}
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTheme = themes[themeIndex];

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
      } finally {
        setLoading(false);
      }
    },
    [themeIndex, showHeader]
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
      eventBus.emit('action:download');
    }
  }, []);

  const handleCopyClipboard = useCallback(async () => {
    if (canvasRef.current) {
      const success = await SnapshotRenderer.copyToClipboard(canvasRef.current);
      eventBus.emit('action:clipboard', success);
    }
  }, []);

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
    <div style={styles.app}>
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

      <div style={styles.main} className="pp-main-flex">
        <div style={styles.leftPanel} className="pp-left-panel">
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
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.editorWrapper}>
              {code.split('\n').map((_, i) => (
                <div key={i} style={styles.lineNumber}>
                  {i + 1}
                </div>
              ))}
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
              📋 Copy to Clipboard
            </button>
            <button style={styles.actionBtn} onClick={handleThemeSwitch} className="pp-btn">
              🎨 {currentTheme.name}
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

        <div style={styles.rightPanel} className="pp-right-panel">
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
        <ShareModal url={shareUrl} onClose={() => setShowShareModal(false)} />
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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #1e1e2e',
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
  },
  leftPanel: {
    width: '45%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightPanel: {
    width: '55%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editorContainer: {
    background: '#1e1e2e',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #313244',
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid #313244',
    background: '#181825',
  },
  windowDots: {
    display: 'flex',
    gap: '6px',
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
    padding: '4px 12px',
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    outline: 'none',
  },
  editorWrapper: {
    display: 'flex',
    position: 'relative',
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
    flexShrink: 0,
    background: '#181825',
  },
  textarea: {
    width: '100%',
    height: '240px',
    maxWidth: '600px',
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
  },
  options: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6c7086',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
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
  },
  previewCard: {
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    overflow: 'auto',
    maxWidth: '100%',
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
  },
  modalContent: {
    width: '400px',
    borderRadius: '16px',
    background: '#1e1e2e',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    color: '#fff',
    padding: '20px',
  },
  urlBox: {
    background: '#11111b',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #313244',
    overflow: 'hidden',
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
  },
};

const cssStyles = `
  .pp-btn:hover {
    transform: scale(1.05);
  }
  .pp-btn:active {
    transform: scale(0.95);
  }
  @keyframes pp-spin {
    to { transform: rotate(360deg); }
  }
  @media (max-width: 900px) {
    .pp-main-flex {
      flex-direction: column !important;
    }
    .pp-left-panel, .pp-right-panel {
      width: 100% !important;
    }
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
`;
