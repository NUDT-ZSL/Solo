import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import { Copy, Check } from 'lucide-react';
import { Language } from '../types';

interface CodeEditorProps {
  code: string;
  language: Language;
  editable?: boolean;
  onChange?: (code: string) => void;
}

const codeEditorStyles = `
  .code-editor-wrapper {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: #1e293b;
  }

  .code-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: #0f172a;
    border-bottom: 1px solid #334155;
  }

  .code-editor-lang {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .code-copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    background: #334155;
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    border: none;
  }

  .code-copy-btn:hover {
    background: #475569;
  }

  .code-copy-btn:active {
    transform: scale(0.95);
  }

  .code-copy-btn.copied {
    background: #065f46;
    color: #6ee7b7;
  }

  .code-area {
    position: relative;
    min-height: 200px;
    max-height: 600px;
    overflow: auto;
  }

  .code-area pre {
    margin: 0;
    padding: 16px;
    font-size: 14px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    line-height: 1.6;
    overflow: visible;
  }

  .code-area code {
    font-size: 14px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  }

  .code-textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 16px;
    font-size: 14px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    line-height: 1.6;
    color: transparent;
    caret-color: #e2e8f0;
    background: transparent;
    border: none;
    resize: none;
    white-space: pre;
    overflow: auto;
    tab-size: 2;
    -moz-tab-size: 2;
  }

  .code-textarea::selection {
    background: rgba(99, 102, 241, 0.3);
  }

  .line-numbers {
    position: absolute;
    left: 0;
    top: 0;
    padding: 16px 0;
    width: 48px;
    text-align: right;
    font-size: 14px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    line-height: 1.6;
    color: #475569;
    user-select: none;
    border-right: 1px solid #334155;
    background: #0f172a;
  }

  .line-numbers span {
    display: block;
    padding-right: 12px;
  }

  .code-content {
    margin-left: 48px;
  }

  .copy-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 10px 20px;
    background: #065f46;
    color: #6ee7b7;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: fadeIn 0.3s ease;
    z-index: 1000;
  }

  .copy-toast.hiding {
    animation: fadeOut 0.3s ease forwards;
  }
`;

const LANGUAGE_MAP: Record<Language, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  HTML: 'markup',
  CSS: 'css',
  JSON: 'json',
};

export default function CodeEditor({ code, language, editable = false, onChange }: CodeEditorProps) {
  const codeRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (codeRef.current && !editable) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language, editable]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
      }, 2000);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      if (onChange) {
        onChange(newValue);
      }
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
    }
  };

  const prismLang = LANGUAGE_MAP[language] || 'javascript';

  const lines = code.split('\n');
  const lineNumbers = lines.map((_, i) => (
    <span key={i}>{i + 1}</span>
  ));

  if (editable) {
    return (
      <>
        <style>{codeEditorStyles}</style>
        <div className="code-editor-wrapper">
          <div className="code-editor-header">
            <span className="code-editor-lang">{language}</span>
          </div>
          <div className="code-area" style={{ position: 'relative' }}>
            <div className="line-numbers">{lineNumbers}</div>
            <div className="code-content">
              <pre style={{ pointerEvents: 'none' }}>
                <code ref={codeRef} className={`language-${prismLang}`}>
                  {code}
                </code>
              </pre>
              <textarea
                ref={textareaRef}
                className="code-textarea"
                value={code}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{codeEditorStyles}</style>
      <div className="code-editor-wrapper">
        <div className="code-editor-header">
          <span className="code-editor-lang">{language}</span>
          <button
            className={`code-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
        <div className="code-area">
          <div className="line-numbers">{lineNumbers}</div>
          <div className="code-content">
            <pre>
              <code ref={codeRef} className={`language-${prismLang}`}>
                {code}
              </code>
            </pre>
          </div>
        </div>
      </div>
      {toastVisible && (
        <div className="copy-toast">已复制到剪贴板</div>
      )}
    </>
  );
}
