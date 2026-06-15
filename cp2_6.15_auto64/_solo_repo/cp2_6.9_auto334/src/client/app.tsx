import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FogRenderer } from './fogRenderer';
import HistoryPanel, { Message, Emotion } from './historyPanel';
import './app.css';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showResetNotice, setShowResetNotice] = useState<boolean>(false);

  const fogContainerRef = useRef<HTMLDivElement>(null);
  const fogRendererRef = useRef<FogRenderer | null>(null);

  useEffect(() => {
    if (fogContainerRef.current) {
      const canvas = fogContainerRef.current.querySelector('canvas');
      if (canvas) {
        fogRendererRef.current = new FogRenderer(canvas);
      }
    }
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        const data: Message[] = await res.json();
        setMessages(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (fogRendererRef.current) {
        fogRendererRef.current.triggerDissolve();
        setTimeout(() => {
          fogRendererRef.current?.reset();
          setShowResetNotice(true);
          setTimeout(() => setShowResetNotice(false), 5000);
          setMessages([]);
        }, 10000);
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const playResonanceSound = useCallback((emotion: Emotion) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 6);

      const frequencies: Record<Emotion, [number, number]> = {
        joy: [523.25, 659.25],
        sadness: [261.63, 329.63],
        confusion: [392, 466.16],
        anger: [440, 523.25],
      };

      const [freq1, freq2] = frequencies[emotion];

      const osc1 = audioContext.createOscillator();
      osc1.frequency.value = freq1;
      osc1.type = 'sine';
      osc1.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const osc2 = audioContext.createOscillator();
      osc2.frequency.value = freq2;
      osc2.type = 'sine';
      osc2.connect(gainNode);

      osc1.start();
      osc2.start();
      osc1.stop(audioContext.currentTime + 6);
      osc2.stop(audioContext.currentTime + 6);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedEmotion || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputText, emotion: selectedEmotion }),
      });
      const data = await res.json();
      const newMessage: Message = data.message;
      setMessages((prev) => [newMessage, ...prev]);
      fogRendererRef.current?.triggerEmotion(selectedEmotion, newMessage.content);
      setInputText('');
      setSelectedEmotion(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleResonate = async (messageId: string) => {
    try {
      const res = await fetch('/api/resonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!data.success) return;
      const { targetMessage, matchedMessage }: { targetMessage: Message; matchedMessage: Message } = data;
      fogRendererRef.current?.triggerResonate(targetMessage.emotion, matchedMessage.emotion);
      playResonanceSound(targetMessage.emotion);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? targetMessage : m))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleHoverMessage = useCallback((message: Message) => {
    fogRendererRef.current?.triggerReplay(message.emotion);
  }, []);

  const handleHoverEnd = useCallback(() => {
  }, []);

  const emotions: { key: Emotion; label: string }[] = [
    { key: 'joy', label: '喜悦' },
    { key: 'sadness', label: '忧伤' },
    { key: 'confusion', label: '疑惑' },
    { key: 'anger', label: '愤怒' },
  ];

  return (
    <div className="app-container">
      <div className="left-space"></div>
      <div className="center-area">
        <div className="fog-container" ref={fogContainerRef}>
          <span className="floating-label">雾语者</span>
          <canvas width={600} height={500}></canvas>
          {showResetNotice && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '16px 32px',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              letterSpacing: '2px',
            }}>
              雾已散尽，新的开始
            </div>
          )}
        </div>
        <div className="input-area">
          <div className="emotion-buttons">
            {emotions.map((e) => (
              <button
                key={e.key}
                className={`emotion-btn ${e.key} ${selectedEmotion === e.key ? 'active' : ''}`}
                onClick={() => setSelectedEmotion(e.key)}
              >
                {e.label}
              </button>
            ))}
          </div>
          <textarea
            className="text-input"
            value={inputText}
            maxLength={80}
            placeholder="将你的情绪写入雾中...（80字以内）"
            onChange={(e) => setInputText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {inputText.length}/80
            </span>
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || !selectedEmotion || isSending}
            >
              {isSending ? '发送中...' : '化入雾中'}
            </button>
          </div>
        </div>
      </div>
      <div className="right-panel">
        <HistoryPanel
          messages={messages}
          onHover={handleHoverMessage}
          onHoverEnd={handleHoverEnd}
          onResonate={handleResonate}
          showResetNotice={showResetNotice}
        />
      </div>
    </div>
  );
};

export default App;
