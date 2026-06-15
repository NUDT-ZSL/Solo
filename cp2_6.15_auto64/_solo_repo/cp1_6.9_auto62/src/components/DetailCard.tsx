import { useEffect, useRef, useState } from 'react';
import type { Entry, EmotionTag, TasteTag } from '../App';

interface DetailCardProps {
  entry: Entry;
  emotionColorMap: Record<EmotionTag, string>;
  onClose: () => void;
  flyFromPoint: { x: number; y: number } | null;
}

const musicTemplates: Record<EmotionTag, string[]> = {
  '喜': [
    '今日心情似{food}，{taste}意中洋溢着阳光的温度',
    '心情如{food}般{adj}，每一口都是雀跃的音符',
    '情绪像{food}的{color}色光泽，闪耀着快乐的光芒'
  ],
  '怒': [
    '今日心情似{food}，{taste}味中藏着滚烫的波澜',
    '情绪如{food}般{adj}，在舌尖掀起汹涌的浪涛',
    '心情像{food}的{color}色热焰，燃烧着内心的悸动'
  ],
  '哀': [
    '今日心情似{food}，{taste}涩中带着淡淡的思绪',
    '情绪如{food}般{adj}，静谧中流淌着温柔的忧伤',
    '心情像{food}的{color}色烟雨，朦胧中泛起涟漪'
  ],
  '乐': [
    '今日心情似{food}，{taste}美中沁着满足的惬意',
    '情绪如{food}般{adj}，缓缓舒展在慵懒的午后',
    '心情像{food}的{color}色田园，盛放心底的安然'
  ],
  '平静': [
    '今日心情似{food}，{taste}淡中蕴含生活的本真',
    '情绪如{food}般{adj}，如水般流淌在时光里',
    '心情像{food}的{color}色薄雾，轻盈而不着痕迹'
  ]
};

const tasteAdjectives: Record<TasteTag, string> = {
  '甜': '甜蜜',
  '咸': '醇厚',
  '辣': '浓烈',
  '苦': '清苦'
};

const colorNames: Record<string, string> = {
  '#8B4513': '棕褐', '#FF6B6B': '樱粉', '#E74C3C': '朱红',
  '#90EE90': '嫩绿', '#FFB6C1': '粉桃', '#FF4500': '赤橙',
  '#4A3728': '咖啡', '#FFD700': '金耀', '#F5DEB3': '麦浪',
  '#D2691E': '焦糖', '#DC143C': '绯红', '#556B2F': '苔青',
  '#DAA520': '金棕', '#8B7355': '摩卡', '#D2B48C': '奶咖',
  '#FFE4E1': '乳白', '#B22222': '烈焰', '#FFF8DC': '象牙',
  '#FFFAF0': '素白', '#FF6347': '珊瑚', '#6B4423': '浓巧',
  '#FF8C00': '橙霞', '#FF69B4': '玫粉', '#E6E6FA': '薰衣草',
  '#A0522D': '赭石', '#DEB887': '驼色', '#FFC0CB': '樱粉',
  '#CD853F': '古铜', '#F5F5DC': '米白', '#FF1493': '洋红',
  '#9ACD32': '黄绿', '#FAEBD7': '亚麻', '#E8E8E8': '月白'
};

function getHSLFromColor(hex: string, lightnessOffset = 0): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'hsl(0, 50%, 60%)';
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round((l + lightnessOffset) * 100)}%)`;
}

function generateMusicSentence(entry: Entry): string {
  const templates = musicTemplates[entry.emotion];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const adj = tasteAdjectives[entry.food.taste];
  const colorName = colorNames[entry.food.color] || '梦幻';

  return template
    .replace('{food}', entry.food.name || '清茶')
    .replace('{taste}', entry.food.taste)
    .replace('{adj}', adj)
    .replace('{color}', colorName);
}

function playMusicPhrase() {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();

    const notes = 4;
    const baseDuration = 0.25;

    for (let i = 0; i < notes; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const freq = 300 + Math.random() * 700;
      osc.type = ['sine', 'triangle'][Math.floor(Math.random() * 2)] as OscillatorType;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * baseDuration);

      const startTime = audioCtx.currentTime + i * baseDuration;
      const endTime = startTime + baseDuration * 0.8;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(endTime);
    }

    setTimeout(() => audioCtx.close(), 2000);
  } catch (e) {
    console.warn('Web Audio API 不可用:', e);
  }
}

function DetailCard({ entry, emotionColorMap, onClose, flyFromPoint }: DetailCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [animState, setAnimState] = useState<'initial' | 'animating' | 'done'>('initial');
  const [sentence] = useState(() => generateMusicSentence(entry));
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (flyFromPoint) {
      const cardRect = card.getBoundingClientRect();
      const targetX = cardRect.left;
      const targetY = cardRect.top;
      const targetW = cardRect.width;
      const targetH = cardRect.height;

      const startX = flyFromPoint.x - targetW / 2;
      const startY = flyFromPoint.y;
      const startScale = 0.3;

      card.style.transformOrigin = 'center center';
      card.style.transform = `translate(${startX - targetX}px, ${startY - targetY}px) scale(${startScale})`;
      card.style.opacity = '0.4';

      setAnimState('animating');

      requestAnimationFrame(() => {
        card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-out';
        card.style.transform = 'translate(0, 0) scale(1)';
        card.style.opacity = '1';

        setTimeout(() => {
          setAnimState('done');
          card.style.transition = '';
          if (!hasPlayed) {
            playMusicPhrase();
            setHasPlayed(true);
          }
        }, 420);
      });
    } else {
      setAnimState('done');
      card.style.opacity = '0';
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.35s ease-out';
        card.style.opacity = '1';
        setTimeout(() => {
          card.style.transition = '';
          if (!hasPlayed) {
            playMusicPhrase();
            setHasPlayed(true);
          }
        }, 370);
      });
    }
  }, [entry.id]);

  const emotionColor = emotionColorMap[entry.emotion];
  const intensity = Math.max(20, Math.min(100, entry.emotionIntensity));
  const barH = (intensity / 100) * 180;

  const hslBarBg = getHSLFromColor(emotionColor, -0.2);
  const hslBarFill = getHSLFromColor(emotionColor, 0.1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  };

  return (
    <div
      ref={cardRef}
      className="card"
      style={{
        position: 'relative',
        willChange: animState === 'animating' ? 'transform, opacity' : 'auto',
        transform: 'translateZ(0)'
      }}
    >
      <button
        onClick={onClose}
        className="btn btn-secondary"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '4px 10px',
          fontSize: 13,
          minWidth: 'auto'
        }}
      >
        ✕
      </button>

      <h2 style={{ marginBottom: 4 }}>✨ 味觉记忆</h2>
      <p style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>{formatDate(entry.date)}</p>

      <div style={{
        padding: '16px',
        borderRadius: 10,
        backgroundColor: '#FFFBF5',
        marginBottom: 20,
        border: `1px solid ${emotionColor}30`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: `${emotionColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30
          }}>
            {entry.food.emoji || '🍽️'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{entry.food.name || '未选择'}</span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 10,
                  backgroundColor: entry.food.color + '40',
                  color: '#555',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {entry.food.taste}味
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className="emotion-tag"
                style={{ backgroundColor: emotionColor }}
              >
                {entry.emotion}
              </span>
              <span style={{ fontSize: 13, color: '#666' }}>
                情绪强度 {entry.emotionIntensity}
              </span>
            </div>
          </div>
        </div>

        {entry.moodKeywords.length > 0 && (
          <div style={{ paddingTop: 12, borderTop: '1px dashed #EEE', marginTop: 4 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>心情关键词</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {entry.moodKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 14,
                    backgroundColor: `${emotionColor}25`,
                    fontSize: 12,
                    color: '#555'
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '18px 16px',
        borderRadius: 10,
        backgroundColor: '#FFFBF5',
        marginBottom: 20
      }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>📊 情绪强度</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 200 }}>
          <div style={{
            width: 40,
            height: 180,
            backgroundColor: hslBarBg,
            borderRadius: '6px 6px 4px 4px',
            position: 'relative',
            overflow: 'hidden',
            opacity: 0.4,
            flexShrink: 0
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100%',
              backgroundColor: 'transparent'
            }} />
          </div>

          <div style={{
            width: 40,
            height: 180,
            backgroundColor: hslBarBg,
            borderRadius: '6px 6px 4px 4px',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${barH}px`,
                background: `linear-gradient(180deg, ${hslBarFill} 0%, ${emotionColor} 100%)`,
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.5s ease-out',
                boxShadow: `0 -2px 10px ${emotionColor}50`
              }}
            />
            <div style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 14,
              fontWeight: 600,
              color: emotionColor
            }}>
              {entry.emotionIntensity}
            </div>
          </div>

          <div style={{
            width: 40,
            height: 180,
            backgroundColor: hslBarBg,
            borderRadius: '6px 6px 4px 4px',
            position: 'relative',
            overflow: 'hidden',
            opacity: 0.4,
            flexShrink: 0
          }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#BBB' }}>
              <span>100</span>
              <span>强烈</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#BBB' }}>
              <span>50</span>
              <span>适中</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#BBB' }}>
              <span>0</span>
              <span>微弱</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '18px',
        borderRadius: 12,
        background: `linear-gradient(135deg, ${emotionColor}25 0%, #FFFBF5 100%)`,
        borderLeft: `4px solid ${emotionColor}`
      }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 10, letterSpacing: 1 }}>
          🎵 今日味觉旋律
        </div>
        <p style={{
          fontSize: 15,
          lineHeight: 1.9,
          color: '#444',
          fontStyle: 'italic',
          letterSpacing: 0.5
        }}>
          「{sentence}」
        </p>
        <button
          onClick={() => playMusicPhrase()}
          className="btn btn-secondary"
          style={{
            marginTop: 14,
            padding: '6px 14px',
            fontSize: 12,
            backgroundColor: emotionColor + '50'
          }}
        >
          🎶 再次聆听
        </button>
      </div>
    </div>
  );
}

export default DetailCard;
