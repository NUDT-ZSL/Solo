import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMathJax } from 'mathjax-react';

interface LaTeXPreviewProps {
  latex: string;
  onChange: (latex: string) => void;
  resetKey?: number;
}

const MATHJAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';

const LaTeXPreview: React.FC<LaTeXPreviewProps> = ({ latex, onChange, resetKey }) => {
  const [inputValue, setInputValue] = useState(latex);
  const [displayLatex, setDisplayLatex] = useState(latex);
  const [fadeIn, setFadeIn] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const lastRenderedRef = useRef<string>('');
  const contentKeyRef = useRef(0);

  const { renderedHTML, getProps, error } = useMathJax({
    src: displayLatex || ' ',
    lang: 'tex',
    display: true,
    settings: {
      src: MATHJAX_SRC
    }
  });

  useEffect(() => {
    if (renderedHTML && renderedHTML !== lastRenderedRef.current) {
      lastRenderedRef.current = renderedHTML;
      setFadeIn(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeIn(true);
        });
      });
    }
  }, [renderedHTML]);

  useEffect(() => {
    setInputValue(latex);
    setDisplayLatex(latex);
    contentKeyRef.current += 1;
    setFadeIn(false);
  }, [latex, resetKey]);

  useEffect(() => {
    contentKeyRef.current += 1;
    setFadeIn(false);
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
    if (error) {
      return (
        <span style={{ color: '#e74c3c', fontSize: 14, fontFamily: 'monospace' }}>
          {displayLatex}
        </span>
      );
    }
    return (
      <div
        key={contentKeyRef.current}
        {...getProps()}
        style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
    );
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
        {renderContent()}
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
