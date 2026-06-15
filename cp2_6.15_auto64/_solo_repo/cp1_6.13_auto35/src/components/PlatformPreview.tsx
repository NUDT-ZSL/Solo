import React, { useRef, useState, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getCharCount, PLATFORM_CONFIGS } from '../utils/converters';
import type { Platform } from '../utils/converters';

interface PlatformPreviewProps {
  formattedText: string;
  platform: Platform;
  onEdit: (editedText: string, platform: Platform) => void;
  showToast: (msg: string) => void;
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  formattedText,
  platform,
  onEdit,
  showToast,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const config = PLATFORM_CONFIGS[platform];
  const charCount = getCharCount(formattedText);
  const isOverLimit = platform === 'weibo' && charCount > config.maxChars;

  const renderHtml = useCallback(() => {
    if (platform === 'zhihu') {
      return DOMPurify.sanitize(marked.parse(formattedText) as string);
    }
    const escaped = formattedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    return escaped;
  }, [formattedText, platform]);

  useEffect(() => {
    if (contentRef.current && !editing) {
      contentRef.current.innerHTML = renderHtml();
    }
  }, [renderHtml, editing]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      showToast('已复制至剪贴板');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formattedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      showToast('已复制至剪贴板');
      setTimeout(() => setCopied(false), 1500);
    }
  }, [formattedText, showToast]);

  const handleFocus = useCallback(() => {
    setEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (contentRef.current) {
      let text = contentRef.current.innerText || '';
      text = text.replace(/\n{3,}/g, '\n\n').trim();
      onEdit(text, platform);
    }
  }, [onEdit, platform]);

  const handleInput = useCallback(() => {
    if (contentRef.current) {
      const text = contentRef.current.innerText || '';
      onEdit(text, platform);
    }
  }, [onEdit, platform]);

  return (
    <div className="platform-preview-card" data-platform={platform}>
      <div className="preview-card-header">
        {platform === 'weibo' && (
          <span className={`preview-char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {charCount}/{config.maxChars}
          </span>
        )}
        {(platform === 'xiaohongshu' || platform === 'zhihu') && (
          <span className="preview-char-count">{charCount} 字</span>
        )}
      </div>
      <div
        ref={contentRef}
        className={`preview-content platform-${platform}`}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        spellCheck={false}
      />
      <div className="preview-card-footer">
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          style={{ backgroundColor: copied ? '#10b981' : config.color }}
        >
          {copied ? '已复制 ✓' : '复制格式化文本'}
        </button>
      </div>
    </div>
  );
};

export default PlatformPreview;
