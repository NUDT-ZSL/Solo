import React, { useEffect, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { motion } from 'framer-motion';

const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  html: 'markup',
  css: 'css',
  typescript: 'typescript',
  java: 'java',
};

interface Props {
  code: string;
  language: string;
}

export default function CodeHighlight({ code, language }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prismLang = LANG_MAP[language.toLowerCase()] || 'javascript';

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[prismLang];
    if (!grammar) return Prism.util.encode(code);
    return Prism.highlight(code, grammar, prismLang);
  }, [code, prismLang]);

  const lines = useMemo(() => highlighted.split('\n'), [highlighted]);

  return (
    <div
      ref={containerRef}
      style={{
        background: '#1a1a2e',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <pre style={{ margin: 0, padding: '20px 20px 20px 0', background: 'transparent' }}>
          <code
            className={`language-${prismLang}`}
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 14,
              lineHeight: 1.7,
              background: 'transparent',
            }}
          >
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03, ease: 'easeOut' }}
                style={{ display: 'flex', minHeight: 24 }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 50,
                    minWidth: 50,
                    textAlign: 'right',
                    paddingRight: 16,
                    color: '#45475a',
                    userSelect: 'none',
                    fontSize: 12,
                    lineHeight: '1.7',
                    fontFamily: "'Fira Code', monospace",
                  }}
                >
                  {i + 1}
                </span>
                <span dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              </motion.div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
