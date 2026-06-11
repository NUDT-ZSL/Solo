import React, { useEffect, useRef } from 'react';
import { ChatBubble } from './ChatBubble';
import { RecordingButton } from './RecordingButton';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { ChatMessage, Topic } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  topic: Topic | null;
  isRecording: boolean;
  isProcessing: boolean;
  isRecognitionSupported: boolean;
  liveTranscript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSpeak: (messageId: string, text: string) => void;
  playingMessageId: string | null;
  onRestart: () => void;
  onBackToTopics: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  topic,
  isRecording,
  isProcessing,
  isRecognitionSupported,
  liveTranscript,
  onStartRecording,
  onStopRecording,
  onSpeak,
  playingMessageId,
  onRestart,
  onBackToTopics
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, liveTranscript]);

  return (
    <div className="card" style={{
      height: 'calc(100vh - 180px)',
      minHeight: '600px',
      display: 'flex',
      flexDirection: 'column',
      padding: 0
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
          minWidth: 0
        }}>
          <button
            onClick={onBackToTopics}
            style={{
              padding: '8px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: '#F1F5F9',
              color: '#1E3A5F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="返回主题选择"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E2E8F0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              fontWeight: 700,
              color: '#1E3A5F',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              <span>{topic?.name || '对话模式'}</span>
            </h3>
            <p style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {topic?.description || ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onRestart}
            style={{
              padding: '10px 16px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              color: '#92400E',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(161, 98, 7, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(161, 98, 7, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(161, 98, 7, 0.15)';
            }}
          >
            <RotateCcw size={14} />
            重新开始
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'linear-gradient(180deg, #FAFBFC 0%, #F8FAFC 100%)'
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#94A3B8',
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '16px',
              animation: 'bounce 2s ease-in-out infinite'
            }}>
              💬
            </div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#64748B',
              marginBottom: '8px'
            }}>
              对话即将开始...
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '320px' }}>
              系统正在准备对话，请点击下方录音按钮开始回答问题
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                animationDelay={idx * 80}
                isPlaying={playingMessageId === msg.id}
                onSpeak={(text) => onSpeak(msg.id, text)}
              />
            ))}
          </>
        )}

        {(isRecording || liveTranscript) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '14px'
            }}
          >
            <div style={{ maxWidth: '80%' }}>
              <div style={{
                fontSize: '0.7rem',
                color: '#94A3B8',
                fontWeight: 500,
                marginBottom: '4px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>👤 正在输入</span>
                {isRecording && (
                  <span style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="animate-bounce-dot"
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          animationDelay: `${i * 0.15}s`
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '20px 20px 20px 6px',
                  background: isRecording
                    ? 'linear-gradient(135deg, rgba(134, 239, 172, 0.6), rgba(74, 222, 128, 0.6))'
                    : 'linear-gradient(135deg, #DCFCE7, #BBF7D0)',
                  color: '#14532D',
                  fontSize: 'clamp(0.9rem, 1.6vw, 1rem)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.15)',
                  minHeight: '44px'
                }}
              >
                {liveTranscript || (
                  <span style={{ color: '#16A34A', fontStyle: 'italic' }}>
                    正在聆听您的回答...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '20px 24px 24px',
        borderTop: '1px solid #E2E8F0',
        background: '#FFFFFF',
        borderRadius: '0 0 20px 20px'
      }}>
        <RecordingButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          isSupported={isRecognitionSupported}
          onStart={onStartRecording}
          onStop={onStopRecording}
          disabled={messages.length === 0 || isProcessing}
        />
      </div>
    </div>
  );
};
