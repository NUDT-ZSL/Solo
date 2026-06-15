import React, { useState } from 'react';
import { EmotionType, EMOTION_CONFIG } from '../types';

interface AddEntryFormProps {
  onSubmit: (text: string, amount: number, emotion: EmotionType) => void;
  collapsed?: boolean;
  onExpand?: () => void;
}

const AddEntryForm: React.FC<AddEntryFormProps> = ({ onSubmit, collapsed, onExpand }) => {
  const [text, setText] = useState('');
  const [amount, setAmount] = useState(100);
  const [emotion, setEmotion] = useState<EmotionType | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [ripple, setRipple] = useState<{ emotion: EmotionType; x: number; y: number } | null>(null);

  const handleEmotionClick = (e: React.MouseEvent<HTMLButtonElement>, type: EmotionType) => {
    setEmotion(type);
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ emotion: type, x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !emotion) return;

    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 100);

    onSubmit(text.trim(), amount, emotion);
    setText('');
    setAmount(100);
    setEmotion(null);
  };

  if (collapsed) {
    return (
      <div
        onClick={onExpand}
        style={{
          width: '100%',
          height: '50px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '14px',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        ✨ 点击展开记帐表单
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: '300px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeIn 0.3s ease-in-out',
        transform: isShaking ? 'translateX(3px)' : 'translateX(0)',
        transition: 'transform 0.1s ease-in-out',
      }}
    >
      <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
        📔 记录心情
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>心情文字</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          placeholder="写下此刻的心情..."
          style={{
            width: '100%',
            height: '100px',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            transition: 'all 0.2s ease-in-out',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
        />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textAlign: 'right' }}>
          {text.length}/200
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
          金额: <span style={{ color: EMOTION_CONFIG[emotion || 'happy'].color, fontWeight: 600 }}>¥{amount}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            appearance: 'none',
            background: `linear-gradient(to right, ${EMOTION_CONFIG[emotion || 'happy'].color} 0%, ${EMOTION_CONFIG[emotion || 'happy'].color} ${amount / 10}%, rgba(255,255,255,0.2) ${amount / 10}%, rgba(255,255,255,0.2) 100%)`,
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
          <span>¥0</span>
          <span>¥1000</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>情感标签</label>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          {(Object.keys(EMOTION_CONFIG) as EmotionType[]).map((type) => {
            const config = EMOTION_CONFIG[type];
            const isActive = emotion === type;
            return (
              <button
                key={type}
                type="button"
                onClick={(e) => handleEmotionClick(e, type)}
                title={config.label}
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: isActive ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.3)',
                  background: config.gradient,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-in-out',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isActive ? `0 0 16px ${config.color}aa` : 'none',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '16px' }}>
                  {type === 'happy' && '😊'}
                  {type === 'anxious' && '😰'}
                  {type === 'calm' && '😌'}
                  {type === 'surprised' && '🎉'}
                  {type === 'tired' && '😴'}
                </span>
                {ripple?.emotion === type && (
                  <span
                    style={{
                      position: 'absolute',
                      left: ripple.x,
                      top: ripple.y,
                      width: '0',
                      height: '0',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.6)',
                      transform: 'translate(-50%, -50%)',
                      animation: 'ripple 0.6s ease-out forwards',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {emotion && (
          <span style={{ color: EMOTION_CONFIG[emotion].color, fontSize: '12px', textAlign: 'center' }}>
            已选择: {EMOTION_CONFIG[emotion].label}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={!text.trim() || !emotion}
        style={{
          padding: '12px 20px',
          borderRadius: '10px',
          border: 'none',
          background: text.trim() && emotion
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: text.trim() && emotion ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease-in-out',
          opacity: text.trim() && emotion ? 1 : 0.5,
        }}
      >
        ✨ 记录这一刻
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 0.6; }
          100% { width: 100px; height: 100px; opacity: 0; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid ${EMOTION_CONFIG[emotion || 'happy'].color};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease-in-out;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid ${EMOTION_CONFIG[emotion || 'happy'].color};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease-in-out;
        }
        textarea::placeholder {
          color: rgba(255,255,255,0.4);
        }
      `}</style>
    </form>
  );
};

export default AddEntryForm;
