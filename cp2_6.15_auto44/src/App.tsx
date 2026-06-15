import React, { useState, useRef, useCallback, useEffect } from 'react';
import HandwritingCanvas, { HandwritingCanvasHandle } from './HandwritingCanvas';
import LaTeXPreview from './LaTeXPreview';
import HistoryPanel, { HistoryEntry } from './HistoryPanel';
import type { Stroke } from './RecognitionWorker';

const App: React.FC = () => {
  const [currentLatex, setCurrentLatex] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [rightFading, setRightFading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const canvasRef = useRef<HandwritingCanvasHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingStrokesRef = useRef<Stroke[]>([]);

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./RecognitionWorker.ts', import.meta.url), {
        type: 'module'
      });
      worker.onmessage = (e) => {
        if (e.data && e.data.type === 'result') {
          const latex = e.data.latex as string;
          setIsRecognizing(false);
          if (latex) {
            setCurrentLatex(latex);
            const entry: HistoryEntry = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              latex,
              timestamp: Date.now()
            };
            setHistory(prev => [entry, ...prev]);
          }
        }
      };
      worker.onerror = (err) => {
        console.error('Worker error:', err);
        setIsRecognizing(false);
      };
      workerRef.current = worker;
    } catch (err) {
      console.error('Failed to create worker:', err);
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  const handleRecognitionStart = useCallback((_center: { x: number; y: number }) => {
    setIsRecognizing(true);
  }, []);

  const handleRecognitionRequest = useCallback((_latex: string, strokes: Stroke[]) => {
    pendingStrokesRef.current = strokes;
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'recognize', strokes });
    } else {
      setIsRecognizing(false);
    }
  }, []);

  const handleLatexChange = useCallback((latex: string) => {
    setCurrentLatex(latex);
  }, []);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setCurrentLatex(entry.latex);
  }, []);

  const handleHistoryDelete = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setRightFading(true);
    setTimeout(() => {
      setCurrentLatex('');
      setHistory([]);
      setResetKey(k => k + 1);
      if (canvasRef.current) {
        canvasRef.current.clear();
      }
      setRightFading(false);
    }, 300);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#2d2d2d',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          padding: 24,
          gap: 16
        }}
      >
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          ✏️ 书写区域
        </div>
        <HandwritingCanvas
          ref={canvasRef}
          onRecognitionStart={handleRecognitionStart}
          onRecognitionComplete={handleRecognitionRequest}
          isRecognizing={isRecognizing}
        />
        <div
          style={{
            width: 440,
            color: '#9cc',
            fontFamily: 'monospace',
            fontSize: 13,
            minHeight: 20,
            padding: '6px 10px',
            borderRadius: 6,
            backgroundColor: '#252525',
            boxSizing: 'border-box',
            wordBreak: 'break-all'
          }}
        >
          {currentLatex || (isRecognizing ? '识别中...' : 'LaTeX 代码将显示在此处')}
        </div>
      </div>

      <div
        style={{
          width: 2,
          backgroundColor: '#ccc',
          flexShrink: 0
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: '#f0f0f0',
          padding: 24,
          gap: 8,
          position: 'relative',
          opacity: rightFading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        <button
          onClick={handleClearAll}
          style={{
            position: 'absolute',
            top: 16,
            right: 24,
            border: 'none',
            background: 'transparent',
            color: '#e74c3c',
            fontSize: 14,
            padding: '6px 16px',
            borderRadius: 20,
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          清空全部
        </button>

        <div style={{ color: '#333', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          📐 LaTeX 预览
        </div>

        <LaTeXPreview
          latex={currentLatex}
          onChange={handleLatexChange}
          resetKey={resetKey}
        />

        <div style={{ width: 440, color: '#666', fontSize: 14, fontWeight: 600, marginTop: 12, paddingLeft: 4 }}>
          📜 历史记录
        </div>
        <div style={{ width: 440 }}>
          <HistoryPanel
            entries={history}
            onSelect={handleHistorySelect}
            onDelete={handleHistoryDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
