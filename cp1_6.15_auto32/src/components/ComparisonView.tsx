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

const WordTooltip: React.FC<{ tooltip: TooltipState | null }> = ({ tooltip }) => {
  if (!tooltip) return null;

  const { word, x, y } = tooltip;

  return (
    <div
      className="word-tooltip"
      style={{ left: x, top: y }}
    >
      <div className="tooltip-header">
        <span className="tooltip-original">{word.original}</span>
        <span className={`tooltip-level level-${word.level}`}>L{word.level}</span>
      </div>
      <div className="tooltip-simplified">→ {word.simplified}</div>
      <div className="tooltip-definition">{word.definition}</div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newWidth = Math.min(Math.max(dragStartWidth.current + deltaPercent, 20), 80);
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleWordClick = useCallback((e: React.MouseEvent<HTMLSpanElement>, word: SimplifiedWord) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom + 8;
    
    setTooltip({ word, x, y });
    onWordClick(word);
  }, [onWordClick]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltip) {
        setTooltip(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [tooltip]);

  const renderSentenceWithHighlights = (
    sentence: string,
    words: SimplifiedWord[],
    sentenceId: string
  ) => {
    if (words.length === 0) {
      return <span>{sentence}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedWords = [...words].sort((a, b) => {
      const aIndex = sentence.toLowerCase().indexOf(a.simplified.toLowerCase());
      const bIndex = sentence.toLowerCase().indexOf(b.simplified.toLowerCase());
      return aIndex - bIndex;
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
          ? sentence[foundIndex + wordLower.length] 
          : ' ';
        
        if (!/[a-zA-Z]/.test(charBefore) && !/[a-zA-Z]/.test(charAfter)) {
          startIndex = foundIndex;
          break;
        }
        
        searchFrom = foundIndex + 1;
      }

      if (startIndex === -1 || startIndex < lastIndex) {
        continue;
      }

      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${sentenceId}-${i}`}>
            {sentence.slice(lastIndex, startIndex)}
          </span>
        );
      }

      parts.push(
        <span
          key={`word-${sentenceId}-${i}`}
          className="highlighted-word"
          onClick={(e) => handleWordClick(e, wordInfo)}
        >
          {sentence.slice(startIndex, startIndex + wordInfo.simplified.length)}
        </span>
      );

      lastIndex = startIndex + wordInfo.simplified.length;
    }

    if (lastIndex < sentence.length) {
      parts.push(
        <span key={`text-${sentenceId}-end`}>
          {sentence.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState<number | null>(null);

  const handleSpeakAll = useCallback(() => {
    if (isSpeaking) {
      onStopSpeaking();
      setIsSpeaking(false);
      setCurrentSpeakingIndex(null);
      window.speechSynthesis?.cancel();
      return;
    }

    setIsSpeaking(true);
    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= sentences.length) {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(null);
        return;
      }

      const sentence = sentences[currentIndex];
      const id = `sentence-${currentIndex}`;
      setCurrentSpeakingIndex(currentIndex);
      onSentenceHover(id);

      const utterance = new SpeechSynthesisUtterance(sentence.original);
      utterance.rate = 0.9;
      utterance.onend = () => {
        currentIndex++;
        setTimeout(speakNext, 300);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingIndex(null);
        onStopSpeaking();
      };

      window.speechSynthesis?.speak(utterance);
    };

    speakNext();
  }, [isSpeaking, sentences, onSentenceHover, onStopSpeaking]);

  const handleSpeakSingle = useCallback((sentence: string, index: number) => {
    window.speechSynthesis?.cancel();
    
    const id = `sentence-${index}`;
    setCurrentSpeakingIndex(index);
    onSpeak(sentence, id);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 0.9;
    utterance.onend = () => {
      setCurrentSpeakingIndex(null);
      onStopSpeaking();
    };
    utterance.onerror = () => {
      setCurrentSpeakingIndex(null);
      onStopSpeaking();
    };

    window.speechSynthesis?.speak(utterance);
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
        <button
          className={`speak-all-btn ${isSpeaking ? 'speaking' : ''}`}
          onClick={handleSpeakAll}
        >
          {isSpeaking ? '⏹ 停止朗读' : '▶ 全文朗读'}
        </button>
      </div>

      <div className="comparison-content">
        <div 
          className="column original-column"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="column-header">
            <span className="column-title">原文</span>
          </div>
          <div className="column-content">
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

        <div 
          className="column simplified-column"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="column-header">
            <span className="column-title">简化版</span>
          </div>
          <div className="column-content">
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

      <WordTooltip tooltip={tooltip} />

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
        
        .speak-all-btn:hover {
          background: #f0f7ff;
        }
        
        .speak-all-btn.speaking {
          background: #4A90D9;
          color: #fff;
        }
        
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
        
        .original-column .column-header {
          border-right: none;
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
          transition: background-color 0.2s ease, border-color 0.2s ease;
          background: #fafafa;
          border: 2px solid transparent;
          line-height: 1.8;
          font-size: 15px;
        }
        
        .sentence:hover {
          background: #f5f5f5;
        }
        
        .sentence.highlighted {
          background-color: #fff9e6;
        }
        
        .sentence.speaking {
          border-color: #4CAF50;
          background-color: #f1f8e9;
        }
        
        .sentence-text {
          position: relative;
          z-index: 1;
        }
        
        .highlighted-word {
          color: #4A90D9;
          background-color: rgba(74, 144, 217, 0.1);
          padding: 0 2px;
          border-bottom: 1.5px dashed #4A90D9;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .highlighted-word:hover {
          background-color: rgba(74, 144, 217, 0.2);
        }
        
        .divider {
          width: 6px;
          background: #f0f0f0;
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }
        
        .divider:hover,
        .divider.dragging {
          background: #4A90D9;
        }
        
        .divider-handle {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 2px;
          border-radius: 4px;
          background: rgba(255,255,255,0.5);
        }
        
        .divider-dot {
          width: 3px;
          height: 3px;
          background: #999;
          border-radius: 50%;
          transition: background 0.2s ease;
        }
        
        .divider:hover .divider-dot,
        .divider.dragging .divider-dot {
          background: #fff;
        }
        
        .word-tooltip {
          position: fixed;
          transform: translateX(-50%);
          background: #fff;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 1000;
          min-width: 180px;
          animation: tooltipFadeIn 0.2s ease;
        }
        
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .tooltip-original {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .tooltip-level {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .tooltip-level.level-1 {
          background: #e8f5e9;
          color: #4CAF50;
        }
        
        .tooltip-level.level-2 {
          background: #fff3e0;
          color: #FF9800;
        }
        
        .tooltip-level.level-3 {
          background: #fce4ec;
          color: #e91e63;
        }
        
        .tooltip-level.level-4 {
          background: #f3e5f5;
          color: #9c27b0;
        }
        
        .tooltip-level.level-5 {
          background: #e8eaf6;
          color: #3f51b5;
        }
        
        .tooltip-simplified {
          font-size: 14px;
          color: #4A90D9;
          margin-bottom: 4px;
        }
        
        .tooltip-definition {
          font-size: 13px;
          color: #666;
        }
        
        .ripple-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          border-radius: 8px;
        }
        
        .ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid #4CAF50;
          border-radius: 8px;
          opacity: 0;
          animation: rippleExpand 1.5s ease-out infinite;
        }
        
        .ripple-1 {
          animation-delay: 0s;
        }
        
        .ripple-2 {
          animation-delay: 0.5s;
        }
        
        .ripple-3 {
          animation-delay: 1s;
        }
        
        @keyframes rippleExpand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.8;
          }
          100% {
            width: 100%;
            height: 100%;
            opacity: 0;
          }
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
        
        .comparison-empty p {
          color: #999;
          font-size: 14px;
        }
        
        .column-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .column-content::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .column-content::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .column-content::-webkit-scrollbar-thumb:hover {
          background: #bbb;
        }
      `}</style>
    </div>
  );
};
