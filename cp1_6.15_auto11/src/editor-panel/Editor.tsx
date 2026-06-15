import { useEffect, useRef, useCallback } from 'react';
import hljs from 'highlight.js';
import './Editor.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  useEffect(() => {
    if (preRef.current) {
      const codeElement = preRef.current.querySelector('code');
      if (codeElement) {
        codeElement.textContent = value || ' ';
        hljs.highlightElement(codeElement);
      }
    }
  }, [value]);

  useEffect(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      const lines = value.split('\n').length;
      let lineNumbersHtml = '';
      for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += `${i}\n`;
      }
      lineNumbersRef.current.textContent = lineNumbersHtml;
    }
  }, [value]);

  return (
    <div className="editor-container">
      <div className="editor-header">
        <span className="editor-title">Markdown 编辑器</span>
      </div>
      <div className="editor-body">
        <div className="line-numbers" ref={lineNumbersRef}></div>
        <div className="code-wrapper">
          <pre ref={preRef} className="hljs code-highlight" aria-hidden="true">
            <code className="language-markdown"></code>
          </pre>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            spellCheck={false}
            placeholder="在这里输入 Markdown 内容..."
          />
        </div>
      </div>
    </div>
  );
}
