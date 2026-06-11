import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  animationDelay?: number;
  isPlaying?: boolean;
  currentWordIndex?: number;
  onSpeak?: (text: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  animationDelay = 0,
  isPlaying: externalPlaying,
  currentWordIndex: externalWordIndex,
  onSpeak
}) => {
  const isUser = message.role === 'user';
  const [visible, setVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingWordIdx, setSpeakingWordIdx] = useState(-1);
  const waveRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  useEffect(() => {
    if (externalPlaying !== undefined) {
      setIsSpeaking(externalPlaying);
      if (externalWordIndex !== undefined) {
        setSpeakingWordIdx(externalWordIndex);
      }
    }
  }, [externalPlaying, externalWordIndex]);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingWordIdx(-1);
    } else {
      setIsSpeaking(true);
      onSpeak?.(message.content);
    }
  };

  const words = message.content.match(/\b[\w']+\b|[^\w\s]+/g) || [message.content];

  const renderContent = () => {
    if (isSpeaking) {
      return words.map((word, idx) => {
        const isSpace = word === ' ';
        const isHighlighted = idx === speakingWordIdx;
        return (
          <span
            key={idx}
            ref={(el) => { waveRefs.current[idx] = el; }}
            style={{
              display: isSpace ? 'inline' : 'inline-block',
              padding: isHighlighted && !isSpace ? '2px 6px' : '0',
              margin: '0 1px',
              borderRadius: '6px',
              background: isHighlighted && !isSpace
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                : 'transparent',
              color: isHighlighted && !isSpace ? '#FFFFFF' : 'inherit',
              fontWeight: isHighlighted ? 700 : 400,
              transition: 'all 0.15s ease',
              transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isHighlighted ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          >
            {word}
            {isSpace ? '' : ' '}
          </span>
        );
      });
    }
    return message.content;
  };

  const renderWaveform = () => {
    if (!isSpeaking) return null;
    const bars = 16;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '3px',
        height: '28px',
        marginTop: '8px',
        padding: '4px 0'
      }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              borderRadius: '2px',
              background: isUser
                ? 'linear-gradient(to top, #16A34A, #4ADE80)'
                : 'linear-gradient(to top, #2563EB, #60A5FA)',
              animation: `waveBar 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
              minHeight: '6px'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-start' : 'flex-end',
        marginBottom: '14px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div style={{ maxWidth: '80%', position: 'relative' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-start' : 'flex-end'
        }}>
          <div style={{
            fontSize: '0.7rem',
            color: '#94A3B8',
            fontWeight: 500,
            marginBottom: '4px',
            padding: '0 4px'
          }}>
            {isUser ? '👤 你' : '🤖 系统'}
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: isUser
                ? '20px 20px 20px 6px'
                : '20px 20px 6px 20px',
              background: isUser
                ? 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)'
                : 'linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)',
              color: isUser ? '#14532D' : '#1E3A5F',
              fontSize: 'clamp(0.9rem, 1.6vw, 1rem)',
              lineHeight: 1.6,
              fontWeight: 500,
              boxShadow: isUser
                ? '0 4px 14px rgba(34, 197, 94, 0.25)'
                : '0 4px 14px rgba(30, 58, 95, 0.1)',
              wordBreak: 'break-word'
            }}
          >
            {renderContent()}
            {renderWaveform()}
          </div>
          {!isUser && (
            <button
              onClick={handleSpeak}
              title={isSpeaking ? '停止播放' : '播放发音'}
              style={{
                marginTop: '6px',
                padding: '6px 12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: isSpeaking
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                color: isSpeaking ? '#FFFFFF' : '#2563EB',
                transition: 'all 0.2s ease',
                boxShadow: isSpeaking
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 2px 8px rgba(30, 58, 95, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {isSpeaking ? '停止播放' : '听发音示范'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
