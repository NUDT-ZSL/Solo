import React, { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { parseCode } from './utils/codeParser';
import { GraphData, Language, HistoryEntry, SaveRequest, SnippetResponse } from './types';
import EditorPanel from './components/EditorPanel';
import GraphPanel from './components/GraphPanel';
import ShareDialog from './components/ShareDialog';

const DEFAULT_CODE = `import express from 'express';
import { router } from './routes';
import cors from 'cors';

const app = express();
const port = 3000;
const host = 'localhost';

function setupMiddleware() {
  app.use(cors());
  app.use(express.json());
  app.use(router);
  return app;
}

function startServer() {
  setupMiddleware();
  app.listen(port, () => {
    console.log(\`Server running on \${host}:\${port}\`);
  });
}

function createRoute(name) {
  const handler = (req, res) => {
    res.json({ name, status: 'ok' });
  };
  return handler;
}

startServer();
`;

type HistoryAction =
  | { type: 'PUSH'; payload: HistoryEntry }
  | { type: 'CLEAR' };

function historyReducer(state: HistoryEntry[], action: HistoryAction): HistoryEntry[] {
  switch (action.type) {
    case 'PUSH':
      return [action.payload, ...state].slice(0, 50);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState<Language>('javascript');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [history, dispatchHistory] = useReducer(historyReducer, []);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = parseCode(code, language);
      setGraphData(result);
    }, 300);
    return () => clearTimeout(timer);
  }, [code, language]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      fetch(`/get-snippet/${codeParam}`)
        .then(res => res.json())
        .then((data: SnippetResponse) => {
          if (data.success && data.data) {
            setCode(data.data.code);
            setLanguage(data.data.language);
            setGraphData(data.data.graphData);
            setShareCode(codeParam);
          }
        })
        .catch(console.error);
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const minL = 300;
      const maxL = rect.width - 400;
      setLeftPanelWidth(Math.max(minL, Math.min(maxL, newWidth)));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/post-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, graphData } as SaveRequest),
      });
      const data = await response.json();
      if (data.success) {
        setShareCode(data.code);
        setShowShareDialog(true);
        dispatchHistory({
          type: 'PUSH',
          payload: { code, language, graphData, timestamp: Date.now() },
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [code, language, graphData, isSaving]);

  const handleCopy = useCallback(() => {
    if (!shareCode) return;
    const url = `${window.location.origin}?code=${shareCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [shareCode]);

  const handleNodeClick = useCallback((line: number) => {
    setHighlightLine(line);
    setTimeout(() => setHighlightLine(null), 3000);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setFocusNodeId(prev => (prev === nodeId ? null : nodeId));
  }, []);

  const languageOptions: Language[] = ['javascript', 'python', 'html'];

  const rightWidth = containerRef.current
    ? containerRef.current.clientWidth - leftPanelWidth - 6
    : 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e2e',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 52,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderBottom: '1px solid #2a2a4a',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00a8ff, #9b59b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            CodeCanvas
          </span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as Language)}
            style={{
              background: '#2a2a4a',
              color: '#e0e0e0',
              border: '1px solid #3a3a5a',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {languageOptions.map(lang => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {shareCode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#2a2a4a',
                borderRadius: 8,
                padding: '4px 10px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <span style={{ color: '#888', fontSize: 12 }}>分享码</span>
              <span
                style={{
                  color: '#00a8ff',
                  fontFamily: 'var(--font-code)',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '1px',
                }}
              >
                {shareCode}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#4ade80' : '#00a8ff',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '2px 6px',
                  borderRadius: 4,
                  transition: 'var(--transition)',
                  position: 'relative',
                }}
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
              {copied && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    right: 0,
                    background: '#4ade80',
                    color: '#1e1e2e',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    animation: 'copiedPulse 1.5s ease-in-out forwards',
                  }}
                >
                  已复制
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #00a8ff, #0090dd)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? 'wait' : 'pointer',
              transition: 'var(--transition)',
              fontFamily: 'var(--font-ui)',
            }}
            onMouseDown={e => {
              const btn = e.currentTarget;
              const rect = btn.getBoundingClientRect();
              const ripple = document.createElement('span');
              ripple.style.cssText = `
                position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);
                width:20px;height:20px;left:${e.clientX - rect.left - 10}px;
                top:${e.clientY - rect.top - 10}px;animation:ripple 0.3s ease-out forwards;
                pointer-events:none;
              `;
              btn.appendChild(ripple);
              setTimeout(() => ripple.remove(), 300);
              btn.style.background = 'linear-gradient(135deg, #0077b6, #005f99)';
              setTimeout(() => {
                btn.style.background = 'linear-gradient(135deg, #00a8ff, #0090dd)';
              }, 300);
            }}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </nav>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={
            isMobile
              ? {
                  width: '100%',
                  height: '50vh',
                  flexShrink: 0,
                  overflow: 'hidden',
                }
              : {
                  width: leftPanelWidth,
                  minWidth: 300,
                  flexShrink: 0,
                  overflow: 'hidden',
                }
          }
        >
          <EditorPanel
            code={code}
            language={language}
            onChange={setCode}
            highlightLine={highlightLine}
          />
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={
            isMobile
              ? {
                  width: '100%',
                  height: 6,
                  background: isDragging ? '#4A90D9' : '#2a2a4a',
                  cursor: 'row-resize',
                  transition: isDragging ? 'none' : 'background 0.3s ease-in-out',
                  flexShrink: 0,
                }
              : {
                  width: 6,
                  cursor: 'col-resize',
                  background: isDragging ? '#4A90D9' : '#2a2a4a',
                  transition: isDragging ? 'none' : 'background 0.3s ease-in-out',
                  flexShrink: 0,
                  zIndex: 5,
                }
          }
        />

        <div
          style={
            isMobile
              ? {
                  width: '100%',
                  flex: 1,
                  overflow: 'hidden',
                }
              : {
                  flex: 1,
                  minWidth: 400,
                  overflow: 'hidden',
                }
          }
        >
          <GraphPanel
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            focusNodeId={focusNodeId}
          />
        </div>
      </div>

      {showShareDialog && shareCode && (
        <ShareDialog
          shareCode={shareCode}
          onClose={() => setShowShareDialog(false)}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
    </div>
  );
}
