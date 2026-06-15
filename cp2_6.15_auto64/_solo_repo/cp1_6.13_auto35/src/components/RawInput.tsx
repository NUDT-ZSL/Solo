import React, { useCallback, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getCharCount, PLATFORM_CONFIGS } from '../utils/converters';
import type { Platform } from '../utils/converters';

interface RawInputProps {
  rawText: string;
  onTextChange: (text: string) => void;
  activePlatform: Platform;
}

const RawInput: React.FC<RawInputProps> = ({ rawText, onTextChange, activePlatform }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = getCharCount(rawText);
  const weiboLimit = PLATFORM_CONFIGS.weibo.maxChars;
  const isOverWeiboLimit = charCount > weiboLimit;
  const isWeibo = activePlatform === 'weibo';

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onTextChange(text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      document.execCommand('paste');
    }
  }, [onTextChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value);
  }, [onTextChange]);

  const previewHtml = DOMPurify.sanitize(marked.parse(rawText || '在左侧输入内容...') as string);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [rawText]);

  return (
    <div className="raw-input-container">
      <div className="raw-input-header">
        <span className="raw-input-label">原始文章</span>
        <button
          className="paste-btn"
          onClick={handlePaste}
          title="粘贴剪贴板内容"
        >
          📋 粘贴
        </button>
      </div>
      <div className="raw-input-wrapper">
        <textarea
          ref={textareaRef}
          className="raw-input-textarea"
          value={rawText}
          onChange={handleChange}
          placeholder="在此输入 Markdown 格式的文章内容..."
          spellCheck={false}
        />
        <div className={`char-count ${isWeibo && isOverWeiboLimit ? 'char-count-over-weibo' : ''}`}>
          {charCount} 字
        </div>
      </div>
      <div className="raw-input-preview-label">Markdown 预览</div>
      <div
        className="raw-input-preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
};

export default RawInput;
