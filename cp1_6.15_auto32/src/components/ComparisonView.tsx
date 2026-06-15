import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { SimplifiedSentence, SimplifiedWord } from '../types';

interface ComparisonViewProps {
  sentences: SimplifiedSentence[];
  highlightedSentenceId: string | null;
  onSentenceHover: (id: string | null) => void;
  speakingSentenceId: string | null;
  onSpeak: (sentence: string, id: string) => void;
  onStopSpeaking: () => void;
  onWordClick: (word: SimplifiedWord) => void;
}

interface TooltipState {
  word: SimplifiedWord;
  x: number;
  y: number;
}

const WordTooltip: React.FC<{ tooltip: TooltipState | null; onClose: () => void }> = ({ tooltip, onClose }) => {
  if (!tooltip) return null;
  const { word, x, y } = tooltip;

  return (
    <div className="word-tooltip" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <div className="tooltip-header">
        <span className="tooltip-original">{word.original}</span>
        <span className={`tooltip-level level-${word.level}`}>L{word.level}</span>
      </div>
      <div className="tooltip-simplified">→ {word.simplified}</div>
      <div className="tooltip-definition">{word.definition}</div>
      <button className="tooltip-close" onClick={onClose}>×</button>
    </div>
  );
};

const RippleEffect: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <span className="ripple-container">
      <span className="ripple ripple-1"></span>
      <span className="ripple ripple-2"></span>
      <span className="ripple ripple-3"></span>
    </span>
  );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  sentences,
  highlightedSentenceId,
  onSentenceHover,
  speakingSentenceId,
  onSpeak,
  onStopSpeaking,
  onWordClick,
}) => {
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newWidth = Math.min(Math.max(dragStartWidth.current + deltaPercent, 20), 80);
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const syncScroll = useCallback((source: 'left' | 'right') => {
    const src = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const tgt = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (src && tgt) {
      tgt.scrollTop = src.scrollTop;
    }
  }, []);

  const handleWordClick = useCallback((e: React.MouseEvent<HTMLSpanElement>, word: SimplifiedWord) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ word, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    onWordClick(word);
  }, [onWordClick]);

  useEffect(() => {
    if (!tooltip) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.word-tooltip') && !target.closest('.highlighted-word')) {
        setTooltip(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [tooltip]);

  const renderSentenceWithHighlights = (
    sentence: string,
    words: SimplifiedWord[],
    sentenceId: string
  ) => {
    if (words.length === 0) return <span>{sentence}</span>;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedWords = [...words].sort((a, b) => {
      const aIdx = sentence.toLowerCase().indexOf(a.simplified.toLowerCase());
      const bIdx = sentence.toLowerCase().indexOf(b.simplified.toLowerCase());
      return aIdx - bIdx;
    });

    for (let i = 0; i < sortedWords.length; i++) {
      const wordInfo = sortedWords[i];
      const wordLower = wordInfo.simplified.toLowerCase();
      const sentenceLower = sentence.toLowerCase();

      let startIndex = -1;
      let searchFrom = lastIndex;

      while (searchFrom <= sentenceLower.length - wordLower.length) {
        const foundIndex = sentenceLower.indexOf(wordLower, searchFrom);
        if (foundIndex === -1) break;

        const charBefore = foundIndex > 0 ? sentence[foundIndex - 1] : ' ';
        const charAfter = foundIndex + wordLower.length < sentence.length
          ? sentence[foundIndex + wordLower.length] : ' ';

        if (!/[a-zA-Z]/.test(charBefore) && !/[a-zA-Z]/.test(charAfter)) {
          startIndex = foundIndex;
          break;
        }
        searchFrom = foundIndex + 1;
      }

      if (startIndex === -1 || startIndex < lastIndex) continue;

      if (startIndex > lastIndex) {
        parts.push(<span key={`t-${sentenceId}-${i}`}>{sentence.slice(lastIndex, startIndex)}</span>);
      }

      parts.push(
        <span
          key={`w-${sentenceId}-${i}`}
          className="highlighted-word"
          onClick={(e) => handleWordClick(e, wordInfo)}
        >
          {sentence.slice(startIndex, startIndex + wordInfo.simplified.length)}
        </span>
      );

      lastIndex = startIndex + wordInfo.simplified.length;
    }

    if (lastIndex < sentence.length) {
      parts.push(<span key={`t-${sentenceId}-end`}>{sentence.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const handleSpeakAll = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingIndex(null);
      onStopSpeaking();
      return;
    }

    setIsSpeaking(true);
    let idx = 0;

    const speakNext = () => {
      if (idx >= sentences.length) {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(null);
        return;
      }

      const s = sentences[idx];
      const id = `sentence-${idx}`;
      setCurrentSpeakingIndex(idx);
      onSentenceHover(id);

      const utt = new SpeechSynthesisUtterance(s.original);
      utt.rate = 0.9;
      utt.onend = () => { idx++; setTimeout(speakNext, 300); };
      utt.onerror = () => { setIsSpeaking(false); setCurrentSpeakingIndex(null); onStopSpeaking(); };
      window.speechSynthesis?.speak(utt);
    };

    speakNext();
  }, [isSpeaking, sentences, onSentenceHover, onStopSpeaking]);

  const handleSpeakSingle = useCallback((sentence: string, index: number) => {
    window.speechSynthesis?.cancel();
    const id = `sentence-${index}`;
    setCurrentSpeakingIndex(index);
    onSpeak(sentence, id);

    const utt = new SpeechSynthesisUtterance(sentence);
    utt.rate = 0.9;
    utt.onend = () => { setCurrentSpeakingIndex(null); onStopSpeaking(); };
    utt.onerror = () => { setCurrentSpeakingIndex(null); onStopSpeaking(); };
    window.speechSynthesis?.speak(utt);
  }, [onSpeak, onStopSpeaking]);

  if (!sentences || sentences.length === 0) {
    return (
      <div className="comparison-empty">
        <p>请先输入文章并点击分析，查看左右对照阅读效果</p>
      </div>
    );
  }

  return (
    <div className="comparison-view" ref={containerRef}>
      <div className="comparison-header">
        <h2>对照阅读</h2>
        <button className={`speak-all-btn ${isSpeaking ? 'speaking' : ''}`} onClick={handleSpeakAll}>
          {isSpeaking ? '⏹ 停止朗读' : '▶ 全文朗读'}
        </button>
      </div>

      <div className="comparison-content">
        <div className="column original-column" style={{ width: `${leftWidth}%` }}>
          <div className="column-header"><span className="column-title">原文</span></div>
          <div
            className="column-content"
            ref={leftScrollRef}
            onScroll={() => syncScroll('left')}
          >
            {sentences.map((sentence, index) => {
              const id = `sentence-${index}`;
              const isHighlighted = highlightedSentenceId === id;
              const isSpeakingSentence = currentSpeakingIndex === index;
              return (
                <div
                  key={id}
                  className={`sentence ${isHighlighted ? 'highlighted' : ''} ${isSpeakingSentence ? 'speaking' : ''}`}
                  onMouseEnter={() => onSentenceHover(id)}
                  onMouseLeave={() => onSentenceHover(null)}
                  onClick={() => handleSpeakSingle(sentence.original, index)}
                >
                  <RippleEffect active={isSpeakingSentence} />
                  <span className="sentence-text">{sentence.original}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`divider ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
        >
          <div className="divider-handle">
            <span className="divider-dot"></span>
            <span className="divider-dot"></span>
            <span className="divider-dot"></span>
          </div>
        </div>

        <div className="column simplified-column" style={{ width: `${100 - leftWidth}%` }}>
          <div className="column-header"><span className="column-title">简化版</span></div>
          <div
            className="column-content"
            ref={rightScrollRef}
            onScroll={() => syncScroll('right')}
          >
            {sentences.map((sentence, index) => {
              const id = `sentence-${index}`;
              const isHighlighted = highlightedSentenceId === id;
              const isSpeakingSentence = currentSpeakingIndex === index;
              return (
                <div
                  key={id}
                  className={`sentence ${isHighlighted ? 'highlighted' : ''} ${isSpeakingSentence ? 'speaking' : ''}`}
                  onMouseEnter={() => onSentenceHover(id)}
                  onMouseLeave={() => onSentenceHover(null)}
                  onClick={() => handleSpeakSingle(sentence.simplified, index)}
                >
                  <RippleEffect active={isSpeakingSentence} />
                  <span className="sentence-text">
                    {renderSentenceWithHighlights(sentence.simplified, sentence.words, id)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <WordTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />

      <style>{`
        .comparison-view {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .comparison-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #f0f0f0;
        }
        .comparison-header h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        .speak-all-btn {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #4A90D9;
          color: #4A90D9;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .speak-all-btn:hover { background: #f0f7ff; }
        .speak-all-btn.speaking { background: #4A90D9; color: #fff; }

        .comparison-content {
          display: flex;
          height: 500px;
          position: relative;
        }
        .column {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .column-header {
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #f0f0f0;
        }
        .column-title {
          font-size: 14px;
          font-weight: 500;
          color: #666;
        }
        .column-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .sentence {
          position: relative;
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          background-color: #fafafa;
          border: 2px solid transparent;
          line-height: 1.8;
          font-size: 15px;
        }
        .sentence:hover {
          background-color: #f0f0f0;
        }
        .sentence.highlighted {
          background-color: #fff9e6 !important;
          box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.3);
        }
        .sentence.highlighted:hover {
          background-color: #fff3cc !important;
        }
        .sentence.speaking {
          border-color: #4CAF50;
          background-color: #f1f8e9 !important;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.2);
        }
        .sentence-text {
          position: relative;
          z-index: 1;
        }

        .highlighted-word {
          color: #4A90D9;
          background-color: rgba(74, 144, 217, 0.12);
          padding: 1px 3px;
          border-bottom: 1.5px dashed #4A90D9;
          cursor: pointer;
          transition: background-color 0.2s ease, border-bottom-color 0.2s ease;
          font-weight: 500;
          border-radius: 2px;
        }
        .highlighted-word:hover {
          background-color: rgba(74, 144, 217, 0.25);
          border-bottom-style: solid;
        }

        .divider {
          width: 8px;
          background: #f0f0f0;
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }
        .divider:hover, .divider.dragging {
          background: #4A90D9;
        }
        .divider-handle {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 2px;
          border-radius: 4px;
          background: rgba(255,255,255,0.6);
        }
        .divider-dot {
          width: 3px;
          height: 3px;
          background: #bbb;
          border-radius: 50%;
          transition: background 0.2s ease;
        }
        .divider:hover .divider-dot, .divider.dragging .divider-dot {
          background: #fff;
        }

        .word-tooltip {
          position: fixed;
          transform: translateX(-50%);
          background: #fff;
          border-radius: 10px;
          padding: 14px 18px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.15);
          z-index: 1000;
          min-width: 200px;
          animation: tooltipIn 0.2s ease;
          border: 1px solid #f0f0f0;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tooltip-original {
          font-size: 17px;
          font-weight: 600;
          color: #333;
        }
        .tooltip-level {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .tooltip-level.level-1 { background: #e8f5e9; color: #4CAF50; }
        .tooltip-level.level-2 { background: #fff3e0; color: #FF9800; }
        .tooltip-level.level-3 { background: #fce4ec; color: #e91e63; }
        .tooltip-level.level-4 { background: #f3e5f5; color: #9c27b0; }
        .tooltip-level.level-5 { background: #e8eaf6; color: #3f51b5; }
        .tooltip-simplified {
          font-size: 14px;
          color: #4A90D9;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .tooltip-definition {
          font-size: 13px;
          color: #666;
        }
        .tooltip-close {
          position: absolute;
          top: 6px;
          right: 8px;
          border: none;
          background: none;
          font-size: 16px;
          color: #999;
          cursor: pointer;
          padding: 2px;
          line-height: 1;
        }
        .tooltip-close:hover { color: #333; }

        .ripple-container {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          overflow: hidden;
          border-radius: 8px;
        }
        .ripple {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid #4CAF50;
          border-radius: 8px;
          opacity: 0;
          animation: rippleExpand 1.5s ease-out infinite;
        }
        .ripple-1 { animation-delay: 0s; }
        .ripple-2 { animation-delay: 0.5s; }
        .ripple-3 { animation-delay: 1s; }
        @keyframes rippleExpand {
          0% { width: 20%; height: 20%; opacity: 0.6; }
          100% { width: 100%; height: 100%; opacity: 0; }
        }

        .comparison-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .comparison-empty p { color: #999; font-size: 14px; }

        .column-content::-webkit-scrollbar { width: 6px; }
        .column-content::-webkit-scrollbar-track { background: #f1f1f1; }
        .column-content::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .column-content::-webkit-scrollbar-thumb:hover { background: #bbb; }
      `}</style>
    </div>
  );
};
