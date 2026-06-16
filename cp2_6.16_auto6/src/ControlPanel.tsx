import { useRef, ChangeEvent, CSSProperties } from 'react';
import { ColorTheme, defaultTheme, auroraTheme, sunsetTheme, iceTheme } from './particleSystem';

interface ControlPanelProps {
  isPlaying: boolean;
  volume: number;
  speed: number;
  currentTheme: ColorTheme;
  onFileSelect: (file: File) => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onThemeChange: (theme: ColorTheme) => void;
  onResetCamera: () => void;
  fileName: string | null;
}

const themes = [
  { name: '默认主题', theme: defaultTheme, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #ec4899 100%)' },
  { name: '极光绿蓝', theme: auroraTheme, gradient: 'linear-gradient(135deg, #065f46 0%, #0e7490 50%, #059669 100%)' },
  { name: '落日橙红', theme: sunsetTheme, gradient: 'linear-gradient(135deg, #c2410c 0%, #dc2626 50%, #ea580c 100%)' },
  { name: '冰雪蓝白', theme: iceTheme, gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 50%, #ffffff 100%)' },
];

const fileInputStyle: CSSProperties = {
  display: 'none',
};

const fileSelectorStyle: CSSProperties = {
  width: '240px',
  height: '48px',
  background: '#0f0f23',
  color: '#c4b5fd',
  border: '1.5px dashed #6366f1',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  userSelect: 'none',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  padding: '0 16px',
};

const playButtonStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: '#4f46e5',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
};

const sliderContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
};

const sliderLabelStyle: CSSProperties = {
  color: '#a5b4fc',
  fontSize: '13px',
  minWidth: '60px',
};

const sliderValueStyle: CSSProperties = {
  color: '#c4b5fd',
  fontSize: '12px',
  minWidth: '40px',
  textAlign: 'right',
};

const themeButtonStyle = (isActive: boolean): CSSProperties => ({
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  border: isActive ? '2px solid #a78bfa' : '2px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: isActive ? '0 0 12px rgba(167, 139, 250, 0.5)' : 'none',
});

const resetButtonStyle: CSSProperties = {
  width: '100px',
  height: '36px',
  background: '#7c3aed',
  color: '#e0e7ff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
};

const panelStyle: CSSProperties = {
  width: '280px',
  background: 'rgba(30, 27, 75, 0.9)',
  backdropFilter: 'blur(12px)',
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  maxHeight: '100%',
  overflowY: 'auto',
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const sectionTitleStyle: CSSProperties = {
  color: '#e0e7ff',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '4px',
  letterSpacing: '0.5px',
};

export default function ControlPanel({
  isPlaying,
  volume,
  speed,
  currentTheme,
  onFileSelect,
  onTogglePlay,
  onVolumeChange,
  onSpeedChange,
  onThemeChange,
  onResetCamera,
  fileName,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleSelectorClick = () => {
    fileInputRef.current?.click();
  };

  const isThemeActive = (theme: ColorTheme) => {
    return theme.lowStart === currentTheme.lowStart &&
      theme.midStart === currentTheme.midStart &&
      theme.highStart === currentTheme.highStart;
  };

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🎵 音频文件</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          style={fileInputStyle}
          onChange={handleFileChange}
        />
        <div
          style={fileSelectorStyle}
          onClick={handleSelectorClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#818cf8';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(129, 140, 248, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title={fileName || '选择 MP3 或 WAV 文件'}
        >
          {fileName ? `📁 ${fileName.length > 18 ? fileName.slice(0, 18) + '...' : fileName}` : '📁 选择音频文件'}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>▶️ 播放控制</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            style={playButtonStyle}
            onClick={onTogglePlay}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#6366f1';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4f46e5';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = '#4338ca';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = '#6366f1';
            }}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🔊 音量控制</div>
        <div style={sliderContainerStyle}>
          <span style={sliderLabelStyle}>音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            className="custom-slider"
          />
          <span style={sliderValueStyle}>{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>⚡ 粒子速度</div>
        <div style={sliderContainerStyle}>
          <span style={sliderLabelStyle}>速度</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            className="custom-slider"
          />
          <span style={sliderValueStyle}>{speed.toFixed(1)}x</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🎨 颜色主题</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {themes.map((item) => (
            <button
              key={item.name}
              title={item.name}
              style={{
                ...themeButtonStyle(isThemeActive(item.theme)),
                background: item.gradient,
              }}
              onClick={() => onThemeChange(item.theme)}
              onMouseEnter={(e) => {
                if (!isThemeActive(item.theme)) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🎥 视角控制</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            style={resetButtonStyle}
            onClick={onResetCamera}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#8b5cf6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#7c3aed';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.3)';
            }}
          >
            重置视角
          </button>
        </div>
      </div>

      <style>{`
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #374151;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a78bfa;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(167, 139, 250, 0.4);
        }
        .custom-slider::-webkit-slider-thumb:hover {
          background: #c4b5fd;
          transform: scale(1.15);
          box-shadow: 0 4px 10px rgba(167, 139, 250, 0.6);
        }
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a78bfa;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(167, 139, 250, 0.4);
        }
      `}</style>
    </div>
  );
}
