import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { useAppContext } from './App';

function getPrismLanguage(language: string): string {
  switch (language) {
    case 'JavaScript': return 'javascript';
    case 'TypeScript': return 'typescript';
    case 'Python': return 'python';
    case 'HTML/CSS': return 'markup';
    default: return 'javascript';
  }
}

interface OutputLine {
  text: string;
  animating: boolean;
}

export default function SnippetPreview() {
  const { selectedSnippet, toggleFavorite, setEditingSnippet, setShowEditor, deleteSnippet } = useAppContext();
  const [isRunning, setIsRunning] = useState(false);
  const [outputs, setOutputs] = useState<OutputLine[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && selectedSnippet) {
      Prism.highlightElement(codeRef.current);
    }
  }, [selectedSnippet]);

  const handleRun = useCallback(async () => {
    if (!selectedSnippet) return;
    setIsRunning(true);
    setRunError(null);
    setOutputs([]);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedSnippet.code }),
      });
      const data = await res.json();

      if (data.error) {
        setRunError(data.error);
      }

      if (data.outputs && data.outputs.length > 0) {
        for (let i = 0; i < data.outputs.length; i++) {
          setTimeout(() => {
            setOutputs(prev => [...prev, { text: data.outputs[i], animating: true }]);
            setTimeout(() => {
              setOutputs(prev =>
                prev.map((o, idx) =>
                  idx === prev.length - 1 ? { ...o, animating: false } : o
                )
              );
            }, 400);
          }, i * 100);
        }
      }

      if (data.result !== undefined && !data.error) {
        setTimeout(() => {
          setOutputs(prev => [...prev, { text: `→ ${data.result}`, animating: true }]);
          setTimeout(() => {
            setOutputs(prev =>
              prev.map((o, idx) =>
                idx === prev.length - 1 ? { ...o, animating: false } : o
              )
            );
          }, 400);
        }, (data.outputs?.length || 0) * 100 + 50);
      }

      if (!data.outputs?.length && !data.result && !data.error) {
        setOutputs([{ text: '(无输出)', animating: false }]);
      }
    } catch (err) {
      setRunError('执行请求失败');
    } finally {
      setIsRunning(false);
    }
  }, [selectedSnippet]);

  const handleEdit = () => {
    if (!selectedSnippet) return;
    setEditingSnippet(selectedSnippet);
    setShowEditor(true);
  };

  const handleDelete = async () => {
    if (!selectedSnippet) return;
    if (confirm('确定要删除这个代码片段吗？')) {
      deleteSnippet(selectedSnippet.id);
    }
  };

  if (!selectedSnippet) {
    return (
      <div className="preview-empty">
        <div className="empty-icon">{ }</div>
        <p>选择一个代码片段查看详情</p>
        <p className="empty-hint">或点击"新建片段"创建一个新的代码片段</p>
      </div>
    );
  }

  const prismLang = getPrismLanguage(selectedSnippet.language);

  return (
    <div className="snippet-preview">
      <div className="preview-header">
        <div className="preview-title-row">
          <h2 className="preview-title">{selectedSnippet.title}</h2>
          <div className="preview-header-actions">
            <button
              className={`btn-fav-detail ${selectedSnippet.favorited ? 'favorited' : ''}`}
              onClick={() => toggleFavorite(selectedSnippet.id)}
            >
              ★
            </button>
            <button className="btn-edit-detail" onClick={handleEdit}>✎ 编辑</button>
            <button className="btn-delete-detail" onClick={handleDelete}>🗑 删除</button>
          </div>
        </div>
        <div className="preview-meta">
          <span className="meta-lang">{selectedSnippet.language}</span>
          {selectedSnippet.tags.split(',').map((t, i) => (
            t.trim() && <span key={i} className="meta-tag">{t.trim()}</span>
          ))}
        </div>
        {selectedSnippet.description && (
          <p className="preview-desc">{selectedSnippet.description}</p>
        )}
      </div>

      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span>{selectedSnippet.language}</span>
          <button className="btn-copy" onClick={() => navigator.clipboard.writeText(selectedSnippet.code)}>
            📋 复制
          </button>
        </div>
        <div className="code-scroll">
          <pre className="code-block" data-language={prismLang}>
            <code ref={codeRef} className={`language-${prismLang}`}>
              {selectedSnippet.code}
            </code>
          </pre>
        </div>
      </div>

      <div className="run-section">
        <button
          className="btn-run"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? '⏳ 运行中...' : '▶ 运行'}
        </button>
        {selectedSnippet.language !== 'JavaScript' && selectedSnippet.language !== 'TypeScript' && (
          <span className="run-hint">（仅支持 JavaScript/TypeScript 在线运行）</span>
        )}
      </div>

      {(outputs.length > 0 || runError) && (
        <div className="output-terminal">
          <div className="terminal-header">
            <span>输出</span>
            <button className="btn-clear-output" onClick={() => { setOutputs([]); setRunError(null); }}>
              清除
            </button>
          </div>
          <div className="terminal-body">
            {outputs.map((o, i) => (
              <div key={i} className={`terminal-line ${o.animating ? 'fade-in' : ''}`}>
                {o.text}
              </div>
            ))}
            {runError && (
              <div className="terminal-line error fade-in">{runError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
