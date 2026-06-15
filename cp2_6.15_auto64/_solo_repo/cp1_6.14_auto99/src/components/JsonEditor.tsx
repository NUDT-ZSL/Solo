import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { highlightJson, isValidJson } from '../utils';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [isValid, setIsValid] = useState(true);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsValid(isValidJson(newValue));
    
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [onChange]);

  const handleScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const highlightedHtml = useMemo(() => {
    return highlightJson(value);
  }, [value]);

  useEffect(() => {
    setIsValid(isValidJson(value));
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="form-label">响应体 (JSON)</label>
        <span style={{ 
          fontSize: '12px', 
          color: isValid ? 'var(--method-get)' : 'var(--method-delete)',
          fontFamily: "'Fira Code', monospace"
        }}>
          {isValid ? '✓ 有效JSON' : '✗ 无效JSON'}
        </span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: '300px' }}>
        <pre
          ref={highlightRef}
          className="json-preview"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            marginTop: 0,
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || '&nbsp;' }}
        />
        <textarea
          ref={textareaRef}
          className="json-editor"
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          placeholder={placeholder || '{\n  "message": "Hello World"\n}'}
          spellCheck={false}
          style={{
            position: 'relative',
            color: 'transparent',
            caretColor: 'white',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
          }}
        />
      </div>
    </div>
  );
};
