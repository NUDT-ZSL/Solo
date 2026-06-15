import { useState, useRef, useEffect } from 'react';
import FlowerCanvas from '../components/FlowerCanvas';
import type { ScentType, EmotionType, ScentEntry } from '../types';
import { SCENT_COLORS, SCENT_LABELS, EMOTION_LABELS, EMOTION_EMOJIS } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface RecordPageProps {
  onSave: (entry: ScentEntry) => void;
  onNavigate: (path: string) => void;
}

const SCENT_TYPES: ScentType[] = ['floral', 'food', 'nature', 'urban'];
const EMOTIONS: EmotionType[] = ['happy', 'calm', 'melancholy', 'excited', 'nostalgic'];

const SCENT_ICONS: Record<ScentType, string> = {
  floral: '🌸',
  food: '🍪',
  nature: '🌿',
  urban: '🏙️',
};

const RecordPage = ({ onSave, onNavigate }: RecordPageProps) => {
  const [scentType, setScentType] = useState<ScentType | null>(null);
  const [description, setDescription] = useState('');
  const [emotion, setEmotion] = useState<EmotionType>('happy');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [isBloomed, setIsBloomed] = useState(false);
  const [bloomProgress, setBloomProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const petalCount = Math.min(description.length, 20);

  useEffect(() => {
    if (scentType && !isBloomed) {
      setIsBloomed(true);
      let progress = 0;
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(1, elapsed / duration);
        setBloomProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [scentType, isBloomed]);

  const handleScentSelect = (type: ScentType) => {
    setScentType(type);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!scentType || !description.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const entry: ScentEntry = {
      id: uuidv4(),
      scentType,
      description: description.trim(),
      emotion,
      imageData,
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(entry);
    setScentType(null);
    setDescription('');
    setEmotion('happy');
    setImageData(undefined);
    setIsBloomed(false);
    setBloomProgress(0);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at center, #FFF8DC 0%, #F5DEB3 100%)',
        color: '#5D4E37',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>气味日记</h1>
        <button
          onClick={() => onNavigate('/calendar')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #D4C4A8',
            background: 'rgba(255, 255, 255, 0.5)',
            color: '#5D4E37',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📅 日历视图
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          gap: '32px',
        }}
      >
        <div
          style={{
            width: '320px',
            height: '320px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <FlowerCanvas
            petalCount={petalCount}
            baseColor={scentType || 'floral'}
            textDescription={description || '含苞待放'}
            imageData={imageData}
            size={300}
            isBloomed={isBloomed}
            bloomProgress={bloomProgress}
          />
          {!scentType && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                fontSize: '14px',
                color: '#8B7355',
              }}
            >
              选择气味类型，让花朵绽放
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {SCENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleScentSelect(type)}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: scentType === type ? '3px solid #8B7355' : '2px solid #D4C4A8',
                background: SCENT_COLORS[type],
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: scentType === type ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                transform: scentType === type ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
              title={SCENT_LABELS[type]}
            >
              {SCENT_ICONS[type]}
            </button>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            {SCENT_LABELS[scentType || 'floral']}描述
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="记录今天闻到的特殊气味..."
            maxLength={200}
            style={{
              width: '100%',
              height: '100px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #D4C4A8',
              background: 'rgba(255, 255, 255, 0.7)',
              color: '#5D4E37',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#8B7355', marginTop: '4px' }}>
            {description.length}/200 · {petalCount}片花瓣
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            情绪感受
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {EMOTIONS.map((emo) => (
              <button
                key={emo}
                onClick={() => setEmotion(emo)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: emotion === emo ? '2px solid #8B7355' : '1px solid #D4C4A8',
                  background: emotion === emo ? 'rgba(139, 115, 85, 0.15)' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{EMOTION_EMOJIS[emo]}</span>
                <span>{EMOTION_LABELS[emo]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            图片记录（可选）
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px dashed #D4C4A8',
                background: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#5D4E37',
              }}
            >
              📷 上传图片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            {imageData && (
              <div style={{ position: 'relative' }}>
                <img
                  src={imageData}
                  alt="预览"
                  style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <button
                  onClick={() => setImageData(undefined)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#8B7355',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!scentType || !description.trim()}
          style={{
            padding: '14px 48px',
            borderRadius: '28px',
            border: 'none',
            background: scentType && description.trim() ? '#8B7355' : '#C4B8A0',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: scentType && description.trim() ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 12px rgba(139, 115, 85, 0.3)',
          }}
        >
          保存今日花香
        </button>
      </div>
    </div>
  );
};

export default RecordPage;
