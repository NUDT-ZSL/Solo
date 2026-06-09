import React, { useState, useEffect, useRef } from 'react';
import { usePoem } from '../App';

const PoemAnimation: React.FC = () => {
  const { playingPoem, poemLines, cards } = usePoem();
  const [displayLines, setDisplayLines] = useState<{ text: string; visible: boolean }[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    if (!playingPoem) {
      setDisplayLines([]);
      return;
    }

    const newLines: { text: string; visible: boolean }[] = poemLines.map((l) => ({ text: '', visible: true }));
    setDisplayLines(newLines);

    let totalDelay = 0;
    poemLines.forEach((line, lineIdx) => {
      [...line].forEach((char, charIdx) => {
        const timer = window.setTimeout(() => {
          setDisplayLines((prev) => {
            const next = [...prev];
            if (next[lineIdx]) {
              next[lineIdx] = { ...next[lineIdx], text: line.slice(0, charIdx + 1) };
            }
            return next;
          });
        }, totalDelay + charIdx * 300);
        timersRef.current.push(timer);
      });
      totalDelay += line.length * 300 + 500;
    });

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [playingPoem, poemLines]);

  if (!playingPoem || poemLines.length === 0) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(5,5,25,0.92) 0%, rgba(15,15,50,0.92) 100%)',
    backdropFilter: 'blur(8px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    animation: 'fadeIn 0.5s ease'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(255,215,0,0.6)',
    letterSpacing: 8,
    marginBottom: 48,
    fontWeight: 300
  };

  const poemContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    maxWidth: '70%'
  };

  const lineStyle: React.CSSProperties = {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 300,
    letterSpacing: 6,
    lineHeight: 1.8,
    textShadow: '0 0 20px rgba(255,255,255,0.2), 0 4px 20px rgba(0,0,0,0.5)',
    textAlign: 'center',
    minHeight: 50
  };

  const cursorStyle = (visible: boolean): React.CSSProperties => ({
    display: 'inline-block',
    width: 2,
    height: 28,
    background: 'rgba(255,215,0,0.8)',
    marginLeft: 4,
    verticalAlign: 'middle',
    animation: visible ? 'blink 0.8s infinite' : 'none',
    opacity: visible ? 1 : 0
  });

  const footerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 4
  };

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(255,215,0,0.3), 0 4px 20px rgba(0,0,0,0.5); }
          50% { text-shadow: 0 0 40px rgba(255,215,0,0.6), 0 4px 30px rgba(0,0,0,0.5); }
        }
      `}</style>

      <div style={titleStyle}>— 织言诗笺 —</div>

      <div style={poemContainerStyle}>
        {displayLines.map((line, idx) => {
          const isLastActive =
            idx === displayLines.length - 1 ||
            (line.text.length < (poemLines[idx]?.length || 0));
          return (
            <div key={idx} style={{ ...lineStyle, opacity: line.text ? 1 : 0, transition: 'opacity 0.3s' }}>
              {line.text}
              {line.text.length > 0 && line.text.length === (poemLines[idx]?.length || 0) && idx === displayLines.length - 1 && (
                <span style={cursorStyle(true)} />
              )}
            </div>
          );
        })}
      </div>

      <div style={footerStyle}>共 {cards.length} 词 · {poemLines.length} 行</div>
    </div>
  );
};

export default PoemAnimation;
