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

const generateLargeTestData = (lineCount: number): string => {
  const frames: string[] = [];
  frames.push('Error: Performance benchmark test');
  for (let i = 0; i < Math.min(lineCount, 2000); i++) {
    const funcName = `benchmarkFunc_${i}`;
    const fileName = `/app/src/modules/mod_${i % 50}/file_${i}.ts`;
    const line = 1 + (i * 7) % 999;
    const col = 1 + (i * 13) % 120;
    frames.push(`    at ${funcName} (${fileName}:${line}:${col})`);
  }
  const extraCode: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    extraCode.push(`const var_${i} = computeValue_${i % 100}(arg_${i % 10});`);
  }
  return [...frames, ...extraCode].join('\n');
};

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
  const [callTreeWidth, setCallTreeWidth] = useState<number>(300);
  const [isDividerDragging, setIsDividerDragging] = useState(false);
  const [perfResult, setPerfResult] = useState<{ lines: number; ms: number; pass: boolean } | null>(null);

  const previewSectionRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const dividerStartXRef = useRef<number>(0);
  const dividerStartWidthRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dividerStartXRef.current = e.clientX;
    dividerStartWidthRef.current = callTreeWidth;
    setIsDividerDragging(true);
  }, [callTreeWidth]);

  useEffect(() => {
    if (!isDividerDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!previewSectionRef.current) return;
        const previewRect = previewSectionRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dividerStartXRef.current;
        const newWidth = dividerStartWidthRef.current + deltaX;
        const minW = 200;
        const maxW = Math.max(minW, previewRect.width - 600);
        const clamped = Math.min(Math.max(newWidth, minW), maxW);
        setCallTreeWidth(clamped);
      });
    };

    const handleMouseUp = () => {
      setIsDividerDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDividerDragging]);

  const runPerformanceBenchmark = useCallback(async () => {
    const lineCount = 100000;
    const testInput = generateLargeTestData(lineCount);

    const pasteStart = performance.now();

    const apiStart = performance.now();
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stackText: testInput }),
    });
    const data: ParseResult = await response.json();
    const apiEnd = performance.now();

    const apiDuration = apiEnd - apiStart;
    console.log(`[Perf] Backend parse: ${apiDuration.toFixed(2)}ms`);

    const renderStart = performance.now();
    setCallTree(data.callTree);
    setErrorFrameId(data.errorFrameId);
    setParseResult(data);

    const allIds = new Set<string>();
    const collectIds = (nodes: StackFrame[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children.length > 0) collectIds(node.children);
      });
    };
    collectIds(data.callTree);
    setExpandedIds(allIds);

    if (data.callTree.length > 0) {
      setSelectedFrame(data.callTree[0]);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pasteEnd = performance.now();
        const totalMs = pasteEnd - pasteStart;
        const renderMs = pasteEnd - renderStart;
        const pass = totalMs < 200;

        console.log(`[Perf] Total: ${totalMs.toFixed(2)}ms (API: ${apiDuration.toFixed(2)}ms + React render: ${renderMs.toFixed(2)}ms)`);
        console.log(`[Perf] 100,000 lines benchmark: ${pass ? 'PASS ✓ (<200ms)' : 'FAIL ✗ (>=200ms)'}`);

        setParseTime(Math.round(totalMs));
        setPerfResult({ lines: lineCount, ms: Math.round(totalMs), pass });
      });
    });
  }, []);

  const handleParse = useCallback(async (text: string) => {
    const startTime = performance.now();
    setIsLoading(true);
    setPerfResult(null);

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

      const renderStart = performance.now();

      setCallTree(data.callTree);
      setErrorFrameId(data.errorFrameId);
      setParseResult(data);

      const allIds = new Set<string>();
      const collectIds = (nodes: StackFrame[]) => {
        nodes.forEach((node) => {
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

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const elapsed = Math.round(endTime - startTime);
          setParseTime(elapsed);
          const renderMs = Math.round(endTime - renderStart);
          console.log(`[Perf] Total ${elapsed}ms (network+parse ~${elapsed - renderMs}ms, render ${renderMs}ms)`);
        });
      });
    } catch (error) {
      console.error('Parse error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
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

  const selectedVariables = selectedFrame?.variables || {};

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="logo">StackLens</span>
          {parseTime !== null && (
            <span className="parse-time">解析时间: {parseTime}ms</span>
          )}
          {perfResult && (
            <span
              className="parse-time"
              style={{
                color: perfResult.pass ? '#00c853' : '#ff5252',
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 4,
                background: perfResult.pass ? 'rgba(0,200,83,0.1)' : 'rgba(255,82,82,0.1)',
              }}
            >
              性能测试: {perfResult.lines.toLocaleString()}行 / {perfResult.ms}ms {perfResult.pass ? '✓' : '✗'}
            </span>
          )}
          <button
            onClick={runPerformanceBenchmark}
            style={{
              marginLeft: 12,
              padding: '4px 10px',
              background: '#3d3d55',
              color: '#e0e0e0',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
            title="运行10万行代码性能基准测试"
          >
            ⚡ 性能测试
          </button>
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

      <div className="main-content">
        <InputPanel onParse={handleParse} isLoading={isLoading} />

        <div className="preview-section" ref={previewSectionRef}>
          <div
            style={{
              width: callTreeWidth,
              minWidth: 200,
              flexShrink: 0,
              transition: isDividerDragging ? 'none' : undefined,
            }}
          >
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
            className={`divider ${isDividerDragging ? 'dragging' : ''}`}
            onMouseDown={onDividerMouseDown}
            title="拖拽调整宽度"
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
