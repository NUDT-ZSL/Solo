import { useState } from 'react';

interface CodePreviewProps {
  css: string;
}

export default function CodePreview({ css }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = css;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <span className="code-preview-title">CSS 代码</span>
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre className="code-content">
        <code>{css}</code>
      </pre>
    </div>
  );
}
