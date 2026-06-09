import React, { useState, useCallback, useRef, useEffect } from 'react';
import EffectLayer from './components/EffectLayer';
import PostcardFrame from './components/PostcardFrame';
import type { WeatherType, FrameStyle, RGB, PostcardData, UploadResponse } from './types';

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const weatherOptions: { type: WeatherType; label: string; icon: string }[] = [
  { type: 'rain', label: '细雨', icon: '🌧️' },
  { type: 'snow', label: '飘雪', icon: '❄️' },
  { type: 'fog', label: '薄雾', icon: '🌫️' },
  { type: 'sunset', label: '黄昏光晕', icon: '🌅' },
];

const frameOptions: { style: FrameStyle; label: string }[] = [
  { style: 'simple', label: '简约白边' },
  { style: 'film', label: '胶片齿孔' },
  { style: 'dashed', label: '手绘虚线' },
  { style: 'gold', label: '烫金花边' },
  { style: 'stamp', label: '邮票边缘' },
];

const weatherBgColors: Record<WeatherType, string> = {
  rain: '#87CEEB',
  snow: '#FFFFFF',
  fog: '#D3D3D3',
  sunset: '#FF8C00',
};

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

export function getTimeColor(time: number): { rgb: RGB; alpha: number; brightness: number } {
  const nightColor = hexToRgb('#0A1128');
  const morningColor = hexToRgb('#FFA500');
  const duskColor = hexToRgb('#FF6347');
  const transparent: RGB = { r: 0, g: 0, b: 0 };

  if (time >= 0 && time < 6) {
    return { rgb: nightColor, alpha: 0.3, brightness: 0.6 };
  } else if (time >= 6 && time < 8) {
    const t = (time - 6) / 2;
    return {
      rgb: lerpRgb(nightColor, morningColor, t),
      alpha: lerp(0.3, 0.15, t),
      brightness: lerp(0.6, 0.9, t),
    };
  } else if (time >= 8 && time < 10) {
    const t = (time - 8) / 2;
    return {
      rgb: lerpRgb(morningColor, transparent, t),
      alpha: lerp(0.15, 0, t),
      brightness: lerp(0.9, 1, t),
    };
  } else if (time >= 10 && time < 14) {
    return { rgb: transparent, alpha: 0, brightness: 1 };
  } else if (time >= 14 && time < 16) {
    const t = (time - 14) / 2;
    return {
      rgb: lerpRgb(transparent, duskColor, t),
      alpha: lerp(0, 0.2, t),
      brightness: lerp(1, 0.95, t),
    };
  } else if (time >= 16 && time < 18) {
    return { rgb: duskColor, alpha: 0.2, brightness: 0.95 };
  } else if (time >= 18 && time < 20) {
    const t = (time - 18) / 2;
    return {
      rgb: lerpRgb(duskColor, nightColor, t),
      alpha: lerp(0.2, 0.3, t),
      brightness: lerp(0.95, 0.7, t),
    };
  } else {
    return { rgb: nightColor, alpha: 0.3, brightness: 0.6 };
  }
}

const App: React.FC = () => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: MAX_WIDTH, height: MAX_HEIGHT });
  const [dominantColor, setDominantColor] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [weather, setWeather] = useState<WeatherType>('rain');
  const [timeOfDay, setTimeOfDay] = useState<number>(12);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('simple');
  const [text, setText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');
  const [postcardIdFromUrl, setPostcardIdFromUrl] = useState<string | null>(null);
  const [loadingPostcard, setLoadingPostcard] = useState(false);
  const effectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/postcard\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      setPostcardIdFromUrl(pathMatch[1]);
      loadPostcardFromApi(pathMatch[1]);
    }
  }, []);

  const loadPostcardFromApi = async (id: string) => {
    setLoadingPostcard(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/postcard/${id}`);
      if (!response.ok) {
        throw new Error('Postcard not found');
      }
      const data: PostcardData = await response.json();
      setImageData(data.imageData);
      setWeather(data.weather);
      setTimeOfDay(data.timeOfDay);
      setFrameStyle(data.frameStyle);
      setText(data.text);
      setDominantColor(data.dominantColor);
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setLoadingPostcard(false);
      };
      img.src = data.imageData;
    } catch (err) {
      setLoadError('明信片加载失败，可能已过期');
      setLoadingPostcard(false);
    }
  };

  const extractDominantColor = (canvas: HTMLCanvasElement): RGB => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { r: 128, g: 128, b: 128 };

    const cw = canvas.width;
    const ch = canvas.height;
    const regionSize = 100;
    const sx = Math.max(0, Math.floor((cw - regionSize) / 2));
    const sy = Math.max(0, Math.floor((ch - regionSize) / 2));
    const sw = Math.min(regionSize, cw - sx);
    const sh = Math.min(regionSize, ch - sy);

    try {
      const imageData = ctx.getImageData(sx, sy, sw, sh);
      let r = 0, g = 0, b = 0;
      const count = sw * sh;
      for (let i = 0; i < imageData.data.length; i += 4) {
        r += imageData.data[i];
        g += imageData.data[i + 1];
        b += imageData.data[i + 2];
      }
      return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      };
    } catch {
      return { r: 128, g: 128, b: 128 };
    }
  };

  const processFile = useCallback((file: File) => {
    setLoadError('');
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setLoadError('请上传 JPG 或 PNG 格式的图片');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setLoadError('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const aspect = width / height;

        if (width > MAX_WIDTH) {
          width = MAX_WIDTH;
          height = Math.round(width / aspect);
        }
        if (height > MAX_HEIGHT) {
          height = MAX_HEIGHT;
          width = Math.round(height * aspect);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const resizedData = canvas.toDataURL('image/png');
        const color = extractDominantColor(canvas);

        setImageData(resizedData);
        setImageSize({ width, height });
        setDominantColor(color);
        setGeneratedId(null);
        setShareUrl('');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleGenerate = async () => {
    if (!imageData) {
      setLoadError('请先上传一张图片');
      return;
    }

    setIsGenerating(true);
    setLoadError('');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          weather,
          timeOfDay,
          frameStyle,
          text,
          dominantColor,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const data: UploadResponse = await response.json();
      setGeneratedId(data.id);
      const url = `${window.location.origin}/postcard/${data.id}`;
      setShareUrl(url);
    } catch (err) {
      setLoadError('生成明信片失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('链接已复制到剪贴板！');
      });
    }
  };

  const handleReset = () => {
    setImageData(null);
    setWeather('rain');
    setTimeOfDay(12);
    setFrameStyle('simple');
    setText('');
    setGeneratedId(null);
    setShareUrl('');
    setLoadError('');
    if (postcardIdFromUrl) {
      window.history.pushState({}, '', '/');
      setPostcardIdFromUrl(null);
    }
  };

  const timeColor = getTimeColor(timeOfDay);
  const displayTime = `${String(Math.floor(timeOfDay)).padStart(2, '0')}:${String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')}`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>✨ 幻景明信片</h1>
        <p style={styles.subtitle}>让静态照片变身沉浸式动态艺术</p>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          {!imageData && !loadingPostcard ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                ...styles.uploadZone,
                borderColor: isDragging ? '#FFD700' : '#444466',
                backgroundColor: isDragging ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={styles.uploadIcon}>📤</div>
              <p style={styles.uploadText}>点击或拖拽图片到此处</p>
              <p style={styles.uploadHint}>支持 JPG / PNG，最大 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : loadingPostcard ? (
            <div style={styles.loadingArea}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>正在加载明信片...</p>
            </div>
          ) : null}

          {imageData && (
            <>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>🌦️ 天气特效</h3>
                <div style={styles.weatherButtons}>
                  {weatherOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setWeather(option.type)}
                      style={{
                        ...styles.weatherButton,
                        backgroundColor: weather === option.type ? weatherBgColors[option.type] : 'rgba(255,255,255,0.05)',
                        color: weather === option.type ? (option.type === 'snow' || option.type === 'fog' ? '#1a1a2e' : '#ffffff') : '#cccccc',
                        borderColor: weather === option.type ? weatherBgColors[option.type] : 'rgba(255,255,255,0.1)',
                        boxShadow: weather === option.type ? `0 4px 20px ${weatherBgColors[option.type]}40` : 'none',
                      }}
                    >
                      <span style={styles.weatherIcon}>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>⏰ 昼夜循环 <span style={styles.timeDisplay}>{displayTime}</span></h3>
                <div style={styles.sliderContainer}>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={0.1}
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                    style={styles.timeSlider}
                  />
                  <div style={styles.sliderLabels}>
                    <span>🌙 00:00</span>
                    <span>🌅 06:00</span>
                    <span>☀️ 12:00</span>
                    <span>🌇 18:00</span>
                    <span>🌙 24:00</span>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>🖼️ 边框样式</h3>
                <select
                  value={frameStyle}
                  onChange={(e) => setFrameStyle(e.target.value as FrameStyle)}
                  style={styles.select}
                >
                  {frameOptions.map((opt) => (
                    <option key={opt.style} value={opt.style}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>✍️ 寄语文字（{text.length}/50）</h3>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 50))}
                  placeholder="写下你想说的话..."
                  style={styles.textarea}
                  maxLength={50}
                />
              </div>
            </>
          )}

          {loadError && <div style={styles.error}>{loadError}</div>}

          <div style={styles.actionButtons}>
            {imageData && (
              <>
                <button onClick={handleReset} style={styles.secondaryButton}>
                  🔄 重新上传
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{
                    ...styles.primaryButton,
                    opacity: isGenerating ? 0.6 : 1,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isGenerating ? '生成中...' : '🎴 生成明信片'}
                </button>
              </>
            )}
          </div>

          {shareUrl && (
            <div style={styles.shareBox}>
              <p style={styles.shareTitle}>🎉 生成成功！分享链接：</p>
              <div style={styles.shareUrlRow}>
                <input type="text" value={shareUrl} readOnly style={styles.shareInput} />
                <button onClick={handleCopyUrl} style={styles.copyButton}>复制</button>
              </div>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={styles.viewLink}>
                在新窗口打开可交互明信片 →
              </a>
            </div>
          )}
        </div>

        <div style={styles.previewPanel}>
          <h3 style={styles.sectionTitle}>🖼️ 实时预览</h3>
          <div style={styles.previewWrapper}>
            {imageData ? (
              <PostcardFrame
                imageData={imageData}
                imageSize={imageSize}
                weather={weather}
                timeOfDay={timeOfDay}
                frameStyle={frameStyle}
                text={text}
                dominantColor={dominantColor}
                timeColor={timeColor}
                onCanvasReady={(canvas) => {
                  effectCanvasRef.current = canvas;
                }}
              />
            ) : (
              <div style={styles.emptyPreview}>
                <div style={styles.emptyIcon}>🖼️</div>
                <p style={styles.emptyText}>上传图片后在此预览</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, #FFD700 30%, #FF8C00 100%);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 12px rgba(255, 215, 0, 0.5);
          position: relative;
          z-index: 2;
        }
        input[type="range"]::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, #FFD700 30%, #FF8C00 100%);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 12px rgba(255, 215, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '32px 24px',
    backgroundColor: '#1A1A2E',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '8px',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#8888AA',
    fontWeight: 300,
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftPanel: {
    flex: '1 1 380px',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  previewPanel: {
    flex: '1 1 60%',
    minWidth: '300px',
  },
  uploadZone: {
    border: '3px dashed',
    borderRadius: '16px',
    padding: '60px 32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  uploadIcon: {
    fontSize: '56px',
    marginBottom: '8px',
  },
  uploadText: {
    fontSize: '20px',
    fontWeight: 500,
    color: '#dddddd',
  },
  uploadHint: {
    fontSize: '14px',
    color: '#666688',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFD700',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timeDisplay: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#aaaacc',
    marginLeft: '8px',
  },
  weatherButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  weatherButton: {
    padding: '16px 12px',
    borderRadius: '12px',
    border: '2px solid',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Inter', sans-serif",
  },
  weatherIcon: {
    fontSize: '20px',
  },
  sliderContainer: {
    width: '100%',
  },
  timeSlider: {
    width: '100%',
    height: '12px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #0A1128 0%, #FFA500 25%, #FFD700 50%, #FF6347 75%, #0A1128 100%)',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '12px',
    color: '#666688',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '15px',
    fontFamily: "'Caveat', cursive",
    resize: 'vertical',
    outline: 'none',
    transition: 'all 0.2s ease',
    lineHeight: 1.5,
  },
  error: {
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    border: '1px solid rgba(255, 99, 71, 0.3)',
    color: '#FF6347',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    flex: 1,
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
    color: '#1a1a2e',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 4px 20px rgba(255, 140, 0, 0.3)',
  },
  secondaryButton: {
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#cccccc',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },
  shareBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 215, 0, 0.2)',
  },
  shareTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFD700',
    marginBottom: '12px',
  },
  shareUrlRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  shareInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#aaaacc',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },
  copyButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FFD700',
    color: '#1a1a2e',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
  },
  viewLink: {
    display: 'inline-block',
    color: '#FFA500',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  previewWrapper: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreview: {
    textAlign: 'center',
    color: '#555577',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '16px',
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 32px',
    gap: '16px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(255,215,0,0.2)',
    borderTopColor: '#FFD700',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#aaaacc',
  },
};

export default App;
