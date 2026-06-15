import React, { useState, useCallback } from 'react';
import MusicVisualizer from './MusicVisualizer';

type MusicStyle = 'dreamy' | 'tense' | 'healing' | 'epic';

interface GenerateResult {
  id: string;
  polarity: number;
  keywords: string[];
  particleCount: number;
  particleColors: string[];
  primaryColor: string;
  music: {
    style: MusicStyle;
    chords: number[][];
    bpm: number;
    baseVolume: number;
    audioDataUrl?: string;
  };
}

const styleConfig: Record<MusicStyle, { label: string; color: string }> = {
  dreamy: { label: '梦幻', color: '#FFB6C1' },
  tense: { label: '紧张', color: '#FF4500' },
  healing: { label: '治愈', color: '#98FB98' },
  epic: { label: '史诗', color: '#DAA520' },
};

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<MusicStyle>('healing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const handleSubmit = useCallback(async () => {
    if (text.length < 50 || text.length > 300) {
      setError('文字长度需在50-300字之间，当前字数：' + text.length);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '请求失败');
      }

      const data: GenerateResult = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请重试');
      } else {
        setError(err instanceof Error ? err.message : '生成失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  }, [text, style]);

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <header style={styles.header}>
          <h1 style={styles.title}>余音织梦</h1>
          <p style={styles.subtitle}>让文字化为流动的音乐梦境</p>
        </header>

        <section style={styles.inputSection}>
          <textarea
            style={styles.textarea}
            placeholder="请输入一段50-300字的文字描述，让它化为流动的梦境..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <div style={styles.charCount}>
            <span style={{ color: text.length >= 50 && text.length <= 300 ? '#98FB98' : '#FF6B6B' }}>
              {text.length}
            </span>
            <span style={styles.charCountLabel}> / 300 字（至少50字）</span>
          </div>

          <div style={styles.styleButtons}>
            {(Object.keys(styleConfig) as MusicStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                style={{
                  ...styles.styleButton,
                  ...(style === s
                    ? {
                        borderColor: styleConfig[s].color,
                        color: styleConfig[s].color,
                        boxShadow: `0 0 20px ${styleConfig[s].color}40`,
                      }
                    : {}),
                }}
              >
                {styleConfig[s].label}
              </button>
            ))}
          </div>

          <div style={styles.actionButtons}>
            <button style={styles.primaryButton} onClick={handleSubmit} disabled={loading}>
              {loading ? '生成中...' : '预览效果'}
            </button>
          </div>
        </section>

        {error && (
          <div style={styles.errorBanner}>
            <span style={styles.errorText}>{error}</span>
            <button style={styles.retryButton} onClick={handleSubmit} disabled={loading}>
              重试
            </button>
          </div>
        )}

        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>正在编织你的梦境...</p>
          </div>
        )}

        {result && !loading && (
          <MusicVisualizer
            text={text}
            style={style}
            result={result}
          />
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0A0A1A 0%, #1A1A2E 100%)',
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  innerContainer: {
    width: '100%',
    maxWidth: '1200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#E0E0E0',
    marginBottom: '12px',
    letterSpacing: '8px',
    background: 'linear-gradient(135deg, #FFB6C1, #98FB98, #7B68EE)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '16px',
    color: '#888',
    letterSpacing: '2px',
  },
  inputSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
  },
  textarea: {
    width: '60%',
    minWidth: '300px',
    padding: '18px 22px',
    borderRadius: '12px',
    border: '1px solid #444',
    backgroundColor: 'rgba(20, 20, 40, 0.6)',
    color: '#FFFFFF',
    fontSize: '15px',
    lineHeight: '1.7',
    resize: 'vertical',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    fontFamily: 'inherit',
  },
  charCount: {
    width: '60%',
    minWidth: '300px',
    textAlign: 'right',
    marginTop: '8px',
    marginBottom: '24px',
    fontSize: '13px',
    color: '#666',
  },
  charCountLabel: {
    color: '#666',
  },
  styleButtons: {
    display: 'flex',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  styleButton: {
    padding: '12px 28px',
    borderRadius: '30px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#444',
    backgroundColor: 'rgba(30, 30, 50, 0.5)',
    color: '#E0E0E0',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    letterSpacing: '2px',
  },
  actionButtons: {
    display: 'flex',
    gap: '16px',
  },
  primaryButton: {
    padding: '14px 48px',
    borderRadius: '30px',
    border: 'none',
    background: 'linear-gradient(135deg, #7B68EE 0%, #FF69B4 100%)',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(123, 104, 238, 0.4)',
    transition: 'all 0.3s ease',
    letterSpacing: '3px',
  },
  errorBanner: {
    width: '60%',
    minWidth: '300px',
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    border: '1px solid #FF4444',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  errorText: {
    color: '#FF4444',
    fontSize: '14px',
    fontWeight: 500,
  },
  retryButton: {
    padding: '8px 20px',
    borderRadius: '20px',
    border: '1px solid #FF4444',
    backgroundColor: 'transparent',
    color: '#FF4444',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '4px solid rgba(123, 104, 238, 0.2)',
    borderTopColor: '#7B68EE',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    color: '#888',
    fontSize: '15px',
    letterSpacing: '2px',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes borderFlow {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  textarea:focus {
    border-color: #7B68EE !important;
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.15), 0 4px 12px rgba(0,0,0,0.3) !important;
  }
  button:hover {
    transform: scale(1.05);
  }
  button:active {
    transform: scale(0.97);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  @media (max-width: 768px) {
    textarea, .charCount, .errorBanner {
      width: 90% !important;
    }
    .styleButtons {
      flex-direction: column !important;
      align-items: center !important;
    }
    .styleButtons button {
      width: 200px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default App;
