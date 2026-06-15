/** @jsx h */
import { h } from './jsx-dom';
import { ColorTheme } from './AuroraDome';

interface ControlPanelCallbacks {
  onMicToggle: () => void;
  onThemeChange: (theme: ColorTheme) => void;
  onDensityChange: (density: number) => void;
}

const THEMES: { key: ColorTheme; label: string; gradient: string }[] = [
  { key: 'aurora', label: '极光', gradient: 'linear-gradient(135deg, #00ff88, #cc77ff)' },
  { key: 'flame', label: '火焰', gradient: 'linear-gradient(135deg, #ff4400, #ffdd00)' },
  { key: 'ocean', label: '海洋', gradient: 'linear-gradient(135deg, #0066cc, #00eeff)' },
];

export class ControlPanel {
  element: HTMLElement;
  private micButton: HTMLButtonElement;
  private micIndicator: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private activeTheme: ColorTheme = 'aurora';
  private themeButtons: Map<ColorTheme, HTMLButtonElement> = new Map();

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;

    this.micIndicator = (
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#555',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        }}
      />
    ) as HTMLElement;

    this.micButton = (
      <button
        className="cp-mic-btn"
        onClick={() => this.callbacks.onMicToggle()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          color: '#ccd0dd',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      >
        {this.micIndicator}
        麦克风
      </button>
    ) as HTMLButtonElement;

    this.micButton.addEventListener('mouseenter', () => {
      this.micButton.style.background = 'rgba(255,255,255,0.12)';
    });
    this.micButton.addEventListener('mouseleave', () => {
      this.micButton.style.background = 'rgba(255,255,255,0.06)';
    });

    const themeButtonsContainer = (
      <div
        style={{
          display: 'flex',
          gap: '6px',
        }}
      />
    ) as HTMLElement;

    for (const theme of THEMES) {
      const btn = (
        <button
          className={`cp-theme-btn cp-theme-${theme.key}`}
          onClick={() => this.selectTheme(theme.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background:
              theme.key === this.activeTheme
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(255,255,255,0.04)',
            border:
              theme.key === this.activeTheme
                ? '1px solid rgba(255,255,255,0.25)'
                : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#ccd0dd',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.4s ease',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: theme.gradient,
              transition: 'transform 0.3s ease',
            }}
          />
          {theme.label}
        </button>
      ) as HTMLButtonElement;

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background =
          theme.key === this.activeTheme
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.04)';
      });

      this.themeButtons.set(theme.key, btn);
      themeButtonsContainer.appendChild(btn);
    }

    const densitySlider = (
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value="0.6"
        className="cp-density-slider"
        onInput={(e: Event) => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          this.callbacks.onDensityChange(val);
        }}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    ) as HTMLInputElement;

    const densityValue = (
      <span
        style={{
          fontSize: '11px',
          color: '#7788aa',
          fontFamily: 'monospace',
          minWidth: '32px',
          textAlign: 'right',
        }}
      >
        60%
      </span>
    ) as HTMLElement;

    densitySlider.addEventListener('input', () => {
      const pct = Math.round(parseFloat(densitySlider.value) * 100);
      densityValue.textContent = `${pct}%`;
    });

    const sliderTrack = (
      <style>{`
        .cp-density-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(100, 200, 255, 0.8);
          border: 2px solid rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 8px rgba(100,200,255,0.4);
        }
        .cp-density-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px rgba(100,200,255,0.6);
        }
        .cp-density-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(100, 200, 255, 0.8);
          border: 2px solid rgba(255,255,255,0.3);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(100,200,255,0.4);
        }
      `}</style>
    ) as HTMLStyleElement;

    this.element = (
      <div
        style={{
          position: 'fixed',
          left: '24px',
          bottom: '24px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '20px',
          minWidth: '220px',
          background: 'rgba(8, 12, 32, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          userSelect: 'none',
        }}
      >
        {sliderTrack}
        {this.micButton}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#667799',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            颜色主题
          </span>
          {themeButtonsContainer}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: '#667799',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              粒子密度
            </span>
            {densityValue}
          </div>
          {densitySlider}
        </div>
      </div>
    ) as HTMLElement;
  }

  setMicState(active: boolean) {
    const indicator = this.micIndicator as HTMLElement;
    if (active) {
      indicator.style.backgroundColor = '#00ff88';
      indicator.style.boxShadow = '0 0 8px rgba(0,255,136,0.6)';
    } else {
      indicator.style.backgroundColor = '#555';
      indicator.style.boxShadow = 'none';
    }
  }

  private selectTheme(theme: ColorTheme) {
    if (theme === this.activeTheme) return;
    const prevBtn = this.themeButtons.get(this.activeTheme);
    const nextBtn = this.themeButtons.get(theme);

    if (prevBtn) {
      prevBtn.style.background = 'rgba(255,255,255,0.04)';
      prevBtn.style.borderColor = 'rgba(255,255,255,0.08)';
    }
    if (nextBtn) {
      nextBtn.style.background = 'rgba(255,255,255,0.12)';
      nextBtn.style.borderColor = 'rgba(255,255,255,0.25)';
    }

    this.activeTheme = theme;
    this.callbacks.onThemeChange(theme);
  }
}
