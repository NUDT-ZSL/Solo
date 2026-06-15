import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Graph from './graph';
import { parseCode } from './parser';
import type { GraphNode, RefactorSuggestion, ParseResult } from './types';

const SAMPLE_CODE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.active) {
      if (item.price > 0) {
        if (item.quantity > 0) {
          if (item.discount) {
            total += item.price * item.quantity * (1 - item.discount);
          } else {
            total += item.price * item.quantity;
          }
        }
      }
    }
  }
  applyTax(total);
  logTotal(total);
  applyTax(total);
  return total;
}

function applyTax(amount) {
  const tax = 0.08;
  const result = amount * (1 + tax);
  const rounded = Math.round(result * 100) / 100;
  return rounded;
}

function logTotal(amount) {
  console.log("Total:", amount);
}
`;

function severityIcon(type: RefactorSuggestion['type']): string {
  switch (type) {
    case 'deep-nesting':
      return '🔶';
    case 'long-function':
      return '🔴';
    case 'duplicate-call':
      return '💡';
    default:
      return '⚪';
  }
}

function typeLabel(type: GraphNode['type']): string {
  switch (type) {
    case 'function':
      return '函数';
    case 'variable':
      return '变量';
    case 'branch':
      return '分支';
    case 'loop':
      return '循环';
    case 'call':
      return '调用';
    default:
      return type;
  }
}

const App: React.FC = () => {
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_CODE);
  const [parseResult, setParseResult] = useState<ParseResult>({ nodes: [], links: [], suggestions: [] });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightLine, setHighlightLine] = useState<{ start: number; end: number } | null>(null);
  const [collapsed, setCollapsed] = useState({ code: false, graph: false, suggestions: false });
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setParseResult(parseCode(sourceCode));
    }, 120);
    return () => clearTimeout(t);
  }, [sourceCode]);

  const lineCount = useMemo(() => sourceCode.split('\n').length, [sourceCode]);

  const scrollToLine = useCallback((start: number, end: number) => {
    setHighlightLine({ start, end });
    const target = lineRefs.current[start - 1];
    if (target && codeRef.current) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    setTimeout(() => setHighlightLine(null), 3000);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    scrollToLine(node.startLine, node.endLine);
  }, [scrollToLine]);

  const handleSvgRef = useCallback((svg: SVGSVGElement | null) => {
    svgRef.current = svg;
  }, []);

  const exportPNG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const width = 3840;
    const height = 2160;
    const svgBlob = new Blob(
      ['<?xml version="1.0" standalone="no"?>\r\n', source],
      { type: 'image/svg+xml;charset=utf-8' }
    );
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, width, height);
        const aspect = (svg.clientWidth || 800) / (svg.clientHeight || 600);
        let drawW = width;
        let drawH = width / aspect;
        if (drawH > height) {
          drawH = height;
          drawW = height * aspect;
        }
        ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        canvas.toBlob((blob) => {
          if (blob) {
            const a = document.createElement('a');
            a.download = 'code-graph.png';
            a.href = URL.createObjectURL(blob);
            a.click();
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const exportReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      totalSuggestions: parseResult.suggestions.length,
      suggestions: parseResult.suggestions.map((s) => ({
        type: s.type,
        severity: s.severity,
        message: s.message,
        startLine: s.startLine,
        endLine: s.endLine,
        snippet: s.snippet
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = 'refactor-report.json';
    a.href = URL.createObjectURL(blob);
    a.click();
  }, [parseResult.suggestions]);

  const toggleSection = (key: 'code' | 'graph' | 'suggestions') => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title">
          <span className="logo-dot" />
          <h1>代码结构可视化与重构建议</h1>
        </div>
        <div className="app-actions">
          <button className="btn" onClick={exportPNG} title="导出当前力导向图为高清PNG (3840x2160)">
            📸 导出PNG
          </button>
          <button className="btn" onClick={exportReport} title="导出重构建议为JSON文件">
            📄 导出报告
          </button>
          <button className="btn ghost" onClick={() => setSourceCode('')}>
            清空
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className={`panel panel-code ${collapsed.code ? 'collapsed' : ''}`}>
          <div className="panel-header" onClick={() => toggleSection('code')}>
            <span className="panel-title">📝 代码输入 ({lineCount} 行)</span>
            <span className="collapse-icon">{collapsed.code ? '▼' : '▲'}</span>
          </div>
          {!collapsed.code && (
            <div className="panel-body code-body">
              <div className="code-editor">
                <div className="line-numbers">
                  {Array.from({ length: lineCount }, (_, i) => {
                    const ln = i + 1;
                    const isHl = highlightLine && ln >= highlightLine.start && ln <= highlightLine.end;
                    return (
                      <div
                        key={i}
                        ref={(el) => { lineRefs.current[i] = el; }}
                        className={`line-number ${isHl ? 'hl' : ''}`}
                      >
                        {ln}
                      </div>
                    );
                  })}
                </div>
                <textarea
                  ref={codeRef}
                  className="code-textarea"
                  value={sourceCode}
                  spellCheck={false}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="在此粘贴或输入 JavaScript / TypeScript 代码..."
                />
              </div>
              {parseResult.error && (
                <div className="parse-error">
                  ❌ 解析错误: {parseResult.error}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="right-column">
          <section className={`panel panel-graph ${collapsed.graph ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => toggleSection('graph')}>
              <span className="panel-title">
                🌐 控制流与数据流图 ({parseResult.nodes.length} 节点, {parseResult.links.length} 连接)
              </span>
              <span className="collapse-icon">{collapsed.graph ? '▼' : '▲'}</span>
            </div>
            {!collapsed.graph && (
              <div className="panel-body graph-body">
                <div className="legend">
                  <div className="legend-item"><span className="legend-shape circle" style={{ background: '#4fc3f7' }} /> 函数</div>
                  <div className="legend-item"><span className="legend-shape rect" style={{ background: '#81c784' }} /> 变量</div>
                  <div className="legend-item"><span className="legend-shape diamond" style={{ background: '#ffb74d' }} /> 分支</div>
                  <div className="legend-item"><span className="legend-shape rect" style={{ background: '#ba68c8' }} /> 循环</div>
                  <div className="legend-item"><span className="legend-shape ellipse" style={{ background: '#f06292' }} /> 调用</div>
                </div>
                <div className="graph-wrapper">
                  <Graph
                    nodes={parseResult.nodes}
                    links={parseResult.links}
                    onNodeHover={setHoveredNode}
                    onNodeClick={handleNodeClick}
                    svgRefCallback={handleSvgRef}
                  />
                  {hoveredNode && (
                    <div className="node-tooltip">
                      <div className="tooltip-title">
                        <strong>{typeLabel(hoveredNode.type)}:</strong> {hoveredNode.name}
                      </div>
                      <div className="tooltip-meta">行 {hoveredNode.startLine} - {hoveredNode.endLine}</div>
                      <pre className="tooltip-snippet">{hoveredNode.snippet}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={`panel panel-suggestions ${collapsed.suggestions ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => toggleSection('suggestions')}>
              <span className="panel-title">💡 重构建议 ({parseResult.suggestions.length})</span>
              <span className="collapse-icon">{collapsed.suggestions ? '▼' : '▲'}</span>
            </div>
            {!collapsed.suggestions && (
              <div className="panel-body suggestions-body">
                {parseResult.suggestions.length === 0 ? (
                  <div className="empty-state">✨ 暂无重构建议，代码结构良好</div>
                ) : (
                  <ul className="suggestion-list">
                    {parseResult.suggestions.map((s) => (
                      <li
                        key={s.id}
                        className={`suggestion-item sev-${s.severity}`}
                        onClick={() => scrollToLine(s.startLine, s.endLine)}
                      >
                        <div className="suggestion-icon">{severityIcon(s.type)}</div>
                        <div className="suggestion-content">
                          <div className="suggestion-message">{s.message}</div>
                          <div className="suggestion-meta">
                            行 {s.startLine} - {s.endLine} · 点击定位
                          </div>
                          <pre className="suggestion-snippet">{s.snippet}</pre>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
