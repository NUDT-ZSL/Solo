import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language, LANGUAGE_OPTIONS, FONT_FAMILY, FONT_SIZE, LINE_HEIGHT } from './types';
import { highlightCode, detectLanguage, generateHighlightStyles } from './utils/highlight';

interface CodeEditorProps {
  code: string;
  language: Language;
  onChange: (code: string) => void;
  onLanguageChange: (language: Language) => void;
}

const EDITOR_BG = '#282C34';
const EDITOR_TEXT_COLOR = '#ABB2BF';

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, onLanguageChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [highlightedHtml, setHighlightedHtml] = useState('');

  useEffect(() => {
    if (code) {
      const html = highlightCode(code, language);
      setHighlightedHtml(html);
    } else {
      setHighlightedHtml('');
    }
  }, [code, language]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    onChange(newCode);

    if (newCode.length > 0 && code.length === 0) {
      const detected = detectLanguage(newCode);
      if (detected !== language) {
        onLanguageChange(detected);
      }
    }
  }, [onChange, onLanguageChange, language, code.length]);

  const handleLanguageSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value as Language);
  }, [onLanguageChange]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const detected = detectLanguage(pastedText);
    if (detected !== language) {
      onLanguageChange(detected);
    }
    onChange(pastedText);
  }, [onChange, onLanguageChange, language]);

  const languageLabel = LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label || 'Unknown';

  const editorStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#2D2D2D',
    borderBottom: '1px solid #3E4452',
    borderRadius: '8px 8px 0 0',
  };

  const languageTagStyles: React.CSSProperties = {
    backgroundColor: '#3E4452',
    color: '#CCCCCC',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'sans-serif',
    transition: 'background-color 0.2s',
  };

  const selectStyles: React.CSSProperties = {
    backgroundColor: '#3E4452',
    color: '#CCCCCC',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'sans-serif',
    transition: 'background-color 0.2s',
  };

  const editorContainerStyles: React.CSSProperties = {
    position: 'relative',
    flex: 1,
    minHeight: '400px',
    overflow: 'hidden',
    backgroundColor: EDITOR_BG,
    borderRadius: '0 0 8px 8px',
  };

  const sharedTextStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: '16px',
    border: 'none',
    fontFamily: FONT_FAMILY,
    fontSize: `${FONT_SIZE}px`,
    lineHeight: LINE_HEIGHT,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflow: 'auto',
    boxSizing: 'border-box',
  };

  const highlightStyles: React.CSSProperties = {
    ...sharedTextStyles,
    color: EDITOR_TEXT_COLOR,
    backgroundColor: 'transparent',
    zIndex: 1,
    pointerEvents: 'none',
  };

  const textareaStyles: React.CSSProperties = {
    ...sharedTextStyles,
    color: 'transparent',
    caretColor: EDITOR_TEXT_COLOR,
    backgroundColor: 'transparent',
    zIndex: 2,
    resize: 'none',
    outline: 'none',
  };

  return (
    <div style={editorStyles}>
      <style>{generateHighlightStyles()}</style>
      <div style={headerStyles}>
        <span style={languageTagStyles}>{languageLabel}</span>
        <select
          value={language}
          onChange={handleLanguageSelectChange}
          style={selectStyles}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4E5462')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3E4452')}
        >
          {LANGUAGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div style={editorContainerStyles}>
        <pre
          ref={highlightRef}
          style={highlightStyles}
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlightedHtml || '<br/>' }}
        />
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onScroll={handleScroll}
          onPaste={handlePaste}
          style={textareaStyles}
          placeholder="在此输入或粘贴代码..."
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
};

export default CodeEditor;
