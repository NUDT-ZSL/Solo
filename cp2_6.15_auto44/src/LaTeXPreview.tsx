import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MathJax, MathJaxContext } from 'mathjax-react';

interface LaTeXPreviewProps {
  latex: string;
  onChange: (latex: string) => void;
  resetKey?: number;
}

const LaTeXPreview: React.FC<LaTeXPreviewProps> = ({ latex, onChange, resetKey }) => {
  const [inputValue, setInputValue] = useState(latex);
  const [displayLatex, setDisplayLatex] = useState(latex);
  const [fadeIn, setFadeIn] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setInputValue(latex);
    setDisplayLatex(latex);
    setFadeIn(false);
    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = window.setTimeout(() => {
      setFadeIn(true);
      fadeTimerRef.current = null;
    }, 20);
  }, [latex, resetKey]);

  useEffect(() => {
    setFadeIn(false);
    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = window.setTimeout(() => {
      setFadeIn(true);
      fadeTimerRef.current = null;
    }, 20);
  }, [displayLatex]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      setDisplayLatex(value);
      onChange(value);
    }, 500);
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (fadeTimerRef.current !== null) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  const renderContent = () => {
    if (!displayLatex.trim()) {
      return (
        <span style={{ color: '#aaa', fontSize: 16, fontStyle: 'italic' }}>
          请在左侧书写数学公式...
        </span>
      );
    }
    try {
      return <MathJax>{displayLatex}</MathJax>;
    } catch {
      return (
        <span style={{ color: '#e74c3c', fontSize: 14, fontFamily: 'monospace' }}>
          {displayLatex}
        </span>
      );
    }
  };

  return (
    <div
      style={{
        width: 440,
        height: 320,
        borderRadius: 16,
        backgroundColor: '#fafafa',
        border: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '8px 4px',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          minHeight: 0
        }}
      >
        <MathJaxContext>
          {renderContent()}
        </MathJaxContext>
      </div>
      <textarea
        value={inputValue}
        onChange={handleChange}
        placeholder="LaTeX 代码..."
        spellCheck={false}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 8,
          border: '2px solid #ccc',
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: 16,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
          color: '#333',
          transition: 'border-color 0.2s ease'
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#6c63ff'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#ccc'; }}
      />
    </div>
  );
};

export default LaTeXPreview;
