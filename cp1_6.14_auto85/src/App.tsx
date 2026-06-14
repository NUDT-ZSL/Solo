import React, { useState, useCallback, useRef, useEffect } from 'react';
import InputPanel from './components/InputPanel';
import CallTree from './components/CallTree';
import CodePreview from './components/CodePreview';
import VariablePanel from './components/VariablePanel';
import { StackFrame, ParseResult } from './types';
import { exportToJSON, exportToSVG } from './utils/exportUtils';

const DownloadIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ChevronDownIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,4 10,8 6,12" />
  </svg>
);

const App: React.FC = () => {
  const [callTree, setCallTree] = useState<StackFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<StackFrame | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [errorFrameId, setErrorFrameId] = useState<string | undefined>();
  const [parseTime, setParseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [flashLine, setFlashLine] = useState<number | undefined>();
  const [leftWidth, setLeftWidth] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left - 424;
      
      if (newWidth >= 200 && newWidth <= rect.width - 600) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleParse = useCallback(async (text: string) => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stackText: text }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse');
      }

      const data: ParseResult = await response.json();
      
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      
      setCallTree(data.callTree);
      setErrorFrameId(data.errorFrameId);
      setParseResult(data);
      setParseTime(elapsed);

      const allIds = new Set<string>();
      const collectIds = (nodes: StackFrame[]) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          if (node.children.length > 0) {
            collectIds(node.children);
          }
        });
      };
      collectIds(data.callTree);
      setExpandedIds(allIds);

      if (data.errorFrameId) {
        const findFrame = (nodes: StackFrame[]): StackFrame | null => {
          for (const node of nodes) {
            if (node.id === data.errorFrameId) return node;
            if (node.children.length > 0) {
              const found = findFrame(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        const errorFrame = findFrame(data.callTree);
        if (errorFrame) {
          setSelectedFrame(errorFrame);
          setFlashLine(errorFrame.lineNumber);
          setTimeout(() => setFlashLine(undefined), 1000);
        }
      } else if (data.callTree.length > 0) {
        setSelectedFrame(data.callTree[0]);
      }
    } catch (error) {
      console.error('Parse error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((frame: StackFrame) => {
    setSelectedFrame(frame);
  }, []);

  const handleExportJSON = () => {
    if (parseResult) {
      exportToJSON(parseResult);
    }
    setShowExportMenu(false);
  };

  const handleExportSVG = () => {
    if (parseResult) {
      exportToSVG(parseResult);
    }
    setShowExportMenu(false);
  };

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const selectedVariables = selectedFrame?.variables || {};

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="logo">StackLens</span>
          {parseTime !== null && (
            <span className="parse-time">解析时间: {parseTime}ms</span>
          )}
        </div>
        <div className="toolbar-right" ref={exportMenuRef}>
          <button
            className="export-button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!parseResult}
          >
            <DownloadIcon />
            导出
            <ChevronDownIcon />
          </button>
          {showExportMenu && (
            <div className="export-dropdown">
              <div className="export-dropdown-item" onClick={handleExportJSON}>
                📄 导出为 JSON
              </div>
              <div className="export-dropdown-item" onClick={handleExportSVG}>
                📊 导出为 SVG
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="main-content" ref={containerRef}>
        <InputPanel onParse={handleParse} isLoading={isLoading} />

        <div className="preview-section">
          <div style={{ width: leftWidth, minWidth: 200, flexShrink: 0 }}>
            <CallTree
              tree={callTree}
              selectedId={selectedFrame?.id || null}
              expandedIds={expandedIds}
              errorFrameId={errorFrameId}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          </div>

          <div
            className={`divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleDividerMouseDown}
          />

          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            <CodePreview
              selectedFrame={selectedFrame}
              sourceCode={parseResult?.sourceCode}
              errorFrameId={errorFrameId}
              flashLine={flashLine}
            />
            {selectedFrame && (
              <VariablePanel variables={selectedVariables} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
