import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ControlPanel from './ControlPanel';
import PreviewArea from './PreviewArea';
import { TypographyParams, generateCSS, copyToClipboard, SAMPLE_TEXT } from './helpers';

const App: React.FC = () => {
  const [params, setParams] = useState<TypographyParams>({
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 24,
    lineHeight: 1.6,
    letterSpacing: 0,
    backgroundColor: '#FAFAFA',
    textColor: '#1A1A1A',
  });

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 960;
    }
    return false;
  });

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const sampleText = useMemo(() => SAMPLE_TEXT, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 960);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = useCallback((partial: Partial<TypographyParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
  }, []);

  const cssCode = useMemo(() => generateCSS(params), [params]);

  const handleCopy = async () => {
    const success = await copyToClipboard(cssCode);
    if (success) {
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const highlightedCSS = useMemo(() => {
    const lines = cssCode.split('\n');
    return lines.map((line, idx) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        return (
          <span key={idx}>
            {line}
            {idx < lines.length - 1 && <br />}
          </span>
        );
      }
      const property = line.slice(0, colonIdx + 1);
      const value = line.slice(colonIdx + 1);
      return (
        <span key={idx}>
          <span style={{ color: '#9CDCFE' }}>{property}</span>
          <span style={{ color: '#CE9178' }}>{value}</span>
          {idx < lines.length - 1 && <br />}
        </span>
      );
    });
  }, [cssCode]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1E1E1E',
        padding: isCompact ? 16 : 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isCompact ? 'column' : 'row',
          gap: isCompact ? 16 : 24,
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <ControlPanel params={params} onChange={handleChange} isCompact={isCompact} />
        <PreviewArea params={params} text={sampleText} />
      </div>

      <div
        style={{
          maxWidth: 1400,
          margin: `${isCompact ? 16 : 24}px auto 0`,
        }}
      >
        <div
          onClick={handleCopy}
          style={{
            backgroundColor: '#1E1E1E',
            color: '#DCDCDC',
            borderRadius: 8,
            padding: 20,
            position: 'relative',
            cursor: 'pointer',
            fontFamily: "'Roboto Mono', Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.8,
            border: '1px solid #3A3A3A',
            userSelect: 'none',
          }}
          title="点击复制CSS代码"
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 14,
              fontSize: 12,
              color: '#888',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {copied ? (
              <span
                style={{
                  color: '#1B5E20',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontWeight: 700,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}
              >
                ✓ 已复制
              </span>
            ) : (
              '点击复制'
            )}
          </div>
          <div style={{ paddingTop: 4 }}>{highlightedCSS}</div>
        </div>
      </div>
    </div>
  );
};

export default App;
